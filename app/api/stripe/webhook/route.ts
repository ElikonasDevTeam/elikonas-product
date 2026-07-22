import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import type Stripe from "stripe";
import { FOUNDING_MEMBER_CAP } from "@/app/account/constants";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function updateUser(userId: string, metadata: Record<string, unknown>) {
  const admin = getAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { user_metadata: metadata });
  if (error) throw new Error(`Failed to update user ${userId}: ${error.message}`);
}

async function getUserSubscriptionId(userId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return (data.user.user_metadata?.stripe_subscription_id as string) ?? null;
}

function renewalDateFromSub(sub: Stripe.Subscription): string | null {
  const periodEnd = sub.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

async function cancelOtherSubscriptions(customerId: string, keepSubId?: string) {
  const { data: subs } = await stripe.subscriptions.list({ customer: customerId, status: "active" });
  for (const s of subs) {
    if (s.id !== keepSubId) {
      console.log(`[stripe/webhook] canceling old subscription subId=${s.id} for customer=${customerId}`);
      await stripe.subscriptions.cancel(s.id);
    }
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log(`[stripe/webhook] received event: ${event.type} id=${event.id}`);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      console.log(`[stripe/webhook] checkout.session.completed — userId=${userId} mode=${session.mode}`);
      if (!userId) {
        console.warn("[stripe/webhook] no client_reference_id on session — skipping");
        return NextResponse.json({ received: true });
      }

      const customerId = typeof session.customer === "string" ? session.customer : null;

      if (session.mode === "payment") {
        const foundingPriceId = process.env.STRIPE_PRICE_FOUNDING;
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const isFoundingMember = lineItems.data.some((item) => item.price?.id === foundingPriceId);

        if (!isFoundingMember) {
          console.warn(
            `[stripe/webhook] payment-mode session=${session.id} did not match STRIPE_PRICE_FOUNDING (prices=${lineItems.data.map((i) => i.price?.id).join(",")}) — skipping`
          );
          return NextResponse.json({ received: true });
        }

        const admin = getAdminClient();

        // Idempotency guard: Stripe may redeliver checkout.session.completed for the same
        // session (retries, timeouts). Without this, a redelivery would claim a second slot
        // for a user who already has founding member status.
        const { data: existingUser, error: existingUserError } = await admin.auth.admin.getUserById(userId);
        if (existingUserError) {
          console.error("[stripe/webhook] failed to look up user before claiming slot:", existingUserError.message);
          return NextResponse.json({ error: "Internal error" }, { status: 500 });
        }
        if (existingUser.user?.user_metadata?.founding_member === true) {
          console.log(`[stripe/webhook] user=${userId} already founding_member — skipping duplicate claim (session=${session.id})`);
          return NextResponse.json({ received: true });
        }

        // Atomically claim a founding-member slot (source of truth for the 1,000 cap).
        const { data: slot, error: slotError } = await admin.rpc("claim_founding_member_slot", {
          cap: FOUNDING_MEMBER_CAP,
        });

        if (slotError) {
          console.error("[stripe/webhook] claim_founding_member_slot RPC failed:", slotError.message);
          return NextResponse.json({ error: "Internal error" }, { status: 500 });
        }

        if (slot === null) {
          // Cap already reached — payment succeeded but no slot available. Flag for manual
          // review rather than auto-refunding.
          console.warn(
            `[stripe/webhook] founding member cap reached — flagging overflow for user=${userId} session=${session.id}`
          );
          await admin.from("founding_member_overflow").insert({
            user_id: userId,
            stripe_session_id: session.id,
            stripe_customer_id: customerId,
          });
          return NextResponse.json({ received: true });
        }

        // Founding member one-time purchase — cancel any active subscriptions
        if (customerId) await cancelOtherSubscriptions(customerId);
        const metadata = {
          plan: "founding_member",
          founding_member: true,
          founding_member_number: slot,
          plan_canceling: false,
          plan_cancel_at: null,
          stripe_subscription_id: null,
          ...(customerId ? { stripe_customer_id: customerId } : {}),
        };
        console.log("[stripe/webhook] updating user metadata:", metadata);
        await updateUser(userId, metadata);
        await admin
          .from("profiles")
          .update({ founding_member: true, founding_member_number: slot })
          .eq("id", userId);
        console.log(`[stripe/webhook] founding_member #${slot} set for user=${userId}`);
      } else if (session.mode === "subscription" && session.subscription) {
        const subId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        console.log(`[stripe/webhook] retrieving subscription subId=${subId}`);
        const sub = await stripe.subscriptions.retrieve(subId);
        const interval = sub.items.data[0]?.price?.recurring?.interval;
        const plan = interval === "year" ? "annual" : "monthly";
        const renewalDate = renewalDateFromSub(sub);
        // Cancel any pre-existing subscriptions (upgrade scenario)
        if (customerId) await cancelOtherSubscriptions(customerId, subId);
        const metadata = {
          plan,
          plan_canceling: false,
          plan_cancel_at: null,
          stripe_subscription_id: subId,
          ...(renewalDate ? { plan_renewal_date: renewalDate } : {}),
          ...(customerId ? { stripe_customer_id: customerId } : {}),
        };
        console.log("[stripe/webhook] updating user metadata:", metadata);
        await updateUser(userId, metadata);
        console.log(`[stripe/webhook] plan=${plan} set for user=${userId}`);
      }
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const parent = invoice.parent;
      if (parent?.type === "subscription_details" && parent.subscription_details?.subscription) {
        const subRef = parent.subscription_details.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = sub.metadata?.user_id;
        console.log(`[stripe/webhook] invoice.paid — subId=${subId} userId=${userId}`);
        if (userId) {
          const renewalDate = renewalDateFromSub(sub);
          if (renewalDate) {
            await updateUser(userId, { plan_renewal_date: renewalDate });
            console.log(`[stripe/webhook] renewal date updated to ${renewalDate} for user=${userId}`);
          }
        }
      }
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      console.log(`[stripe/webhook] subscription.updated — userId=${userId} subId=${sub.id} cancel_at_period_end=${sub.cancel_at_period_end}`);
      if (userId) {
        const storedSubId = await getUserSubscriptionId(userId);
        if (storedSubId !== sub.id) {
          console.log(`[stripe/webhook] subscription.updated for non-current sub (stored=${storedSubId}), skipping`);
        } else if (sub.cancel_at_period_end) {
          const cancelAt = renewalDateFromSub(sub);
          await updateUser(userId, { plan_canceling: true, plan_cancel_at: cancelAt });
          console.log(`[stripe/webhook] plan_canceling=true cancel_at=${cancelAt} for user=${userId}`);
        } else {
          // User reactivated through portal
          await updateUser(userId, { plan_canceling: false, plan_cancel_at: null });
          console.log(`[stripe/webhook] plan reactivated for user=${userId}`);
        }
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      console.log(`[stripe/webhook] subscription.deleted — userId=${userId} subId=${sub.id}`);
      if (userId) {
        const storedSubId = await getUserSubscriptionId(userId);
        if (storedSubId !== sub.id) {
          // Deleted sub is an old one (cancelled during upgrade) — do not reset plan
          console.log(`[stripe/webhook] subscription.deleted for non-current sub (stored=${storedSubId}), skipping reset`);
        } else {
          await updateUser(userId, {
            plan: "free",
            plan_renewal_date: null,
            plan_canceling: false,
            plan_cancel_at: null,
            stripe_subscription_id: null,
          });
          console.log(`[stripe/webhook] plan reset to free for user=${userId}`);
        }
      }
    } else {
      console.log(`[stripe/webhook] unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[stripe/webhook] error handling event:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

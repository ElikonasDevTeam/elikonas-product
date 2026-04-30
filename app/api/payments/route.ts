import { stripe } from "@/lib/stripe/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { amount, currency = "usd" } = await request.json();

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}

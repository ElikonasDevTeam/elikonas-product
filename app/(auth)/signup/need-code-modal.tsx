"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { requestFoundingCodeAction, type NeedCodeState } from "./need-code-actions";

const initialState: NeedCodeState = { status: "idle" };

export function NeedCodeModal() {
  // The trigger link lives inside the signup page's own <form>, and HTML
  // doesn't allow nesting a second <form> inside it — render the modal (and
  // its form) through a portal into <body> instead. `open` only ever flips
  // to true from a client-side click (never during server rendering), so by
  // the time the portal branch below renders, `document` is always defined.
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<NeedCodeState, FormData>(
    requestFoundingCodeAction,
    initialState
  );

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-[#177e89] hover:text-[#084c61] transition-colors"
      >
        Need a code?
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="need-code-heading"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              {state.status === "success" ? (
                <>
                  <h2 id="need-code-heading" className="text-lg font-semibold text-[#323031]">
                    Check your email
                  </h2>
                  <p className="mt-2 text-sm text-[#323031]/70">
                    We just sent your founding code. It should arrive shortly — check your spam
                    folder if you don&apos;t see it.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-6 w-full rounded-lg bg-[#084c61] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a5f79]"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <h2 id="need-code-heading" className="text-lg font-semibold text-[#323031]">
                    Need a code for sign-up?
                  </h2>
                  <p className="mt-2 text-sm text-[#323031]/70">
                    Enter your email and we&apos;ll send you a founding code right away.
                    We&apos;ll only use this to send your code — you can opt in to our newsletter
                    separately when you sign up.
                  </p>

                  <form action={action} className="mt-4">
                    <label htmlFor="need-code-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="need-code-email"
                      name="email"
                      type="email"
                      autoFocus
                      required
                      placeholder="jane@example.com"
                      className={[
                        "w-full rounded-lg border px-4 py-2.5 text-sm text-[#323031] placeholder-[#323031]/40",
                        "outline-none transition-all duration-150",
                        "focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20",
                        state.status === "error"
                          ? "border-[#db3a34] bg-[#db3a34]/5"
                          : "border-gray-200 bg-white hover:border-gray-300",
                      ].join(" ")}
                    />
                    {state.status === "error" && (
                      <p className="mt-1.5 text-sm text-[#db3a34]">{state.message}</p>
                    )}

                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#323031] transition-colors hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={pending}
                        className="flex-1 rounded-lg bg-[#084c61] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a5f79] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pending ? "Sending…" : "Send my code"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

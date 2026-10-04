"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addCredentialAction, replaceCredentialFileAction } from "./credential-actions";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#323031] " +
  "placeholder-[#323031]/40 outline-none transition-all duration-150 " +
  "focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20 hover:border-gray-300";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-[#323031] mb-1.5">
      {children}
    </label>
  );
}

// Handles both the first upload and replacing an existing one — passing
// `replaceCredentialId` switches it to replace mode. Same file/validation
// either way, so the two flows share one form rather than drifting apart.
export function CredentialModal({
  edUnitId,
  replaceCredentialId,
  onClose,
}: {
  edUnitId?: string;
  replaceCredentialId?: string;
  onClose: () => void;
}) {
  const isReplace = replaceCredentialId !== undefined;
  const router = useRouter();
  const [state, action, pending] = useActionState(
    isReplace ? replaceCredentialFileAction : addCredentialAction,
    null
  );

  useEffect(() => {
    if (state && "success" in state) {
      router.refresh();
      onClose();
    }
  }, [state, onClose, router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#323031]/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#323031]">
            {isReplace ? "Replace proof" : "Add proof of completion"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#323031]/40 hover:bg-gray-100 hover:text-[#323031] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form action={action} className="space-y-4">
          {isReplace ? (
            <input type="hidden" name="credential_id" value={replaceCredentialId} />
          ) : (
            <input type="hidden" name="ed_unit_id" value={edUnitId} />
          )}

          {state && "error" in state && (
            <div className="rounded-lg border border-[#db3a34]/30 bg-[#db3a34]/5 px-4 py-3 text-sm text-[#db3a34]">
              {state.error}
            </div>
          )}

          <div>
            <Label htmlFor="file">Certificate, transcript, or other proof</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,application/pdf"
              required
              className={inputClass + " cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#084c61]/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#084c61]"}
            />
            <p className="mt-1.5 text-xs text-[#323031]/50">
              JPEG, PNG, HEIC, or PDF. Max 10MB.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-[#323031] transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={[
                "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150",
                pending
                  ? "cursor-not-allowed bg-[#084c61]/40"
                  : "bg-[#084c61] hover:bg-[#177e89] active:scale-[0.99]",
              ].join(" ")}
            >
              {pending
                ? isReplace
                  ? "Replacing…"
                  : "Uploading…"
                : isReplace
                  ? "Replace"
                  : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

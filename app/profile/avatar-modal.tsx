"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadAvatarAction, removeAvatarAction } from "./avatar-actions";
import { Avatar } from "@/app/components/avatar";

// Cleared here (not just in the server action) because the nav avatar reads
// this cache client-side and has no other way to learn the photo changed.
function clearNavAvatarCache() {
  try {
    sessionStorage.removeItem("avatar_url");
  } catch {
    // sessionStorage can throw in some private/locked-down browser contexts —
    // worst case the nav avatar lags until the cache's own natural refresh.
  }
}

export function AvatarModal({
  name,
  currentAvatarUrl,
  currentShowProfilePhoto,
  onClose,
}: {
  name: string;
  currentAvatarUrl: string | null;
  currentShowProfilePhoto: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Pre-checked: uploading a photo only to have it stay hidden everywhere
  // would be a confusing first result. The account-wide default for a user
  // who never opens this modal stays off (DEFAULT_PRIVACY) — this is just
  // this form's own starting value.
  const [showProfilePhoto, setShowProfilePhoto] = useState(currentShowProfilePhoto);

  const [uploadState, uploadAction, uploadPending] = useActionState(uploadAvatarAction, null);
  const [removeState, removeAction, removePending] = useActionState(removeAvatarAction, null);

  useEffect(() => {
    if (uploadState && "success" in uploadState) {
      clearNavAvatarCache();
      router.refresh();
      onClose();
    }
  }, [uploadState, onClose, router]);

  useEffect(() => {
    if (removeState && "success" in removeState) {
      clearNavAvatarCache();
      router.refresh();
      onClose();
    }
  }, [removeState, onClose, router]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  const error =
    (uploadState && "error" in uploadState && uploadState.error) ||
    (removeState && "error" in removeState && removeState.error) ||
    null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#323031]/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#323031]">Profile photo</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#323031]/40 hover:bg-gray-100 hover:text-[#323031] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form action={uploadAction} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-[#db3a34]/30 bg-[#db3a34]/5 px-4 py-3 text-sm text-[#db3a34]">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="h-20 w-20 shrink-0 rounded-full object-cover"
              />
            ) : (
              <Avatar
                name={name}
                size="h-20 w-20 text-2xl"
                colorClassName="bg-[#084c61] text-white"
                initialsStrategy="first-last"
                avatarUrl={currentAvatarUrl}
              />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#323031] transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              Choose photo
            </button>
            <input
              ref={fileInputRef}
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <p className="text-xs text-[#323031]/50">JPEG, PNG, or WebP. Max 5MB.</p>

          <label className="flex items-center gap-2 text-sm text-[#323031]">
            <input
              type="checkbox"
              name="show_profile_photo"
              value="true"
              checked={showProfilePhoto}
              onChange={(e) => setShowProfilePhoto(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#177e89] focus:ring-[#177e89]/40"
            />
            Show my photo to others
          </label>

          <div className="flex gap-3 pt-2">
            {currentAvatarUrl && (
              <button
                type="button"
                disabled={uploadPending || removePending}
                onClick={() => removeAction(new FormData())}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-[#db3a34] transition-colors hover:border-[#db3a34]/30 hover:bg-[#db3a34]/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {removePending ? "Removing…" : "Remove photo"}
              </button>
            )}
            <button
              type="submit"
              disabled={uploadPending || removePending || !previewUrl}
              className={[
                "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150",
                uploadPending || !previewUrl
                  ? "cursor-not-allowed bg-[#084c61]/40"
                  : "bg-[#084c61] hover:bg-[#177e89] active:scale-[0.99]",
              ].join(" ")}
            >
              {uploadPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

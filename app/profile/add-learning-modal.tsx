"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addEdUnitAction } from "./actions";
import { CATEGORIES } from "@/types";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-[#323031] mb-1.5">
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#323031] " +
  "placeholder-[#323031]/40 outline-none transition-all duration-150 " +
  "focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20 hover:border-gray-300";

const selectClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#323031] " +
  "outline-none transition-all duration-150 focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20";

export function AddLearningModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addEdUnitAction, null);
  const [status, setStatus] = useState("planned");

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
          <h2 className="text-lg font-semibold text-[#323031]">Add learning</h2>
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
          {state && "error" in state && (
            <div className="rounded-lg border border-[#db3a34]/30 bg-[#db3a34]/5 px-4 py-3 text-sm text-[#db3a34]">
              {state.error}
            </div>
          )}

          <div>
            <Label htmlFor="name">Course / credential name</Label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Google Data Analytics Certificate"
              required
              className={inputClass}
            />
          </div>

          <div>
            <Label htmlFor="provider">Provider / institution</Label>
            <input
              id="provider"
              name="provider"
              type="text"
              placeholder="e.g. Coursera, MIT OpenCourseWare"
              required
              className={inputClass}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <select id="category" name="category" required className={selectClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              required
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClass}
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {status === "in_progress" && (
            <div>
              <Label htmlFor="progress_pct">Progress (%)</Label>
              <input
                id="progress_pct"
                name="progress_pct"
                type="number"
                min={1}
                max={99}
                defaultValue={50}
                required
                className={inputClass}
              />
            </div>
          )}

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
              {pending ? "Adding…" : "Add learning"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

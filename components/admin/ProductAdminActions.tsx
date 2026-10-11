"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminSetProductStatus,
  adminSetFeatured,
} from "@/app/admin/products/actions";

export default function ProductAdminActions({
  productId,
  status,
  featured,
}: {
  productId: string;
  status: string;
  featured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(true);
    setError("");
    const result = await fn().catch(() => ({
      ok: false,
      message: "Could not reach the server. Try again.",
    }));
    if (!result.ok) setError(result.message ?? "That did not work.");
    setBusy(false);
    router.refresh();
  }

  const button =
    "rounded bg-white/10 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/16 disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => adminSetFeatured(productId, !featured))}
        className={
          featured
            ? "rounded bg-gold px-3 py-1.5 text-xs font-medium text-[#042115] transition-opacity hover:opacity-85 disabled:opacity-40"
            : button
        }
      >
        {featured ? "Featured" : "Feature"}
      </button>

      {status === "archived" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => adminSetProductStatus(productId, "draft"))}
          className={button}
        >
          Restore to draft
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => adminSetProductStatus(productId, "archived"))}
          className={button}
        >
          Take down
        </button>
      )}

      {error && (
        <span className="block w-full text-right text-xs text-[#E08A84]">
          {error}
        </span>
      )}
    </div>
  );
}

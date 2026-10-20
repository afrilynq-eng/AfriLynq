"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  setProductStatus,
  renewProduct,
  deleteProduct,
} from "@/app/(site)/account/products/actions";

/**
 * Publish, renew, pause, close or delete, from the list.
 *
 * Changing whether a listing is live is the thing a supplier does most
 * often and it should not require opening a form with thirty fields in
 * it. Deleting does, in the sense that it asks first: a listing carries
 * photographs and a history of enquiries, and there is no undo.
 *
 * The words are the ones on the designed screen. Pause means take it out
 * of the catalogue and keep it; Close means retire it. Renew moves a live
 * listing back to the top, which is a real change because the catalogue
 * orders by publication date.
 */
export default function ProductRowActions({
  companyId,
  productId,
  status,
}: {
  companyId: string;
  productId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function move(next: string) {
    setBusy(true);
    setError("");
    setNote("");
    const result = await setProductStatus(companyId, productId, next).catch(() => ({
      ok: false as const,
      message: "Could not reach the server. Try again.",
    }));
    if (!result.ok) setError(result.message);
    setBusy(false);
    router.refresh();
  }

  async function renew() {
    setBusy(true);
    setError("");
    setNote("");
    const result = await renewProduct(companyId, productId).catch(() => ({
      ok: false as const,
      message: "Could not reach the server. Try again.",
    }));
    if (result.ok) setNote("Moved back to the top of the catalogue.");
    else setError(result.message);
    setBusy(false);
    router.refresh();
  }

  async function destroy() {
    setBusy(true);
    setError("");
    const result = await deleteProduct(companyId, productId).catch(() => ({
      ok: false as const,
      message: "Could not reach the server. Try again.",
    }));
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    setConfirming(false);
    router.refresh();
  }

  const button =
    "rounded-lg border border-sand-deep px-4 py-2 text-sm font-medium text-forest transition-colors hover:border-forest disabled:opacity-40";

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-soft">Delete for good?</span>
        <button
          type="button"
          onClick={destroy}
          disabled={busy}
          className="rounded-lg bg-[#8c3b2c] px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          Yes, delete
        </button>
        <button type="button" onClick={() => setConfirming(false)} className={button}>
          Keep it
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "active" && (
        <button type="button" onClick={() => move("active")} disabled={busy} className={button}>
          Publish
        </button>
      )}
      {status === "active" && (
        <>
          <button
            type="button"
            onClick={renew}
            disabled={busy}
            title="Move this listing back to the top of the catalogue"
            className={button}
          >
            Renew
          </button>
          <button type="button" onClick={() => move("draft")} disabled={busy} className={button}>
            Pause
          </button>
        </>
      )}
      {status !== "archived" && (
        <button type="button" onClick={() => move("archived")} disabled={busy} className={button}>
          Close
        </button>
      )}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={busy}
        className={button}
      >
        Delete
      </button>

      {note && <span className="block w-full text-sm text-forest">{note}</span>}
      {error && <span className="block w-full text-sm text-[#8c3b2c]">{error}</span>}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import {
  prepareProductImage,
  recordProductImage,
  removeProductImage,
} from "@/app/(site)/account/products/actions";
import type { ProductImage } from "@/lib/supabase-server";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 8;

/**
 * Photographs on a listing.
 *
 * Same three step upload as everywhere else: ask the server for a signed
 * URL, send the file straight to storage, then record the row. The bucket
 * is public, so the URL is built from the path and needs no signing to
 * display.
 *
 * The first image is the one the catalogue uses, which is why uploads
 * append rather than insert at the front.
 */
export default function ProductImages({
  companyId,
  productId,
  images,
  publicBase,
}: {
  companyId: string;
  productId: string;
  images: ProductImage[];
  publicBase: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(`A listing can hold ${MAX_IMAGES} photographs. Remove one first.`);
      e.target.value = "";
      return;
    }

    setBusy(true);
    setError("");

    const supabase = browserClient();

    for (const file of files.slice(0, room)) {
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is larger than 5MB and was skipped.`);
        continue;
      }

      try {
        const prepared = await prepareProductImage(companyId, productId, file.name);
        if (!prepared.ok) throw new Error(prepared.message);

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .uploadToSignedUrl(prepared.path, prepared.token, file);
        if (upErr) throw new Error(upErr.message);

        const recorded = await recordProductImage(
          companyId,
          productId,
          prepared.path,
          ""
        );
        if (!recorded.ok) throw new Error(recorded.message);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "One of the uploads did not complete."
        );
      }
    }

    setBusy(false);
    e.target.value = "";
    router.refresh();
  }

  async function remove(imageId: string) {
    setBusy(true);
    setError("");
    const result = await removeProductImage(companyId, imageId).catch(() => ({
      ok: false as const,
      message: "Could not reach the server. Try again.",
    }));
    if (!result.ok) setError(result.message);
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
      <h2 className="text-xl">Photographs</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        The first one is what buyers see in the catalogue, so lead with a
        clear shot of the produce itself rather than a logo or a lorry. Up
        to {MAX_IMAGES}, 5MB each.
      </p>

      {images.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="group relative">
              <span className="block overflow-hidden rounded-lg border border-sand-deep bg-sand">
                <Image
                  src={`${publicBase}/${img.storage_path}`}
                  alt={img.alt_text ?? ""}
                  width={300}
                  height={300}
                  unoptimized
                  className="aspect-square w-full object-cover"
                />
              </span>

              {i === 0 && (
                <span className="absolute top-2 left-2 rounded bg-forest px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-paper uppercase">
                  Main
                </span>
              )}

              <button
                type="button"
                onClick={() => remove(img.id)}
                disabled={busy}
                className="absolute top-2 right-2 rounded bg-ink/75 px-2 py-1 text-xs text-paper opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <label className="btn-lift inline-block cursor-pointer rounded-lg border border-sand-deep px-5 py-2.5 text-sm font-medium text-forest transition-colors hover:border-forest">
          {busy ? "Uploading" : images.length ? "Add more" : "Add photographs"}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            onChange={upload}
            disabled={busy}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}
    </section>
  );
}

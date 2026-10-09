"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import {
  prepareUpload,
  recordDocument,
  submitForVerification,
} from "@/app/(site)/account/documents/actions";

const BUCKET = "company-documents";
const MAX_BYTES = 10 * 1024 * 1024;

const label =
  "block text-[0.7rem] font-semibold tracking-widest text-forest uppercase";
const field =
  "mt-2 w-full rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";

/**
 * Adding a document.
 *
 * Three steps, deliberately: ask the server for a signed upload URL, send
 * the file straight to storage with it, then tell the server what was
 * uploaded. The file never passes through the app, which is what keeps a
 * 9MB scan from hitting the serverless body limit.
 */
export function DocumentUpload({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const text = (n: string) => String(data.get(n) ?? "");

    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That file is larger than 10MB. Please upload a smaller scan.");
      return;
    }

    setState("busy");
    setError("");

    try {
      const prepared = await prepareUpload(companyId, file.name);
      if (!prepared.ok) throw new Error(prepared.message);

      const { error: upErr } = await browserClient()
        .storage.from(BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.token, file);
      if (upErr) throw new Error(upErr.message);

      const recorded = await recordDocument({
        companyId,
        path: prepared.path,
        name: text("name") || file.name,
        issuingBody: text("issuingBody"),
        reference: text("reference"),
        issuedOn: text("issuedOn"),
        expiresOn: text("expiresOn"),
      });
      if (!recorded.ok) throw new Error(recorded.message);

      form.reset();
      router.refresh();
      setState("idle");
    } catch (err) {
      setState("idle");
      setError(
        err instanceof Error
          ? err.message
          : "The upload did not complete. Please try again."
      );
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm"
    >
      <h2 className="text-xl">Add a document</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Your certificate of incorporation, export licence, quality or organic
        certificates, anything that shows the business is real and permitted
        to trade. PDF or a clear photograph, up to 10MB.
      </p>

      <label className="mt-6 block">
        <span className={label}>
          File <span className="text-gold">*</span>
        </span>
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="mt-2 block w-full cursor-pointer rounded-lg border border-sand-deep bg-sand px-4 py-3 text-sm text-ink-soft file:mr-4 file:rounded file:border-0 file:bg-forest file:px-4 file:py-2 file:text-sm file:text-paper hover:file:bg-gold hover:file:text-forest-deep"
        />
      </label>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label>
          <span className={label}>
            What is it <span className="text-gold">*</span>
          </span>
          <input
            type="text"
            name="name"
            required
            placeholder="Certificate of incorporation"
            className={field}
          />
        </label>

        <label>
          <span className={label}>Issued by</span>
          <input
            type="text"
            name="issuingBody"
            placeholder="Corporate Affairs Commission"
            className={field}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <label>
          <span className={label}>Reference</span>
          <input type="text" name="reference" placeholder="Number on it" className={field} />
        </label>

        <label>
          <span className={label}>Issued on</span>
          <input type="date" name="issuedOn" className={field} />
        </label>

        <label>
          <span className={label}>Expires on</span>
          <input type="date" name="expiresOn" className={field} />
          <span className="mt-1.5 block text-xs text-stone">
            Leave empty if it does not expire
          </span>
        </label>
      </div>

      {error && (
        <p className="mt-5 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "busy"}
        className="btn-lift mt-6 rounded-lg bg-forest px-6 py-3 font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep disabled:opacity-60"
      >
        {state === "busy" ? "Uploading" : "Upload document"}
      </button>
    </form>
  );
}

/**
 * Hand the company over for checking.
 *
 * Once pressed the supplier has nothing more to do, which is the whole point
 * of the button existing: it ends the part of the process they are
 * responsible for.
 */
export function SubmitVerification({
  companyId,
  documents,
}: {
  companyId: string;
  documents: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [error, setError] = useState("");

  async function go() {
    setState("busy");
    setError("");
    const result = await submitForVerification(companyId).catch(() => ({
      ok: false as const,
      message: "We could not reach the server just now. Please try again.",
    }));

    if (!result.ok) {
      setState("idle");
      setError(result.message);
      return;
    }
    router.refresh();
    setState("idle");
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={state === "busy" || documents === 0}
        className="btn-lift rounded-lg bg-forest px-6 py-3 font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "busy" ? "Submitting" : "Submit for verification"}
      </button>

      {documents === 0 && (
        <p className="mt-3 text-sm text-stone">
          Upload at least one document first.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}
    </div>
  );
}

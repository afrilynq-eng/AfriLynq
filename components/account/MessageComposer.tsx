"use client";

import { useRef, useState, useTransition } from "react";

/**
 * Writing a message.
 *
 * Cleared on success only. If the send fails the words stay in the box,
 * because losing what somebody just typed is a worse failure than the
 * one that caused it.
 */

export default function MessageComposer({
  send,
  disabled,
}: {
  send: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  if (disabled) {
    return (
      <p className="rounded-xl border border-sand-deep bg-sand/50 px-5 py-4 text-ink-soft">
        This conversation is closed. Nothing further can be added to it, and
        what is here stays as a record.
      </p>
    );
  }

  return (
    <form
      ref={form}
      action={(formData) => {
        setError(null);
        start(async () => {
          const result = await send(formData);
          if (!result?.ok) setError(result?.message ?? "That did not send.");
          else form.current?.reset();
        });
      }}
      className="rounded-xl border border-sand-deep bg-paper p-5 shadow-sm"
    >
      <label htmlFor="body" className="sr-only">
        Your message
      </label>
      <textarea
        id="body"
        name="body"
        rows={4}
        required
        maxLength={5000}
        placeholder="Ask a question, or set out what you need."
        className="w-full rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30"
      />

      {error && (
        <p className="mt-3 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-stone">
          Messages cannot be edited or deleted once sent, by either side.
        </p>
        <button type="submit" disabled={pending} className="btn-lift btn-primary">
          {pending ? "Sending" : "Send"}
        </button>
      </div>
    </form>
  );
}

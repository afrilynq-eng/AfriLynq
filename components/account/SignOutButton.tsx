"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";

/**
 * Sign out.
 *
 * signOut() clears the cookies in the browser, then refresh() makes the
 * server components re-render without the session. Without the refresh the
 * header and the portal would keep showing the signed in state from the
 * cached render until something else forced a reload.
 */
export default function SignOutButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function out() {
    setBusy(true);
    try {
      await browserClient().auth.signOut();
    } catch {
      // A failed call here still means the person wants to leave. The
      // redirect below runs either way, and the session expires on its own.
    }
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={out}
      disabled={busy}
      className={
        className ??
        "btn-lift rounded-lg border border-sand-deep px-5 py-2.5 text-sm font-medium text-forest transition-colors hover:border-forest disabled:opacity-60"
      }
    >
      {busy ? "Signing out" : "Sign out"}
    </button>
  );
}

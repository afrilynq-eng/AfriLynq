"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectAccountManagement,
  ConnectPayouts,
  ConnectNotificationBanner,
} from "@stripe/react-connect-js";
import { startPayoutOnboarding, refreshPayoutStatus } from "@/app/(site)/account/payouts/actions";

/**
 * Stripe's own onboarding form, running inside AfriLynq.
 *
 * A supplier in Khana adds their bank details and passes identity checks
 * without ever seeing a Stripe page or being asked to create a Stripe
 * login. That is the whole point of the embedded components: the farmer's
 * relationship is with AfriLynq, and Stripe is plumbing they never meet.
 *
 * Nothing here touches the secret key. The client secret is fetched from a
 * server action, which is also where the connected account gets created.
 *
 * The account is NOT created on page load. It is created when somebody
 * presses the button, because a connected account cannot be deleted once
 * it exists and opening one for every supplier who merely looked at this
 * page would leave the Stripe dashboard full of empty accounts.
 */

type Props = {
  companyId: string;
  /** True once the company has a connected account, so we can go straight in. */
  hasAccount: boolean;
  /** Stripe's own answer to "will we actually pay this account". */
  payoutsEnabled: boolean;
};

type ConnectInstance = ReturnType<typeof loadConnectAndInitialize>;

const APPEARANCE = {
  variables: {
    fontFamily: "var(--font-sans), system-ui, sans-serif",
    colorPrimary: "#0C422B",
    colorText: "#14251D",
    colorBackground: "#FFFFFF",
    buttonPrimaryColorBackground: "#0C422B",
    buttonPrimaryColorText: "#FFFFFF",
    borderRadius: "10px",
    spacingUnit: "10px",
  },
} as const;

export default function PayoutOnboarding({ companyId, hasAccount, payoutsEnabled }: Props) {
  const router = useRouter();
  const [instance, setInstance] = useState<ConnectInstance | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a second init when React re-runs the effect, which it
  // does in development and may do after a navigation. Two Connect
  // instances on one page fight over the same custom elements.
  const booted = useRef(false);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  /**
   * Stripe calls this itself whenever it needs a secret, including when the
   * one it has expires mid-form. So it has to be able to run more than
   * once, which is why the server action returns an existing account
   * rather than creating a second one.
   */
  const fetchClientSecret = useCallback(async () => {
    const result = await startPayoutOnboarding(companyId);
    if (!result.ok) {
      // Thrown rather than returned: Connect.js expects a promise that
      // rejects, and swallowing it here would leave an empty box.
      throw new Error(result.message);
    }
    return result.clientSecret;
  }, [companyId]);

  const boot = useCallback(() => {
    if (booted.current || !publishableKey) return;
    booted.current = true;

    try {
      setInstance(
        loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret,
          appearance: APPEARANCE,
        })
      );
    } catch (e) {
      booted.current = false;
      setError(e instanceof Error ? e.message : "Stripe could not be loaded.");
    }
  }, [publishableKey, fetchClientSecret]);

  // Already has an account: no button, just show them where they are.
  useEffect(() => {
    if (hasAccount) boot();
  }, [hasAccount, boot]);

  async function begin() {
    setStarting(true);
    setError(null);

    // Called up front so a refusal, an unsupported country or a Stripe
    // outage says so in our own words before the Stripe box appears and
    // then fails inside itself.
    const result = await startPayoutOnboarding(companyId);
    setStarting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    boot();
  }

  /** Stripe says the supplier has left the form. Ask Stripe where they got to. */
  const onExit = useCallback(async () => {
    await refreshPayoutStatus(companyId);
    router.refresh();
  }, [companyId, router]);

  if (!publishableKey) {
    return (
      <Notice tone="warn">
        Payouts are not switched on yet. Nothing is wrong with your account, and we will
        email you when this is ready.
      </Notice>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Notice tone="error">{error}</Notice>
        <button
          type="button"
          onClick={() => {
            setError(null);
            void begin();
          }}
          className="rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest/90"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="space-y-5">
        <ul className="space-y-2.5 text-sm text-ink-soft">
          {[
            "Stripe asks for your business details and one form of identity.",
            "You add the bank account your money should go to.",
            "It takes about five minutes. You can stop and come back.",
          ].map((line) => (
            <li key={line} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              {line}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => void begin()}
          disabled={starting}
          className="rounded-lg bg-forest px-6 py-3 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-60"
        >
          {starting ? "Opening Stripe" : "Set up payouts"}
        </button>

        <p className="text-xs text-ink-soft">
          Your bank details go to Stripe, not to AfriLynq. We never see them, and no buyer
          ever does.
        </p>
      </div>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={instance}>
      <div className="space-y-6">
        {/* Stripe's own warnings: a document about to expire, a check that
            failed. Left to Stripe because the wording is a compliance
            matter and ours would be a guess. */}
        <ConnectNotificationBanner />

        {payoutsEnabled ? (
          <>
            <ConnectAccountManagement />
            <div className="border-t border-sand-deep pt-6">
              <h3 className="mb-3 text-sm font-semibold text-ink">Your payouts</h3>
              <ConnectPayouts />
            </div>
          </>
        ) : (
          <ConnectAccountOnboarding
            onExit={() => void onExit()}
            fullTermsOfServiceUrl="https://afrilynq.co.uk/terms"
            privacyPolicyUrl="https://afrilynq.co.uk/privacy"
          />
        )}
      </div>
    </ConnectComponentsProvider>
  );
}

function Notice({ tone, children }: { tone: "warn" | "error"; children: React.ReactNode }) {
  const skin =
    tone === "error"
      ? "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]"
      : "border-gold/30 bg-gold/10 text-gold-deep";

  return <p className={`rounded-xl border px-4 py-3 text-sm ${skin}`}>{children}</p>;
}

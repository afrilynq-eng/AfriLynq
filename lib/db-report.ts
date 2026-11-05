/**
 * Making failed queries audible.
 *
 * The problem
 * -----------
 * Across this codebase 54 queries are written like this:
 *
 *   const { data } = await supabase.from("products").select("name");
 *   const rows = data ?? [];
 *
 * The error is discarded. When the query fails, `data` is null, `?? []`
 * turns that into an empty list, and the page renders a perfectly
 * convincing "nothing here yet". Nobody is told. No log line, no error
 * page, no clue.
 *
 * Three bugs in this project reached production that way and stayed
 * there for days:
 *
 *   company_members.profile_id  (the column is user_id)   retailers could
 *                                                         not send a single
 *                                                         enquiry
 *   products.title              (the column is name)      no listing ever
 *                                                         appeared in a
 *                                                         supplier's recent
 *                                                         activity
 *
 * Each one was a typo the database rejected immediately and loudly. The
 * application threw that away and showed an empty panel instead.
 *
 * The fix
 * -------
 * Not 54 edits. Every one of those queries comes from a client built by
 * sessionClient() or serviceClient(), so the client is wrapped once, here,
 * and the wrapper reports any error that comes back. Existing call sites
 * are untouched and keep working exactly as they do now; they simply stop
 * being silent.
 *
 * Scope is deliberately narrow: .from() and .rpc() only. Auth calls are
 * left alone because "no session" is a normal, expected error there and
 * logging it would bury the real failures in noise.
 *
 * Set AFRILYNQ_DB_STRICT=1 in development and a failed query throws
 * instead of logging, so a bad column name shows up as a red screen the
 * first time it is run rather than an empty list weeks later.
 */

export interface DbError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

/** Where the query was written, pulled out of a captured stack. */
function callSite(stack: string | undefined): string {
  if (!stack) return "unknown";
  for (const raw of stack.split("\n").slice(1)) {
    const line = raw.trim();
    // Skip this module and the node internals; the first frame in app
    // code or lib code is the one worth naming.
    if (line.includes("db-report")) continue;
    if (line.includes("node:internal")) continue;
    if (line.includes("node_modules")) continue;
    // Take whatever sits before the trailing :line:column. Anchoring on
    // that rather than on how the path starts avoids mangling a
    // file:// URL, which an earlier version of this did.
    const match = line.match(/([^\s()]+:\d+:\d+)\)?$/);
    if (match) {
      // Keep it short: drop file:// and everything above the project
      // folder, so the log reads "app/account/page.tsx:41:18".
      return match[1]
        .replace(/^file:\/\//, "")
        .replace(/^.*?((?:app|lib|components|middleware)[/.])/, "$1");
    }
  }
  return "unknown";
}

const strict = process.env.AFRILYNQ_DB_STRICT === "1";

function report(label: string, where: string, error: DbError) {
  const code = error.code ?? "no-code";
  const parts = [
    `[db] ${label} failed (${code}) at ${where}: ${error.message}`,
    error.details ? `details: ${error.details}` : null,
    error.hint ? `hint: ${error.hint}` : null,
  ].filter(Boolean);

  // console.error is what Vercel's log drain captures, so this is the
  // line that turns up in the dashboard. When an error reporting service
  // is added, this is the single place to call it from.
  console.error(parts.join(" | "));

  if (strict) {
    throw new Error(
      `[db] ${label} failed (${code}) at ${where}: ${error.message}`,
    );
  }
}

/**
 * A Supabase query builder is a thenable that returns `this` from every
 * filter method, so the proxy has to follow it along the chain and only
 * inspect the result at the point it is awaited.
 */
function wrapBuilder<T extends object>(
  builder: T,
  label: string,
  where: string,
): T {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (prop === "then" && typeof value === "function") {
        return (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (e: unknown) => unknown,
        ) =>
          Reflect.apply(value, target, [
            (result: unknown) => {
              const err = (result as { error?: DbError | null } | null)?.error;
              if (err) report(label, where, err);
              return onFulfilled ? onFulfilled(result) : result;
            },
            onRejected,
          ]);
      }

      if (typeof value === "function") {
        return (...args: unknown[]) => {
          const out = Reflect.apply(value, target, args);
          // Filter and modifier methods hand back the builder; .single()
          // and friends hand back another thenable. Both get followed.
          if (
            out &&
            (out === target ||
              typeof (out as { then?: unknown }).then === "function")
          ) {
            return wrapBuilder(out as object, label, where);
          }
          return out;
        };
      }

      return value;
    },
  });
}

/**
 * Wrap a Supabase client so its .from() and .rpc() calls report failures.
 *
 * Everything else on the client, auth and storage included, is passed
 * straight through untouched.
 */
export function reporting<T extends object>(client: T): T {
  return new Proxy(client, {
    get(target, prop) {
      // Read with the target as receiver, not the proxy. Several
      // properties on a Supabase client are lazy getters that use `this`,
      // and handing them the proxy sends them back through here for no
      // reason.
      const value = Reflect.get(target, prop);

      if ((prop === "from" || prop === "rpc") && typeof value === "function") {
        return (...args: unknown[]) => {
          const name = typeof args[0] === "string" ? args[0] : "?";
          const label = prop === "from" ? `query on ${name}` : `rpc ${name}`;
          const where = callSite(new Error().stack);
          const out = Reflect.apply(value, target, args);
          return out && typeof out === "object"
            ? wrapBuilder(out as object, label, where)
            : out;
        };
      }

      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

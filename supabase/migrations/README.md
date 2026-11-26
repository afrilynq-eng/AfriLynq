# Migrations

Every change to the AfriLynq database, in the order it was applied to
production. A clone of this repository plus these files should reproduce the
schema the application expects.

## How they are applied

By hand, pasted into the Supabase SQL editor against the `afrilynq` project,
one file at a time in filename order. Each one ends with a check query whose
result confirms it did what it claimed, so run them one at a time and read the
result rather than running several and assuming.

Two things the Supabase editor does that a local `psql` does not:

- **It wraps the whole script in one transaction.** A script that adds a value
  to an enum and then uses that value in the same run is refused with
  `55P04: unsafe use of new value`. That is why `20261124100000_payment_enums.sql`
  is a file of its own and must be run alone, before the one after it.
- It runs as the project owner, so it bypasses row level security. Anything a
  migration asserts about RLS has to be asserted with `has_table_privilege` or
  by setting a role, not by selecting and seeing rows.

## A gap you should know about

**These files are not the complete history.** The run from
`20260904090000_foundation.sql` to `20261015100100_protect_transactions.sql`
is intact. So is everything from `20261118100000` onwards.

Between them sit roughly seven migrations applied during Stage 3, saved in the
Supabase SQL editor as:

    stage3-01-quotation-notifications
    stage3-02-message-notifications
    stage3-03-contact-privacy
    stage3-04-buyer-not-listed
    stage3-05-fix-company-lockout
    stage3-06-buyer-without-company
    stage3-07-admin-dashboard

They are in production and not in this folder, so replaying this folder alone
on an empty database will not succeed: the Stage 4 files depend on things those
created, including `app.is_the_buyer`, `app.company_ids_for` and the column
grants on `companies`.

**To close it:** open each of those saved queries in the Supabase SQL editor,
copy the contents, and add it here named `20261016HHMMSS_<what it does>.sql`,
keeping their original order. Until that is done, treat a schema dump taken
directly from the project as the authoritative record rather than this folder.

## Conventions

- `YYYYMMDDHHMMSS_what_it_does.sql`, and the timestamp orders the file rather
  than recording the exact minute.
- Every file is safe to run twice. `if not exists`, `drop policy if exists`,
  and guarded `do $$` blocks throughout.
- A migration already applied to production is never edited. Fix it with
  another migration, so what is in this folder stays what was actually run.

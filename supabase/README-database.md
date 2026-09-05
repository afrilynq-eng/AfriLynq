# AfriLynq database

Schema and row level security for the AfriLynq marketplace. This is the
foundation layer: every screen built later reads and writes through these
tables and these policies.

All six migrations apply cleanly against Postgres 16 and the full test suite
passes, thirty assertions covering visibility, isolation and integrity.

```
supabase/
  migrations/
    20260904090000_foundation.sql          extensions, enums, reference data,
                                           profiles, companies, membership,
                                           certifications, helper functions
    20260904090100_catalog.sql             categories, products, product images
    20260904090200_transactions.sql        enquiries, quotations, quotation
                                           lines, orders, order events
    20260904090300_messaging_platform.sql  threads, messages, notifications,
                                           audit log, leads
    20260904090400_rls_policies.sql        every row level security policy
    20260904090500_storage.sql             buckets and storage policies
  seed.sql                                 countries, currencies, units,
                                           launch categories
  tests/
    rls_test.sql                           thirty assertions, rolls itself back
```

## Applying it

```bash
supabase link --project-ref <ref>
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

Local, before pushing anything:

```bash
supabase start
supabase db reset
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
```

The test suite prints a PASS line per assertion and aborts on the first
failure. Run it after every migration that touches a policy. It exists so that
a change made in month four does not quietly open something that was closed in
week one.

## The decisions behind the schema

**The unit of the marketplace is a company, not a user.** `companies` and
`company_members` exist from the first migration even though Phase 1 does not
use them. Modelling a supplier as a user account means a co-operative can never
add a second manager and a business can never be handed over when someone
leaves, and every fix after launch is a migration against live data.

**Permissions come from membership, never from the person.** A profile carries
no commercial rights at all. Everything is decided by which companies you
belong to and in what role. `platform_role` is separate on purpose, so that
being an administrator of your own company never implies anything about the
platform.

**Row level security is on from the first migration.** Turning it on later,
with live data and forty policies to write at once, is a bad week. Turning it
on at the start costs an hour. Every table has it enabled, including the ones
Phase 1 does not touch.

**Policy helper functions are SECURITY DEFINER.** A policy on
`company_members` that reads `company_members` recurses until the connection
dies. `app.company_ids_for`, `app.is_member_of` and `app.is_company_admin`
bypass RLS for that one lookup and break the loop. They are small, their
`search_path` is pinned, and nothing else in the schema should be written this
way without a reason.

**A negotiation is never overwritten.** Once a quotation leaves draft, a
trigger rejects any change to its commercial content. A revision is a new row
with a higher version pointing at the one it replaces. Messages cannot be
edited or deleted. Order events are append only. When a buyer and a supplier
disagree six months from now about what was offered, the history has to exist,
and it has to be the kind of history nobody could have quietly edited.

**Money is an integer in the minor unit of a named currency.** There are no
floating point columns representing money anywhere. Line totals are computed by
the database as a generated column, never accepted from the client.

**Verification is a platform decision.** A supplier cannot set its own
`verification_status` or `is_listed`, cannot approve its own certifications,
and cannot promote itself to platform admin. Three guard triggers enforce this
above and beyond the policies, because these are the fields that turn an
unknown company into a trusted one on a public page.

**Country, currency and unit of measure are data, not code.** Section 21 of the
specification requires the platform to scale to new markets without a rewrite.
Opening Kenya is an insert into `countries`. Adding a new pack size is an
insert into `units`. There are no hard-coded lists in the application.

**Public visibility is deliberate and narrow.** An unauthenticated visitor,
which includes Google, sees verified and listed companies, their active
products, product images, and certification metadata. It sees no profiles, no
enquiries, no quotations, no orders and no messages. Supplier and product pages
are the acquisition channel, so they are readable and indexable by design.

**Competing suppliers are isolated.** A supplier sees only the enquiries
addressed to it and the quotations it wrote. It cannot see who else the buyer
approached or at what price. Four assertions in the test suite cover this
specifically, because it is the difference between a marketplace and a leaked
order book.

**Certificate metadata is public, certificate files are not.** Row level
security cannot hide a column, so this is done with column level grants:
`anon` is granted select on the descriptive fields only and never on
`document_path`. Files live in a private bucket and are served through short
lived signed URLs issued server side.

**Storage paths start with the company id.** Every bucket uses
`{company_id}/{rest}` and the storage policies parse that first segment. Do not
deviate from the convention, because it is what the policies check.

**Orders are created server side.** There is no insert policy for
`authenticated` on `orders`. An order is created from an accepted quotation in
a route handler using the service key, so that the accepted state and the
copied figures are decided by code rather than by whatever the client posts.

**The audit log is closed to everyone.** RLS is enabled and there are no
policies at all. That is not an omission. Only the service role writes to it
and only the service role reads it.

## What is not here yet

These belong to later stages and are deliberately absent rather than
half-built:

- Escrow, payment intents and payout records. Nothing about holding buyer funds
  should be modelled until the provider has confirmed in writing that the
  arrangement is supported for a UK entity.
- Subscription tiers and paid visibility ranking.
- Logistics partners and shipment tracking beyond the carrier and reference
  fields already on `orders`.
- Dispute case management beyond the timestamps and reason fields on `orders`.

`orders` already carries `delivery_code_hash` so that a delivery confirmation
code can be added without a migration. It is a hash, never the code itself.

## Phase 1 only uses a fraction of this

For the launch site the live tables are `countries`, `currencies`, `units`,
`categories` and `leads`. Everything else is created, secured and waiting.
That is the point: the expensive decisions are made once, at the start, when
changing them costs nothing.

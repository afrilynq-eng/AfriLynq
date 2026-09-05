-- AfriLynq platform
-- Migration 0007: correct the leads table grant
--
-- Migration 0005 revoked select on public.leads from both anon and
-- authenticated. That was wrong. A row level security policy filters rows you
-- already have permission to read; it cannot grant a privilege the table
-- itself denies. Revoking from authenticated therefore made the
-- leads_admin_read policy unreachable, and the administration screen failed
-- with "permission denied for table leads".
--
-- anon still cannot read leads. The admin policy still restricts rows to
-- platform administrators. Only the table level privilege changes.
--
-- Apply this if migration 0005 has already been run against your database.
-- A fresh database gets the corrected version directly from 0005.

revoke select on public.leads from anon;
grant select on public.leads to authenticated;

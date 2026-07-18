-- Stop the public_user secret columns (api, patreon) from being world-readable.
--
-- public_user is intentionally readable by everyone (display names, community-paragon
-- status, subscribed sources, etc. are shown across the site), so its SELECT RLS policy
-- is `USING (true)` for the public role. But the table also carries two secret columns:
--   * api     — a user's API keys
--   * patreon — a user's Patreon OAuth access_token / refresh_token (+ email/name)
-- and both anon and authenticated hold a TABLE-WIDE SELECT grant. Because a table-level
-- grant covers every column, a column-level REVOKE cannot carve those two out — so any
-- caller using the public anon key (which ships in the frontend bundle) could read every
-- user's secrets over PostgREST. The get-user edge function strips these before returning
-- them, but a direct REST query bypasses that entirely.
--
-- Fix: drop the blanket SELECT grant and re-grant SELECT on only the non-secret columns.
-- api/patreon are then unreadable by anon/authenticated over REST. Edge functions that
-- legitimately need them (a user reading their own account, the Patreon flow, API-key
-- auth) read via the service-role client, which is unaffected by these grants.
--
-- INSERT/UPDATE/DELETE grants are deliberately left untouched: writes are already gated by
-- RLS, and edge-function writes to api/patreon (account + Patreon flows) rely on the
-- UPDATE grant. Only SELECT visibility of the two secret columns changes here.

revoke select on public.public_user from anon, authenticated;

grant select (
  id,
  created_at,
  user_id,
  display_name,
  image_url,
  background_image_url,
  site_theme,
  is_admin,
  is_mod,
  deactivated,
  summary,
  subscribed_content_sources,
  organized_play_id,
  is_developer,
  is_community_paragon
) on public.public_user to anon, authenticated;

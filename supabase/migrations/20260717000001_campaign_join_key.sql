-- Stop the campaign.join_key secret from being readable by every authenticated user.
--
-- The campaign SELECT policy is `USING (true)` for authenticated (players legitimately
-- read campaigns they don't own — to view details, or to join by key), and anon +
-- authenticated hold a table-wide SELECT grant. But `join_key` is the shared secret that
-- lets anyone JOIN a campaign: with the blanket grant, any logged-in user could read every
-- campaign's join_key over PostgREST (or via find-campaign with an empty/other filter) and
-- join uninvited.
--
-- We can't fix this with RLS alone (it's row-level, and a joining player is not the owner),
-- so mirror the public_user fix: drop the blanket SELECT grant and re-grant SELECT on only
-- the non-secret columns. join_key then can't be read over REST by anon/authenticated.
-- Legitimate access goes through the edge functions with a service-role client:
--   * find-campaign returns join_key only to the campaign owner, or to a caller who already
--     supplied the exact key (the join flow).
--   * create-campaign / reset-campaign-key return the owner their (new) key.
-- INSERT/UPDATE grants are left intact so those writes are unaffected.

revoke select on public.campaign from anon, authenticated;

grant select (
  id,
  created_at,
  user_id,
  name,
  description,
  notes,
  recommended_options,
  recommended_variants,
  recommended_content_sources,
  custom_operations,
  meta_data
) on public.campaign to anon, authenticated;

-- Stop characters being attached to campaigns the user was never invited to.
--
-- Joining a campaign is currently client-side trust: the frontend calls
-- find-campaign({join_key}) to check the key, then just sets character.campaign_id and lets
-- the normal autosave (update-character) write it — nothing re-verifies on the server (see
-- the "// TODO: Secure this joining process" comment in CharBuilderHome). So anyone can POST
-- an arbitrary campaign_id to update-character and inject their character into a stranger's
-- campaign view.
--
-- Fix, entirely at the DB layer so no save-path code changes:
--   1. campaign_join_grant records "user X proved they know campaign Y's join key" — written
--      by find-campaign whenever a correct join_key is supplied (the join flow already does).
--   2. A BEFORE trigger on `character` allows a campaign_id change ONLY when the caller owns
--      the campaign, has a recent grant, or is leaving (-> null). Otherwise it silently keeps
--      the existing value. It can only ever preserve campaign_id — it never rejects a save.

create table if not exists public.campaign_join_grant (
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id bigint not null references public.campaign (id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, campaign_id)
);

-- Internal authorization record: only the service role (edge functions) touches it.
-- No anon/authenticated policies, so RLS denies them by default.
alter table public.campaign_join_grant enable row level security;

create or replace function public.enforce_character_campaign_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prev_campaign_id bigint := case when tg_op = 'UPDATE' then old.campaign_id else null end;
begin
  -- Only act when campaign_id is actually being SET to a new, non-null value. Unchanged
  -- campaign_id (the overwhelming majority of saves) and leaving (-> null) pass straight
  -- through untouched.
  if new.campaign_id is not null and new.campaign_id is distinct from prev_campaign_id then
    -- Trusted internal writers (service role, e.g. the GM's remove-from-campaign) have no
    -- auth.uid() and are always allowed.
    if auth.uid() is null then
      return new;
    end if;
    -- The campaign owner may attach their own characters freely.
    if exists (
      select 1 from public.campaign c
      where c.id = new.campaign_id and c.user_id = auth.uid()
    ) then
      return new;
    end if;
    -- A recent join grant proves the caller knew the join key (via find-campaign).
    if exists (
      select 1 from public.campaign_join_grant g
      where g.user_id = auth.uid()
        and g.campaign_id = new.campaign_id
        and g.granted_at > now() - interval '1 hour'
    ) then
      return new;
    end if;
    -- Not authorized: keep the existing campaign_id rather than applying the change.
    -- Fail-safe — the rest of the character write proceeds normally.
    new.campaign_id := prev_campaign_id;
  end if;
  return new;
end;
$$;

drop trigger if exists character_campaign_membership on public.character;
create trigger character_campaign_membership
  before insert or update on public.character
  for each row
  execute function public.enforce_character_campaign_membership();

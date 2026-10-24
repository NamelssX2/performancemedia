-- Review and run this migration in Supabase SQL Editor only after checking the
-- existing policies. It intentionally does not grant any public write access.

-- Ensure RLS remains enabled on content tables.
alter table public.pages enable row level security;
alter table public.page_sections enable row level security;
alter table public.networks enable row level security;
alter table public.faqs enable row level security;
alter table public.site_settings enable row level security;
alter table public.media enable row level security;
alter table public.admin_users enable row level security;

-- Add public read policy for FAQ only if it does not already exist.
-- Supabase policies are additive, so inspect existing policies before running.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'faqs'
      and policyname = 'Public can read published FAQs'
  ) then
    create policy "Public can read published FAQs"
      on public.faqs for select to anon, authenticated
      using (status = 'published');
  end if;
end $$;

-- This migration deliberately adds no INSERT/UPDATE/DELETE policies.
-- Admin write routes require server-side Auth token validation and an admin_users check.

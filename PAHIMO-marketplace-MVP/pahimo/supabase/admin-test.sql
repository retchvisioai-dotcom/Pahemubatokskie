-- Run after schema.sql, on a dedicated PAHIMO project.
-- Admin roles are assigned by the database owner after each user confirms email.
create table public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 label text not null check (label in ('Batok','Retch')),
 created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
create policy admin_self on public.admin_users for select to authenticated
 using (user_id = (select auth.uid()));
-- No browser insert/update/delete policies. Only the database owner grants access.

create function public.admin_overview() returns jsonb
 language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if not exists (select 1 from public.admin_users where user_id = auth.uid()) then
   raise exception 'Admin access required';
 end if;
 select jsonb_build_object(
  'customers', (select count(distinct customer_id) from public.service_requests),
  'partners', (select count(*) from public.partner_profiles),
  'open_requests', (select count(*) from public.service_requests where status = 'open'),
  'booked_requests', (select count(*) from public.service_requests where status = 'booked'),
  'completed_requests', (select count(*) from public.service_requests where status = 'completed'),
  'recent_requests', coalesce((select jsonb_agg(to_jsonb(s)) from (
    select id, category, title, area, status, budget, created_at
    from public.service_requests order by created_at desc limit 30
  ) s), '[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;

-- After Batok and Retch have registered and confirmed their email addresses,
-- the project owner substitutes their REAL email addresses below and runs this
-- query from the SQL editor. Never put admin grant SQL in browser code.
-- insert into public.admin_users(user_id,label)
-- select id, 'Batok' from auth.users where email = 'batok@example.com'
-- on conflict (user_id) do update set label = excluded.label;
-- insert into public.admin_users(user_id,label)
-- select id, 'Retch' from auth.users where email = 'retch@example.com'
-- on conflict (user_id) do update set label = excluded.label;

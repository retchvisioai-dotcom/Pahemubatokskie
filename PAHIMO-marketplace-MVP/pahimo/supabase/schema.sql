-- PAHIMO marketplace MVP. Run on a dedicated Supabase project.
create extension if not exists pgcrypto;

create table public.partner_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 2 and 80),
 services text[] not null default '{}',
 service_area text not null default '',
 bio text not null default '' check (char_length(bio) <= 1000),
 available boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.service_requests (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 category text not null check (char_length(category) between 2 and 100),
 title text not null check (char_length(title) between 5 and 120),
 details text not null check (char_length(details) between 10 and 3000),
 area text not null check (char_length(area) between 2 and 120),
 budget numeric(12,2) not null check (budget >= 50 and budget <= 10000000),
 status text not null default 'open' check (status in ('open','booked','completed','cancelled')),
 selected_partner uuid references public.partner_profiles(user_id),
 accepted_offer_id uuid,
 created_at timestamptz not null default now(),
 check ((status in ('booked','completed') and selected_partner is not null and accepted_offer_id is not null)
    or (status in ('open','cancelled') and accepted_offer_id is null))
);
create table public.offers (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.service_requests(id) on delete cascade,
 partner_id uuid not null references public.partner_profiles(user_id) on delete cascade default auth.uid(),
 amount numeric(12,2) not null check (amount >= 50 and amount <= 10000000),
 note text not null default '' check (char_length(note) <= 1000),
 created_at timestamptz not null default now(),
 unique (request_id, partner_id),
 unique (id, request_id, partner_id)
);
alter table public.service_requests add constraint accepted_offer_belongs_to_request
 foreign key (accepted_offer_id,id,selected_partner) references public.offers(id,request_id,partner_id)
 deferrable initially deferred;
create table public.messages (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.service_requests(id) on delete cascade,
 sender_id uuid not null references auth.users(id) default auth.uid(),
 body text not null check (char_length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index on public.service_requests (status,created_at desc);
create index on public.offers (request_id);
create index on public.messages (request_id,created_at);
alter table public.partner_profiles enable row level security;
alter table public.service_requests enable row level security;
alter table public.offers enable row level security;
alter table public.messages enable row level security;

create policy partner_read on public.partner_profiles for select to authenticated using (true);
create policy partner_insert on public.partner_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy partner_update on public.partner_profiles for update to authenticated
 using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy request_read on public.service_requests for select to authenticated
 using (customer_id = (select auth.uid()) or status = 'open' and exists
 (select 1 from public.partner_profiles p where p.user_id = (select auth.uid()))
 or selected_partner = (select auth.uid()));
create policy request_insert on public.service_requests for insert to authenticated
 with check (customer_id = (select auth.uid()) and status = 'open' and selected_partner is null and accepted_offer_id is null);
create policy offer_read on public.offers for select to authenticated
 using (partner_id = (select auth.uid()) or exists
 (select 1 from public.service_requests r where r.id = request_id and r.customer_id = (select auth.uid())));
create policy offer_insert on public.offers for insert to authenticated
 with check (partner_id = (select auth.uid()) and exists
 (select 1 from public.service_requests r where r.id = request_id and r.status = 'open'
 and r.customer_id <> (select auth.uid())));
create policy message_read on public.messages for select to authenticated using (exists
 (select 1 from public.service_requests r where r.id = request_id and r.status in ('booked','completed')
 and (r.customer_id = (select auth.uid()) or r.selected_partner = (select auth.uid()))));
create policy message_insert on public.messages for insert to authenticated
 with check (sender_id = (select auth.uid()) and exists
 (select 1 from public.service_requests r where r.id = request_id and r.status = 'booked'
 and (r.customer_id = (select auth.uid()) or r.selected_partner = (select auth.uid()))));

create function public.accept_offer(p_request uuid,p_offer uuid) returns void
 language plpgsql security definer set search_path = '' as $$
declare r public.service_requests%rowtype;
begin
 select * into r from public.service_requests where id = p_request for update;
 if not found or r.customer_id <> auth.uid() or r.status <> 'open' then
   raise exception 'Request cannot be booked';
 end if;
 update public.service_requests set status = 'booked',
 selected_partner = (select partner_id from public.offers where id = p_offer and request_id = p_request),
 accepted_offer_id = p_offer where id = p_request;
 if (select selected_partner from public.service_requests where id = p_request) is null then
   raise exception 'Offer not found';
 end if;
end $$;
revoke all on function public.accept_offer(uuid,uuid) from public;
grant execute on function public.accept_offer(uuid,uuid) to authenticated;

create function public.close_request(p_request uuid,p_status text) returns void
 language plpgsql security definer set search_path = '' as $$
begin
 if p_status not in ('cancelled','completed') then raise exception 'Invalid status'; end if;
 update public.service_requests set status = p_status
 where id = p_request and customer_id = auth.uid()
 and (status = 'open' and p_status = 'cancelled' or status = 'booked' and p_status = 'completed');
 if not found then raise exception 'Request cannot be closed'; end if;
end $$;
revoke all on function public.close_request(uuid,text) from public;
grant execute on function public.close_request(uuid,text) to authenticated;

-- Refresh read access for the selected partner after a booking closes is intentionally
-- retained through selected_partner. No client may update request status directly.

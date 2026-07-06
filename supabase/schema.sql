-- New Era Alumni Portal — Supabase Schema
-- Run this once in your Supabase project's SQL Editor (Project → SQL Editor → New query)

create extension if not exists "pgcrypto";

do $$ begin
  create type role as enum ('admin', 'member');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type member_status as enum ('active', 'inactive', 'pending');
exception when duplicate_object then null;
end $$;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  full_name varchar(255) not null,
  phone varchar(30) not null unique,
  password_hash text not null,
  role role not null default 'member',
  status member_status not null default 'pending',
  must_change_password boolean not null default true,
  graduation_year varchar(10),
  occupation varchar(255),
  address text,
  date_joined timestamp not null default now(),
  deleted_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index if not exists members_phone_idx on members (phone);
create index if not exists members_status_idx on members (status);

create table if not exists password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  status varchar(20) not null default 'pending',
  requested_at timestamp not null default now(),
  resolved_at timestamp,
  resolved_by uuid references members(id)
);

create table if not exists financial_years (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique,
  label varchar(50) not null,
  is_active boolean not null default false,
  created_at timestamp not null default now()
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  year_id uuid not null references financial_years(id) on delete restrict,
  month integer not null,
  subscription numeric(12,2) not null default 0.00,
  savings numeric(12,2) not null default 0.00,
  interest numeric(12,2) not null default 0.00,
  loan_repayment numeric(12,2) not null default 0.00,
  social_fund numeric(12,2) not null default 0.00,
  hosting_fund numeric(12,2) not null default 0.00,
  notes text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  updated_by uuid references members(id),
  unique (member_id, year_id, month)
);

create index if not exists ledger_member_year_month_idx on ledger_entries (member_id, year_id, month);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references members(id),
  actor_name varchar(255) not null,
  action varchar(100) not null,
  target_id uuid,
  target_name varchar(255),
  details text,
  ip_address varchar(50),
  created_at timestamp not null default now()
);

create index if not exists audit_actor_idx on audit_logs (actor_id);
create index if not exists audit_action_idx on audit_logs (action);
create index if not exists audit_created_idx on audit_logs (created_at);

create table if not exists import_logs (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid references members(id),
  file_name varchar(255) not null,
  total_rows integer not null default 0,
  success_rows integer not null default 0,
  failed_rows integer not null default 0,
  status varchar(20) not null default 'completed',
  report text,
  created_at timestamp not null default now()
);

-- Row Level Security: locked down. This app never talks to Supabase from
-- the browser — every request goes through Next.js API routes using the
-- service role key, which bypasses RLS entirely. Enabling RLS with no
-- policies just ensures the anon/public key (if ever exposed) can't read
-- or write anything.
alter table members enable row level security;
alter table password_reset_requests enable row level security;
alter table financial_years enable row level security;
alter table ledger_entries enable row level security;
alter table audit_logs enable row level security;
alter table import_logs enable row level security;

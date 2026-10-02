-- Supabase SQL Editor에서 한 번 실행하세요.
create extension if not exists "pgcrypto";

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  role text not null check (role in ('leader','member')),
  lang text not null check (lang in ('ko','zh')),
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  text text not null,
  lang text not null check (lang in ('ko','zh')),
  text_ko text,
  text_zh text,
  instruction jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  title_ko text,
  title_zh text,
  deliverable text,
  assignee_id uuid references members(id) on delete set null,
  deadline text,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  confirmed boolean not null default false,
  source_message_id uuid references messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists messages_team_idx on messages(team_id, created_at);
create index if not exists tasks_team_idx on tasks(team_id);
create index if not exists members_team_idx on members(team_id);
create unique index if not exists tasks_source_assignee_uq
  on tasks(source_message_id, assignee_id) where source_message_id is not null;

-- 로그인 없이 초대 코드로 합류하는 MVP 구조이므로 anon 권한을 열어 둡니다.
alter table teams enable row level security;
alter table members enable row level security;
alter table messages enable row level security;
alter table tasks enable row level security;

create policy "anon all teams" on teams for all to anon using (true) with check (true);
create policy "anon all members" on members for all to anon using (true) with check (true);
create policy "anon all messages" on messages for all to anon using (true) with check (true);
create policy "anon all tasks" on tasks for all to anon using (true) with check (true);

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table members;

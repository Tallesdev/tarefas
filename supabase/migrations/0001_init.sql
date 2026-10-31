-- =====================================================================
-- To-Do App — migration inicial (Supabase / Postgres)
-- Todas as tabelas: uuid gerado no cliente (offline-first), updated_at
-- para sync incremental e deleted_at para soft delete (o sync precisa
-- saber o que foi apagado em outro aparelho).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- helper: updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- perfis / configurações ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  settings    jsonb not null default '{}'::jsonb,  -- tema, formato de data, lembrete padrão etc.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- assinatura PRO (escrita só pelo webhook do RevenueCat) ----------
create table public.entitlements (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  is_pro      boolean not null default false,
  product_id  text,
  expires_at  timestamptz,           -- null = vitalício
  updated_at  timestamptz not null default now()
);

-- ---------- categorias ----------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 50),
  color       text,
  icon        text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index on public.categories (user_id, updated_at);

-- ---------- tarefas (subtarefa = tarefa com parent_id) ----------
create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  category_id       uuid references public.categories(id) on delete set null,
  parent_id         uuid references public.tasks(id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 500),
  notes             text,
  is_done           boolean not null default false,
  completed_at      timestamptz,
  due_date          date,
  due_time          time,
  reminder_minutes  integer,          -- minutos antes do vencimento; null = sem lembrete
  recurrence_rule   text,             -- RRULE (RFC 5545), ex.: FREQ=WEEKLY;BYDAY=MO,WE
  position          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index on public.tasks (user_id, updated_at);
create index on public.tasks (user_id, due_date) where deleted_at is null;
create index on public.tasks (parent_id);

-- ---------- anexos (arquivo vai no Storage, aqui só o metadado) ----------
create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  task_id       uuid not null references public.tasks(id) on delete cascade,
  storage_path  text not null,        -- {user_id}/{task_id}/{arquivo}
  mime_type     text,
  size_bytes    integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index on public.attachments (user_id, updated_at);

-- ---------- hábitos ----------
create table public.habits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 100),
  icon           text,
  color          text,
  kind           text not null default 'build' check (kind in ('build', 'quit')), -- criar x desistir
  week_days      smallint[] not null default '{1,2,3,4,5,6,7}',                  -- 1 = domingo
  reminder_time  time,
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index on public.habits (user_id, updated_at);

create table public.habit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  habit_id    uuid not null references public.habits(id) on delete cascade,
  log_date    date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (habit_id, log_date)
);
create index on public.habit_logs (user_id, updated_at);

-- ---------- sessões de foco ----------
create table public.focus_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  task_id           uuid references public.tasks(id) on delete set null,
  started_at        timestamptz not null,
  duration_seconds  integer not null check (duration_seconds > 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index on public.focus_sessions (user_id, updated_at);

-- ---------- triggers de updated_at ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','entitlements','categories','tasks',
                           'attachments','habits','habit_logs','focus_sessions']
  loop
    execute format(
      'create trigger trg_%1$s_updated before update on public.%1$s
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- RLS: cada usuário só vê o que é dele ----------
alter table public.profiles       enable row level security;
alter table public.entitlements   enable row level security;
alter table public.categories     enable row level security;
alter table public.tasks          enable row level security;
alter table public.attachments    enable row level security;
alter table public.habits         enable row level security;
alter table public.habit_logs     enable row level security;
alter table public.focus_sessions enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- entitlements: só leitura para o usuário; escrita só via service role (webhook)
create policy "read own entitlement" on public.entitlements
  for select using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['categories','tasks','attachments',
                           'habits','habit_logs','focus_sessions']
  loop
    execute format(
      'create policy "own rows" on public.%1$s
       for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ---------- novo usuário: cria perfil + categorias padrão ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.entitlements (user_id) values (new.id);
  insert into public.categories (user_id, name, position) values
    (new.id, 'Trabalho', 0),
    (new.id, 'Pessoal', 1),
    (new.id, 'Lista de Desejos', 2),
    (new.id, 'Aniversário', 3);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Storage: bucket privado de anexos ----------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "own attachments" on storage.objects
  for all to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

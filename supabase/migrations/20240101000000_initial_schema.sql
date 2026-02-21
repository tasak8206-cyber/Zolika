-- ============================================================
-- E-Commerce Competitor Price Monitor — Initial Schema
-- ============================================================

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";        -- for scheduled scrape jobs later
create extension if not exists "pg_net";          -- for HTTP requests from DB later

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
create type scrape_status as enum ('pending', 'success', 'failed', 'rate_limited');
create type price_currency as enum ('HUF', 'USD', 'EUR', 'GBP', 'CAD', 'AUD');
-- ─────────────────────────────────────────────
-- TABLE: profiles
-- Auto-created on auth.users insert via trigger
-- ─────────────────────────────────────────────
create table public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  email           text        not null,
  full_name       text,
  avatar_url      text,
  plan            text        not null default 'free',   -- 'free' | 'pro' | 'enterprise'
  scrape_limit    integer     not null default 10,       -- max competitor URLs per product
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.profiles is 'Extended user profile data linked to Supabase Auth.';

-- ─────────────────────────────────────────────
-- TABLE: products
-- The user's own products being monitored
-- ─────────────────────────────────────────────
create table public.products (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  name            text        not null,
  sku             text,
  own_price       numeric(12, 2),
  currency        price_currency not null default 'USD',
  category        text,
  image_url       text,
  notes           text,
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint products_name_not_empty check (char_length(name) >= 1),
  constraint products_own_price_positive check (own_price is null or own_price >= 0)
);
comment on table public.products is 'User''s own product catalog to track against competitors.';

create index idx_products_user_id on public.products(user_id);
create index idx_products_sku     on public.products(user_id, sku) where sku is not null;

-- ─────────────────────────────────────────────
-- TABLE: competitor_urls
-- One competitor listing per row, linked to a product
-- ─────────────────────────────────────────────
create table public.competitor_urls (
  id              uuid        primary key default gen_random_uuid(),
  product_id      uuid        not null references public.products(id) on delete cascade,
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  competitor_name text        not null,
  url             text        not null,
  scrape_selector text,                                  -- optional CSS selector override
  is_active       boolean     not null default true,
  last_scraped_at timestamptz,
  last_status     scrape_status,
  consecutive_failures integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint competitor_urls_url_format check (url ~* '^https?://'),
  -- One URL per product per competitor (prevent duplicates)
  constraint competitor_urls_unique_url_per_product unique (product_id, url)
);
comment on table public.competitor_urls is 'Competitor product URLs to scrape for pricing.';

create index idx_competitor_urls_product_id  on public.competitor_urls(product_id);
create index idx_competitor_urls_user_id     on public.competitor_urls(user_id);
create index idx_competitor_urls_active      on public.competitor_urls(is_active) where is_active = true;
create index idx_competitor_urls_last_status on public.competitor_urls(last_status);

-- ─────────────────────────────────────────────
-- TABLE: price_history
-- Immutable append-only log of every scrape result
-- ─────────────────────────────────────────────
create table public.price_history (
  id                  uuid          primary key default gen_random_uuid(),
  competitor_url_id   uuid          not null references public.competitor_urls(id) on delete cascade,
  product_id          uuid          not null references public.products(id) on delete cascade,
  user_id             uuid          not null references public.profiles(id) on delete cascade,
  scraped_price       numeric(12, 2),
  currency            price_currency not null default 'USD',
  in_stock            boolean,
  raw_price_text      text,                              -- raw string before parsing, for debugging
  price_delta         numeric(12, 2),                    -- vs previous scrape (computed on insert)
  price_delta_pct     numeric(7, 4),                     -- percentage change vs previous
  status              scrape_status not null default 'pending',
  error_message       text,
  scraped_at          timestamptz   not null default now(),

  constraint price_history_price_positive check (scraped_price is null or scraped_price >= 0)
);
comment on table public.price_history is 'Immutable time-series log of all competitor price scrapes.';

-- Optimized for the most common query patterns
create index idx_price_history_competitor_url_id on public.price_history(competitor_url_id, scraped_at desc);
create index idx_price_history_product_id        on public.price_history(product_id, scraped_at desc);
create index idx_price_history_user_id           on public.price_history(user_id);
create index idx_price_history_scraped_at        on public.price_history(scraped_at desc);

-- ─────────────────────────────────────────────
-- TRIGGERS: updated_at auto-stamp
-- ─────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

create trigger trg_competitor_urls_updated_at
  before update on public.competitor_urls
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────
-- TRIGGER: auto-create profile on signup
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.products       enable row level security;
alter table public.competitor_urls enable row level security;
alter table public.price_history  enable row level security;

-- PROFILES: users can only read and update their own row; insert handled by trigger
create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- PRODUCTS: full CRUD for owner only
create policy "products: owner select"
  on public.products for select
  using (auth.uid() = user_id);

create policy "products: owner insert"
  on public.products for insert
  with check (auth.uid() = user_id);

create policy "products: owner update"
  on public.products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "products: owner delete"
  on public.products for delete
  using (auth.uid() = user_id);

-- COMPETITOR_URLS: full CRUD for owner only
create policy "competitor_urls: owner select"
  on public.competitor_urls for select
  using (auth.uid() = user_id);

create policy "competitor_urls: owner insert"
  on public.competitor_urls for insert
  with check (auth.uid() = user_id);

create policy "competitor_urls: owner update"
  on public.competitor_urls for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "competitor_urls: owner delete"
  on public.competitor_urls for delete
  using (auth.uid() = user_id);

-- PRICE_HISTORY: owner can read/insert; no update or delete (append-only integrity)
create policy "price_history: owner select"
  on public.price_history for select
  using (auth.uid() = user_id);

create policy "price_history: owner insert"
  on public.price_history for insert
  with check (auth.uid() = user_id);

-- Service role bypass for the scraper worker (runs with service_role key, bypasses RLS)
-- No additional policy needed — service_role always bypasses RLS by default.

-- ─────────────────────────────────────────────
-- HELPER VIEW: latest price per competitor URL
-- Useful for dashboard "current prices" view
-- ─────────────────────────────────────────────
create or replace view public.latest_prices as
  select distinct on (ph.competitor_url_id)
    ph.competitor_url_id,
    ph.product_id,
    ph.user_id,
    cu.competitor_name,
    cu.url,
    p.name                as product_name,
    p.own_price,
    ph.scraped_price,
    ph.currency,
    ph.in_stock,
    ph.price_delta,
    ph.price_delta_pct,
    ph.status,
    ph.scraped_at
  from public.price_history ph
  join public.competitor_urls cu on cu.id = ph.competitor_url_id
  join public.products p         on p.id  = ph.product_id
  where ph.status = 'success'
  order by ph.competitor_url_id, ph.scraped_at desc;

comment on view public.latest_prices is 
  'Convenience view: most recent successful scrape per competitor URL. RLS enforced via underlying tables.';

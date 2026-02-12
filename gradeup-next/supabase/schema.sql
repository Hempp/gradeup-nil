-- ═══════════════════════════════════════════════════════════════════════════
-- GradeUp NIL - Complete Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- REFERENCE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Schools/Universities
create table if not exists schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  short_name text not null,
  city text not null,
  state text not null,
  division text check (division in ('D1', 'D2', 'D3', 'NAIA', 'JUCO', 'other')),
  conference text,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sports
create table if not exists sports (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  gender text check (gender in ('men', 'women', 'coed')),
  icon_name text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- USER TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('athlete', 'brand', 'athletic_director', 'admin')),
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  bio text,
  last_login_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Athletes
create table if not exists athletes (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  school_id uuid references schools(id),
  sport_id uuid references sports(id),
  position text,
  jersey_number text,
  academic_year text check (academic_year in ('freshman', 'sophomore', 'junior', 'senior', 'graduate', 'other')),
  gpa numeric(3,2) check (gpa >= 0 and gpa <= 4.0),
  major text,
  minor text,
  hometown text,
  height text,
  weight text,
  expected_graduation text,
  gender text,
  avatar_url text,
  bio text,
  cover_url text,
  instagram_handle text,
  twitter_handle text,
  tiktok_handle text,
  total_followers integer default 0,
  nil_valuation numeric(12,2) default 0,
  is_searchable boolean default true,
  enrollment_verified boolean default false,
  sport_verified boolean default false,
  grades_verified boolean default false,
  identity_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Brands
create table if not exists brands (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  company_name text not null,
  company_type text check (company_type in ('corporation', 'llc', 'partnership', 'sole_proprietor', 'nonprofit')),
  industry text,
  website_url text,
  logo_url text,
  description text,
  contact_name text not null,
  contact_title text,
  contact_email text not null,
  contact_phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip_code text,
  country text default 'USA',
  total_spent numeric(12,2) default 0,
  deals_completed integer default 0,
  avg_deal_rating numeric(3,2),
  active_campaigns integer default 0,
  preferred_sports text[],
  preferred_schools text[],
  preferred_divisions text[],
  min_gpa numeric(3,2),
  min_followers integer,
  budget_range_min numeric(10,2),
  budget_range_max numeric(10,2),
  is_verified boolean default false,
  verified_at timestamptz,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro', 'enterprise')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Athletic Directors
create table if not exists athletic_directors (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  school_id uuid references schools(id),
  title text,
  department text,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DEAL & CAMPAIGN TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Campaigns
create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  description text,
  budget numeric(12,2) not null,
  spent numeric(12,2) default 0,
  start_date date,
  end_date date,
  status text default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  target_sports text[],
  target_schools text[],
  target_divisions text[],
  target_min_gpa numeric(3,2),
  target_min_followers integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Opportunities
create table if not exists opportunities (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  campaign_id uuid references campaigns(id),
  title text not null,
  description text,
  deal_type text not null check (deal_type in ('social_post', 'appearance', 'endorsement', 'autograph', 'camp', 'merchandise', 'other')),
  compensation_type text not null check (compensation_type in ('fixed', 'hourly', 'per_post', 'revenue_share', 'product', 'other')),
  compensation_amount numeric(10,2) not null,
  compensation_details text,
  deliverables text,
  requirements text,
  status text default 'active' check (status in ('draft', 'active', 'paused', 'closed')),
  is_featured boolean default false,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Deals
create table if not exists deals (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  opportunity_id uuid references opportunities(id),
  campaign_id uuid references campaigns(id),
  title text not null,
  description text,
  deal_type text not null check (deal_type in ('social_post', 'appearance', 'endorsement', 'autograph', 'camp', 'merchandise', 'other')),
  compensation_type text not null check (compensation_type in ('fixed', 'hourly', 'per_post', 'revenue_share', 'product', 'other')),
  compensation_amount numeric(10,2) not null,
  compensation_details text,
  deliverables text,
  status text default 'draft' check (status in ('draft', 'pending', 'negotiating', 'accepted', 'active', 'completed', 'cancelled', 'expired', 'rejected')),
  rejection_reason text,
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENT TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Payment Accounts
create table if not exists payment_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  account_type text not null check (account_type in ('bank_transfer', 'paypal', 'venmo', 'check')),
  account_details jsonb not null default '{}',
  is_primary boolean default false,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Payments
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references deals(id) on delete cascade,
  athlete_id uuid not null references athletes(id),
  amount numeric(10,2) not null,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_method text check (payment_method in ('bank_transfer', 'paypal', 'venmo', 'check')),
  scheduled_date date,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- MESSAGING TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Conversations
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid references deals(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Conversation Participants
create table if not exists conversation_participants (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('athlete', 'brand')),
  created_at timestamptz default now(),
  unique(conversation_id, user_id)
);

-- Messages
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  content text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Message Attachments
create table if not exists message_attachments (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references messages(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYTICS & SYSTEM TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Athlete Analytics
create table if not exists athlete_analytics (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null unique references athletes(id) on delete cascade,
  profile_views integer default 0,
  search_appearances integer default 0,
  last_updated timestamptz default now()
);

-- Brand Analytics
create table if not exists brand_analytics (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null unique references brands(id) on delete cascade,
  total_impressions integer default 0,
  total_engagements integer default 0,
  avg_roi numeric(5,2) default 0,
  last_updated timestamptz default now()
);

-- Brand Shortlist
create table if not exists brand_shortlist (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  created_at timestamptz default now(),
  unique(brand_id, athlete_id)
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('deal', 'message', 'payment', 'system')),
  title text not null,
  body text not null,
  read boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Activity Log (for feeds)
create table if not exists activity_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  activity_type text not null check (activity_type in ('deal_created', 'deal_accepted', 'deal_completed', 'message_received', 'payment_received', 'profile_view', 'profile_update')),
  title text not null,
  description text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

create index if not exists idx_athletes_profile_id on athletes(profile_id);
create index if not exists idx_athletes_school_id on athletes(school_id);
create index if not exists idx_athletes_sport_id on athletes(sport_id);
create index if not exists idx_athletes_searchable on athletes(is_searchable) where is_searchable = true;
create index if not exists idx_athletes_gpa on athletes(gpa);

create index if not exists idx_brands_profile_id on brands(profile_id);

create index if not exists idx_deals_athlete_id on deals(athlete_id);
create index if not exists idx_deals_brand_id on deals(brand_id);
create index if not exists idx_deals_status on deals(status);

create index if not exists idx_campaigns_brand_id on campaigns(brand_id);
create index if not exists idx_campaigns_status on campaigns(status);

create index if not exists idx_payments_athlete_id on payments(athlete_id);
create index if not exists idx_payments_deal_id on payments(deal_id);
create index if not exists idx_payments_status on payments(status);

create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_messages_sender_id on messages(sender_id);

create index if not exists idx_conversation_participants_user_id on conversation_participants(user_id);
create index if not exists idx_conversation_participants_conversation_id on conversation_participants(conversation_id);

create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_read on notifications(read) where read = false;

create index if not exists idx_activity_log_user_id on activity_log(user_id);
create index if not exists idx_activity_log_created_at on activity_log(created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table athletes enable row level security;
alter table brands enable row level security;
alter table athletic_directors enable row level security;
alter table deals enable row level security;
alter table campaigns enable row level security;
alter table opportunities enable row level security;
alter table payments enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table message_attachments enable row level security;
alter table notifications enable row level security;
alter table brand_shortlist enable row level security;
alter table payment_accounts enable row level security;
alter table activity_log enable row level security;

-- Profiles: Users can read/update their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Service role can insert profiles" on profiles for insert with check (true);

-- Athletes: Public read for searchable, self-write
create policy "Athletes are publicly readable if searchable" on athletes for select using (is_searchable = true or profile_id = auth.uid());
create policy "Athletes can update own record" on athletes for update using (profile_id = auth.uid());
create policy "Athletes can insert own record" on athletes for insert with check (profile_id = auth.uid());

-- Brands: Public read for verified, self-write
create policy "Brands are publicly readable" on brands for select using (true);
create policy "Brands can update own record" on brands for update using (profile_id = auth.uid());
create policy "Brands can insert own record" on brands for insert with check (profile_id = auth.uid());

-- Athletic Directors: Self access
create policy "Directors can view own record" on athletic_directors for select using (profile_id = auth.uid());
create policy "Directors can update own record" on athletic_directors for update using (profile_id = auth.uid());
create policy "Directors can insert own record" on athletic_directors for insert with check (profile_id = auth.uid());

-- Deals: Readable by involved parties
create policy "Deals readable by parties" on deals for select using (
  athlete_id in (select id from athletes where profile_id = auth.uid()) or
  brand_id in (select id from brands where profile_id = auth.uid())
);
create policy "Brands can create deals" on deals for insert with check (
  brand_id in (select id from brands where profile_id = auth.uid())
);
create policy "Deal parties can update" on deals for update using (
  athlete_id in (select id from athletes where profile_id = auth.uid()) or
  brand_id in (select id from brands where profile_id = auth.uid())
);

-- Campaigns: Brand access only
create policy "Brands can view own campaigns" on campaigns for select using (
  brand_id in (select id from brands where profile_id = auth.uid())
);
create policy "Brands can create campaigns" on campaigns for insert with check (
  brand_id in (select id from brands where profile_id = auth.uid())
);
create policy "Brands can update own campaigns" on campaigns for update using (
  brand_id in (select id from brands where profile_id = auth.uid())
);

-- Opportunities: Public read, brand write
create policy "Opportunities are publicly readable" on opportunities for select using (status = 'active');
create policy "Brands can create opportunities" on opportunities for insert with check (
  brand_id in (select id from brands where profile_id = auth.uid())
);
create policy "Brands can update own opportunities" on opportunities for update using (
  brand_id in (select id from brands where profile_id = auth.uid())
);

-- Payments: Athlete can view own
create policy "Athletes can view own payments" on payments for select using (
  athlete_id in (select id from athletes where profile_id = auth.uid())
);

-- Payment Accounts: Own only
create policy "Users can view own payment accounts" on payment_accounts for select using (user_id = auth.uid());
create policy "Users can create own payment accounts" on payment_accounts for insert with check (user_id = auth.uid());
create policy "Users can update own payment accounts" on payment_accounts for update using (user_id = auth.uid());
create policy "Users can delete own payment accounts" on payment_accounts for delete using (user_id = auth.uid());

-- Conversations: Participants only
create policy "Participants can view conversations" on conversations for select using (
  id in (select conversation_id from conversation_participants where user_id = auth.uid())
);
create policy "Users can create conversations" on conversations for insert with check (true);

-- Conversation Participants
create policy "Users can view own participation" on conversation_participants for select using (user_id = auth.uid());
create policy "Users can add participants" on conversation_participants for insert with check (true);

-- Messages: Only participants can access
create policy "Messages accessible to participants" on messages for select using (
  conversation_id in (
    select conversation_id from conversation_participants where user_id = auth.uid()
  )
);
create policy "Participants can insert messages" on messages for insert with check (
  sender_id = auth.uid() and
  conversation_id in (
    select conversation_id from conversation_participants where user_id = auth.uid()
  )
);

-- Message Attachments
create policy "Attachments accessible to message participants" on message_attachments for select using (
  message_id in (
    select m.id from messages m
    join conversation_participants cp on m.conversation_id = cp.conversation_id
    where cp.user_id = auth.uid()
  )
);

-- Notifications: Own only
create policy "Users see own notifications" on notifications for select using (user_id = auth.uid());
create policy "Users update own notifications" on notifications for update using (user_id = auth.uid());

-- Brand Shortlist: Brand access only
create policy "Brands can view own shortlist" on brand_shortlist for select using (
  brand_id in (select id from brands where profile_id = auth.uid())
);
create policy "Brands can add to shortlist" on brand_shortlist for insert with check (
  brand_id in (select id from brands where profile_id = auth.uid())
);
create policy "Brands can remove from shortlist" on brand_shortlist for delete using (
  brand_id in (select id from brands where profile_id = auth.uid())
);

-- Activity Log: Own only
create policy "Users can view own activity" on activity_log for select using (user_id = auth.uid());

-- Schools and Sports: Public read
create policy "Schools are publicly readable" on schools for select using (true);
create policy "Sports are publicly readable" on sports for select using (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS FOR UPDATED_AT
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();

create trigger update_athletes_updated_at before update on athletes
  for each row execute function update_updated_at_column();

create trigger update_brands_updated_at before update on brands
  for each row execute function update_updated_at_column();

create trigger update_deals_updated_at before update on deals
  for each row execute function update_updated_at_column();

create trigger update_campaigns_updated_at before update on campaigns
  for each row execute function update_updated_at_column();

create trigger update_conversations_updated_at before update on conversations
  for each row execute function update_updated_at_column();

create trigger update_opportunities_updated_at before update on opportunities
  for each row execute function update_updated_at_column();

create trigger update_payment_accounts_updated_at before update on payment_accounts
  for each row execute function update_updated_at_column();

create trigger update_payments_updated_at before update on payments
  for each row execute function update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- ENABLE REALTIME
-- ═══════════════════════════════════════════════════════════════════════════

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table deals;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA: Schools
-- ═══════════════════════════════════════════════════════════════════════════

insert into schools (name, short_name, city, state, division, conference) values
('Duke University', 'Duke', 'Durham', 'NC', 'D1', 'ACC'),
('Stanford University', 'Stanford', 'Stanford', 'CA', 'D1', 'Pac-12'),
('Ohio State University', 'Ohio State', 'Columbus', 'OH', 'D1', 'Big Ten'),
('University of California, Los Angeles', 'UCLA', 'Los Angeles', 'CA', 'D1', 'Pac-12'),
('University of Michigan', 'Michigan', 'Ann Arbor', 'MI', 'D1', 'Big Ten'),
('University of Southern California', 'USC', 'Los Angeles', 'CA', 'D1', 'Pac-12'),
('University of Alabama', 'Alabama', 'Tuscaloosa', 'AL', 'D1', 'SEC'),
('University of Texas', 'Texas', 'Austin', 'TX', 'D1', 'Big 12'),
('University of North Carolina', 'UNC', 'Chapel Hill', 'NC', 'D1', 'ACC'),
('University of Florida', 'Florida', 'Gainesville', 'FL', 'D1', 'SEC')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA: Sports
-- ═══════════════════════════════════════════════════════════════════════════

insert into sports (name, category, gender, icon_name) values
('Basketball', 'team', 'men', 'basketball'),
('Basketball', 'team', 'women', 'basketball'),
('Football', 'team', 'men', 'football'),
('Soccer', 'team', 'men', 'soccer'),
('Soccer', 'team', 'women', 'soccer'),
('Volleyball', 'team', 'women', 'volleyball'),
('Gymnastics', 'individual', 'women', 'gymnastics'),
('Swimming', 'individual', 'coed', 'swimming'),
('Tennis', 'individual', 'coed', 'tennis'),
('Track & Field', 'individual', 'coed', 'track'),
('Baseball', 'team', 'men', 'baseball'),
('Softball', 'team', 'women', 'softball'),
('Golf', 'individual', 'coed', 'golf'),
('Wrestling', 'individual', 'men', 'wrestling'),
('Lacrosse', 'team', 'coed', 'lacrosse')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE!
-- ═══════════════════════════════════════════════════════════════════════════
-- Next steps:
-- 1. Go to Supabase Dashboard → Storage → Create buckets: avatars, covers, message-attachments, brand-logos
-- 2. Update .env.local with your Supabase URL and anon key
-- 3. Test sign up flow

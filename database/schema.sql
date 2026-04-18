-- Nettoyage
drop table if exists fuel_requests cascade;
drop table if exists users cascade;
drop table if exists structures cascade;

-- =========================
-- Table structures
-- =========================
create table structures (
  id bigserial primary key,
  name text not null unique,
  owner_name text,
  owner_phone text,
  pin_chief text,
  pin_pump text,
  created_at timestamptz not null default now()
);

-- =========================
-- Table utilisateurs
-- =========================
create table users (
  id bigserial primary key,
  structure_id bigint references structures(id) on delete set null,
  name text not null,
  phone text unique not null,
  password_hash text,
  role text not null check (role in ('driver', 'chief', 'pump_attendant')),
  created_at timestamptz not null default now()
);

-- =========================
-- Table demandes carburant
-- =========================
create table fuel_requests (
  id bigserial primary key,

  structure_id bigint references structures(id) on delete set null,
  structure_name text,

  driver_id bigint references users(id) on delete set null,
  chief_id bigint references users(id) on delete set null,
  pump_attendant_id bigint references users(id) on delete set null,

  driver_name text not null,
  truck_number text not null,
  fuel_type text not null,

  requested_liters numeric(10,2) not null check (requested_liters > 0),
  approved_liters numeric(10,2),
  served_liters numeric(10,2),
  amount numeric(12,2),

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'served')),

  created_at timestamptz not null default now(),
  approved_at timestamptz,
  served_at timestamptz
);

-- =========================
-- Index
-- =========================
create index idx_users_structure_id on users(structure_id);

create index idx_fuel_requests_status on fuel_requests(status);
create index idx_fuel_requests_driver_id on fuel_requests(driver_id);
create index idx_fuel_requests_structure_id on fuel_requests(structure_id);
create index idx_fuel_requests_structure_name on fuel_requests(structure_name);
create index idx_fuel_requests_driver_name on fuel_requests(driver_name);
create index idx_fuel_requests_created_at on fuel_requests(created_at desc);

-- =========================
-- Données de test
-- =========================
insert into structures (name, owner_name, owner_phone, pin_chief, pin_pump)
values
  ('Transport Kossi SARL', 'Chef Principal', '90000002', '1234', '5678'),
  ('Flotte Kara BTP', 'Chef Kara', '90000012', '1234', '5678');

insert into users (structure_id, name, phone, password_hash, role)
values
  (1, 'Kossi Chauffeur', '90000001', 'demo', 'driver'),
  (1, 'Chef Principal', '90000002', 'demo', 'chief'),
  (1, 'Pompiste Station 1', '90000003', 'demo', 'pump_attendant'),
  (2, 'Yaw Chauffeur', '90000011', 'demo', 'driver'),
  (2, 'Chef Kara', '90000012', 'demo', 'chief'),
  (2, 'Pompiste Kara', '90000013', 'demo', 'pump_attendant');

insert into fuel_requests (
  structure_id,
  structure_name,
  driver_id,
  chief_id,
  pump_attendant_id,
  driver_name,
  truck_number,
  fuel_type,
  requested_liters,
  approved_liters,
  served_liters,
  amount,
  status,
  created_at,
  approved_at,
  served_at
)
values
  (
    1,
    'Transport Kossi SARL',
    1,
    2,
    null,
    'Kossi Chauffeur',
    'TG-1234-AB',
    'gasoil',
    120,
    100,
    null,
    null,
    'approved',
    now() - interval '2 day',
    now() - interval '1 day',
    null
  ),
  (
    1,
    'Transport Kossi SARL',
    1,
    null,
    null,
    'Kossi Chauffeur',
    'TG-5678-CD',
    'essence',
    80,
    null,
    null,
    null,
    'pending',
    now() - interval '3 hour',
    null,
    null
  ),
  (
    2,
    'Flotte Kara BTP',
    4,
    5,
    6,
    'Yaw Chauffeur',
    'TG-4321-KR',
    'gasoil',
    200,
    180,
    180,
    126000,
    'served',
    now() - interval '3 day',
    now() - interval '2 day',
    now() - interval '2 day'
  );
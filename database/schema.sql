-- =====================================
-- RESET TOTAL
-- =====================================
drop table if exists fuel_requests cascade;
drop table if exists users cascade;
drop table if exists structures cascade;

-- =====================================
-- TABLE STRUCTURES
-- 1 structure = 1 chef propriétaire
-- =====================================
create table structures (
  id bigserial primary key,
  name text not null,
  structure_code text not null unique,
  owner_name text not null,
  owner_phone text not null unique,
  owner_password text not null,
  created_at timestamptz not null default now(),

  constraint structures_name_not_blank check (length(trim(name)) > 0),
  constraint structures_structure_code_not_blank check (length(trim(structure_code)) > 0),
  constraint structures_owner_name_not_blank check (length(trim(owner_name)) > 0),
  constraint structures_owner_phone_not_blank check (length(trim(owner_phone)) > 0),
  constraint structures_owner_password_not_blank check (length(trim(owner_password)) >= 4),
  constraint structures_structure_code_format check (structure_code ~ '^[A-Z0-9_-]{4,20}$')
);

create unique index idx_structures_name_lower_unique
on structures (lower(name));

create index idx_structures_structure_code on structures(structure_code);
create index idx_structures_owner_phone on structures(owner_phone);

-- =====================================
-- TABLE USERS
-- Membres rattachés à une structure
-- chief = créé automatiquement à la création structure
-- driver = chauffeur
-- pump_attendant = pompiste
-- =====================================
create table users (
  id bigserial primary key,
  structure_id bigint not null references structures(id) on delete cascade,
  name text not null,
  phone text,
  truck_number text,
  pin_code text,
  role text not null check (role in ('chief', 'driver', 'pump_attendant')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint users_name_not_blank check (length(trim(name)) > 0),
  constraint users_phone_blank_or_not_blank check (phone is null or length(trim(phone)) > 0),
  constraint users_truck_blank_or_not_blank check (truck_number is null or length(trim(truck_number)) > 0),
  constraint users_pin_blank_or_valid check (
    pin_code is null or pin_code ~ '^[0-9]{4,8}$'
  )
);

-- un seul chef par structure
create unique index uniq_one_chief_per_structure
on users(structure_id)
where role = 'chief';

-- pas deux chauffeurs avec le même nom dans une même structure
create unique index uniq_driver_name_per_structure
on users(structure_id, lower(name))
where role = 'driver';

-- pas deux pompistes avec le même nom dans une même structure
create unique index uniq_pump_name_per_structure
on users(structure_id, lower(name))
where role = 'pump_attendant';

-- téléphone unique seulement si renseigné
create unique index uniq_users_phone
on users(phone)
where phone is not null;

create index idx_users_structure_id on users(structure_id);
create index idx_users_role on users(role);
create index idx_users_name on users(name);
create index idx_users_truck_number on users(truck_number);

-- =====================================
-- TABLE FUEL REQUESTS
-- demandes liées à la structure et au chauffeur
-- =====================================
create table fuel_requests (
  id bigserial primary key,

  structure_id bigint not null references structures(id) on delete cascade,
  structure_name text not null,

  driver_id bigint references users(id) on delete set null,
  chief_id bigint references users(id) on delete set null,
  pump_attendant_id bigint references users(id) on delete set null,

  driver_name text not null,
  truck_number text not null,
  fuel_type text not null check (fuel_type in ('gasoil', 'essence')),

  requested_liters numeric(10,2) not null check (requested_liters > 0),
  approved_liters numeric(10,2),
  served_liters numeric(10,2),
  amount numeric(12,2),

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'served')),

  created_at timestamptz not null default now(),
  approved_at timestamptz,
  served_at timestamptz,

  constraint fuel_requests_structure_name_not_blank check (length(trim(structure_name)) > 0),
  constraint fuel_requests_driver_name_not_blank check (length(trim(driver_name)) > 0),
  constraint fuel_requests_truck_number_not_blank check (length(trim(truck_number)) > 0),

  constraint fuel_requests_approved_liters_positive
    check (approved_liters is null or approved_liters > 0),

  constraint fuel_requests_served_liters_positive
    check (served_liters is null or served_liters > 0),

  constraint fuel_requests_amount_valid
    check (amount is null or amount >= 0),

  constraint fuel_requests_approved_not_above_requested
    check (
      approved_liters is null
      or approved_liters <= requested_liters
    ),

  constraint fuel_requests_served_not_above_requested
    check (
      served_liters is null
      or served_liters <= requested_liters
    ),

  constraint fuel_requests_served_not_above_approved
    check (
      approved_liters is null
      or served_liters is null
      or served_liters <= approved_liters
    ),

  constraint fuel_requests_approved_when_needed
    check (
      status in ('pending', 'rejected')
      or approved_liters is not null
    ),

  constraint fuel_requests_served_requires_amount
    check (
      status <> 'served'
      or (served_liters is not null and amount is not null and pump_attendant_id is not null)
    ),

  constraint fuel_requests_approved_requires_chief
    check (
      status not in ('approved', 'served', 'rejected')
      or chief_id is not null
    )
);

create index idx_fuel_requests_status on fuel_requests(status);
create index idx_fuel_requests_driver_id on fuel_requests(driver_id);
create index idx_fuel_requests_chief_id on fuel_requests(chief_id);
create index idx_fuel_requests_pump_attendant_id on fuel_requests(pump_attendant_id);
create index idx_fuel_requests_structure_id on fuel_requests(structure_id);
create index idx_fuel_requests_created_at on fuel_requests(created_at desc);
create index idx_fuel_requests_driver_name on fuel_requests(driver_name);
create index idx_fuel_requests_truck_number on fuel_requests(truck_number);
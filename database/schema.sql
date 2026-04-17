-- Supprimer si besoin
drop table if exists fuel_requests cascade;
drop table if exists users cascade;

-- Table utilisateurs
create table users (
  id bigserial primary key,
  name text not null,
  phone text unique not null,
  password_hash text,
  role text not null check (role in ('driver', 'chief', 'pump_attendant')),
  created_at timestamptz not null default now()
);

-- Table demandes carburant
create table fuel_requests (
  id bigserial primary key,

  driver_id bigint not null references users(id) on delete restrict,
  chief_id bigint references users(id) on delete set null,
  pump_attendant_id bigint references users(id) on delete set null,

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

create index idx_fuel_requests_status on fuel_requests(status);
create index idx_fuel_requests_driver_id on fuel_requests(driver_id);
create index idx_fuel_requests_created_at on fuel_requests(created_at desc);

-- Données de test
insert into users (name, phone, password_hash, role)
values
  ('Kossi Chauffeur', '90000001', 'demo', 'driver'),
  ('Chef Principal', '90000002', 'demo', 'chief'),
  ('Pompiste Station 1', '90000003', 'demo', 'pump_attendant');
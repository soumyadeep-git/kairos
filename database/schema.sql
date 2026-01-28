-- 1. Users Table
create table users (
    id uuid default gen_random_uuid() primary key,
    phone_number text unique not null,
    full_name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- 2. Appointments Table
create table appointments (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references users(id) not null,
    start_time timestamp with time zone not null,
    end_time timestamp with time zone not null,
    description text,
    status text default 'booked',
    -- booked, cancelled
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- 3. Logs (For the summary requirement)
create table conversation_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references users(id),
    summary text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
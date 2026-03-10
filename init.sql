-- PostgreSQL initialization script for Pilates DB

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    weekly_limit INT NOT NULL DEFAULT 2,
    total_classes INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS time_slots (
    id SERIAL PRIMARY KEY,
    day_of_week VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    capacity INT NOT NULL DEFAULT 3
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    time_slot_id INT NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    booking_date VARCHAR(50)
);

-- Note: In Hibernate, this structure will be managed automatically by "update",
-- but creating the basic relations via this file ensures Postgres container starts up ready.

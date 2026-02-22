-- Migration file for initial schema for Supabase

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create competitors table
CREATE TABLE competitors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create price_history table
CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    price NUMERIC NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create price_alerts table
CREATE TABLE price_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    target_price NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security policies
-- Enable RLS for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS for products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Enable RLS for competitors table
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- Enable RLS for price_history table
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Enable RLS for price_alerts table
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- Define policies if needed
-- For example:
-- CREATE POLICY "select_users" ON users FOR SELECT USING (auth.uid() = id);

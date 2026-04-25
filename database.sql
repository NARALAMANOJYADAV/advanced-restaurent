-- Marvell Restaurant Database Schema
-- PostgreSQL

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id            SERIAL PRIMARY KEY,
    table_number  VARCHAR(10)  NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    category      VARCHAR(100),
    order_items   TEXT,
    total_amount  VARCHAR(50),
    requirements  TEXT         DEFAULT 'None',
    payment_method VARCHAR(50),
    status        VARCHAR(50)  DEFAULT 'Pending',
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Insert sample order (for testing)
INSERT INTO orders (table_number, customer_name, customer_email, customer_phone, category, order_items, total_amount, requirements, payment_method, status)
VALUES (
    '5',
    'John Doe',
    'john@example.com',
    '9876543210',
    'veg - lunch',
    '- Veg Biryani (1) - ₹250\n- Roti (2) - ₹80',
    '₹330',
    'Less spicy',
    'card',
    'Pending'
);

-- Query all orders
SELECT * FROM orders ORDER BY created_at DESC;

-- Query orders by status
SELECT * FROM orders WHERE status = 'Pending';

-- Count orders by status
SELECT status, COUNT(*) as count FROM orders GROUP BY status;

-- Update order status
UPDATE orders SET status = 'Preparing' WHERE id = 1;

-- Delete order
DELETE FROM orders WHERE id = 1;

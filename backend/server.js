require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const app = express();

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin === 'null' || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token']
}));

app.use(express.json());
app.use(express.static('public'));

// In-memory fallback store
let mockOrders = [];
let mockIdCounter = 1000;

// PostgreSQL Pool
let pool = null;
if (process.env.DATABASE_URL) {
  const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
  pool.on('error', (err) => console.error('PG pool error:', err.message));
}

// DB Init
async function initDB() {
  if (!pool) { console.log('No DATABASE_URL — running in memory mode.'); return; }
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id            SERIAL PRIMARY KEY,
        table_number  VARCHAR(10)  NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        customer_phone VARCHAR(20),
        category      VARCHAR(100),
        order_items   TEXT,
        total_amount  VARCHAR(50),
        requirements  TEXT DEFAULT 'None',
        payment_method VARCHAR(50),
        status        VARCHAR(50) DEFAULT 'Pending',
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('PostgreSQL connected and table verified.');
  } catch (err) {
    console.warn('DB init failed, switching to memory mode:', err.message);
    pool = null;
  } finally {
    if (client) client.release();
  }
}

// Email
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS && !process.env.EMAIL_PASS.includes('your_')) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}

function sendEmails(order) {
  if (!transporter) return;
  const itemsHtml = (order.order_items || '').replace(/\n/g, '<br>');
  const adminMail = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
    subject: `New Order #${order.id} - Table ${order.table_number} (${order.customer_name})`,
    html: `<h2>New Order #${order.id}</h2>
      <p><b>Table:</b> ${order.table_number}</p>
      <p><b>Customer:</b> ${order.customer_name} | ${order.customer_phone}</p>
      <p><b>Items:</b><br>${itemsHtml}</p>
      <p><b>Total:</b> ${order.total_amount}</p>
      <p><b>Payment:</b> ${order.payment_method}</p>
      <p><b>Notes:</b> ${order.requirements}</p>`
  };
  const customerMail = {
    from: process.env.EMAIL_USER,
    to: order.customer_email,
    subject: `Order Confirmed #${order.id} - Marvell Restaurant`,
    html: `<h2>Thank you, ${order.customer_name}!</h2>
      <p>Your order <b>#${order.id}</b> has been received.</p>
      <p><b>Items:</b><br>${itemsHtml}</p>
      <p><b>Total: ${order.total_amount}</b></p>
      <p><b>Payment:</b> ${order.payment_method}</p>
      <p>We'll serve you shortly!</p>`
  };
  transporter.sendMail(adminMail).catch(e => console.error('Admin email error:', e.message));
  if (order.customer_email) transporter.sendMail(customerMail).catch(e => console.error('Customer email error:', e.message));
}

// Admin Auth
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!process.env.ADMIN_TOKEN || token === process.env.ADMIN_TOKEN) return next();
  res.status(401).json({ success: false, message: 'Unauthorized' });
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date(), db: pool ? 'postgres' : 'memory' }));

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  const { table_number, customer_name, customer_email, customer_phone, category, order_items, total_amount, requirements, payment_method } = req.body;
  if (!table_number || !customer_name) {
    return res.status(400).json({ success: false, message: 'table_number and customer_name are required' });
  }
  let newOrder = { id: ++mockIdCounter, table_number, customer_name, customer_email, customer_phone, category, order_items, total_amount, requirements: requirements || 'None', payment_method, status: 'Pending', created_at: new Date() };
  if (pool) {
    try {
      const result = await pool.query(
        `INSERT INTO orders (table_number,customer_name,customer_email,customer_phone,category,order_items,total_amount,requirements,payment_method)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [table_number, customer_name, customer_email, customer_phone, category, order_items, total_amount, requirements || 'None', payment_method]
      );
      newOrder = result.rows[0];
    } catch (dbErr) {
      console.warn('DB insert failed, using memory fallback:', dbErr.message);
      mockOrders.push(newOrder);
    }
  } else {
    mockOrders.push(newOrder);
  }
  sendEmails(newOrder);
  res.status(201).json({ success: true, order: newOrder });
});

// GET /api/orders
app.get('/api/orders', adminAuth, async (req, res) => {
  if (!pool) return res.json(mockOrders.slice().reverse());
  try {
    const { status, table } = req.query;
    let query = 'SELECT * FROM orders';
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (table) { params.push(table); conditions.push(`table_number = $${params.length}`); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC LIMIT 200';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.warn('GET orders DB error, using memory:', err.message);
    res.json(mockOrders.slice().reverse());
  }
});

// GET /api/orders/stats
app.get('/api/orders/stats', adminAuth, async (req, res) => {
  if (!pool) {
    return res.json({
      total: mockOrders.length,
      pending: mockOrders.filter(o => o.status === 'Pending').length,
      preparing: mockOrders.filter(o => o.status === 'Preparing').length,
      completed: mockOrders.filter(o => o.status === 'Completed').length,
      revenue: 0
    });
  }
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='Pending')   AS pending,
        COUNT(*) FILTER (WHERE status='Preparing') AS preparing,
        COUNT(*) FILTER (WHERE status='Completed') AS completed
      FROM orders
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.warn('Stats DB error:', err.message);
    res.json({ total: 0, pending: 0, preparing: 0, completed: 0 });
  }
});

// PATCH /api/orders/:id/status
app.patch('/api/orders/:id/status', adminAuth, async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  const allowed = ['Pending', 'Preparing', 'Completed', 'Cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

  if (!pool) {
    const order = mockOrders.find(o => o.id == id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.status = status;
    return res.json({ success: true, order });
  }
  try {
    const result = await pool.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.warn('PATCH status DB error:', err.message);
    const order = mockOrders.find(o => o.id == id);
    if (order) { order.status = status; return res.json({ success: true, order }); }
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// DELETE /api/orders/:id
app.delete('/api/orders/:id', adminAuth, async (req, res) => {
  if (!pool) {
    const idx = mockOrders.findIndex(o => o.id == req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Order not found' });
    mockOrders.splice(idx, 1);
    return res.json({ success: true, message: `Order #${req.params.id} deleted` });
  }
  try {
    const result = await pool.query('DELETE FROM orders WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: `Order #${req.params.id} deleted` });
  } catch (err) {
    console.warn('DELETE DB error:', err.message);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// POST /api/send-email
app.post('/api/send-email', async (req, res) => {
  const { to, customer_name, order_id, order_items, total_amount, payment_method, table_number, requirements, restaurant_name } = req.body;

  console.log('📧 [AJAX Email Request] Received:', { to, order_id, customer_name });

  // Validation
  if (!to || !order_id) {
    console.warn('❌ [AJAX Email] Missing required fields:', { to, order_id });
    return res.status(400).json({ success: false, message: 'Missing required fields: to, order_id' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    console.warn('❌ [AJAX Email] Invalid email format:', to);
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  // Check if transporter is configured
  if (!transporter) {
    console.warn('❌ [AJAX Email] Email service not configured in .env');
    return res.status(503).json({
      success: false,
      message: 'Email service not configured. Please set EMAIL_USER and EMAIL_PASS in .env'
    });
  }

  try {
    const itemsHtml = (order_items || '').replace(/\n/g, '<br>');
    const emailContent = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: `Order Confirmed #${order_id} - ${restaurant_name || 'Marvell Restaurant'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">✓ Thank you, ${customer_name}!</h2>
          <p style="font-size: 16px; color: #333;">Your order <b>#${order_id}</b> has been confirmed and is being prepared.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Order Details</h3>
            <p><b>Restaurant:</b> ${restaurant_name || 'Marvell Restaurant'}</p>
            <p><b>Table Number:</b> ${table_number}</p>
            <p><b>Items:</b><br>${itemsHtml}</p>
            <p><b>Total Amount:</b> <span style="color: #e74c3c; font-size: 18px; font-weight: bold;">${total_amount}</span></p>
            <p><b>Payment Method:</b> ${payment_method}</p>
            ${requirements && requirements !== 'None' ? `<p><b>Special Instructions:</b> ${requirements}</p>` : ''}
          </div>
          
          <p style="color: #666; font-size: 14px;">We'll serve you shortly! Thank you for your order. 🍽️</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">This is an automated confirmation email. Please do not reply to this email.</p>
        </div>
      `
    };

    console.log('📧 [AJAX Email] Sending to:', to);

    const info = await transporter.sendMail(emailContent);

    console.log('✅ [AJAX Email] Sent successfully:', {
      to: to,
      orderId: order_id,
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      email: to
    });

  } catch (err) {
    console.error('❌ [AJAX Email] Error sending email:', {
      error: err.message,
      to: to,
      orderId: order_id,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      message: 'Failed to send email: ' + err.message
    });
  }
});

// Start
const PORT = process.env.PORT || 5000;
initDB().catch(err => {
  console.warn('initDB error:', err.message);
  pool = null;
}).finally(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });
});

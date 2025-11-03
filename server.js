// --- 1. IMPORTS ---
// Load environment variables from .env file
require('dotenv').config(); 

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const multer = require('multer');

// --- 2. SETUP ---
const app = express();
// Use the PORT variable from .env, or default to 5500
const PORT = process.env.PORT || 5500;
// Configure multer for file storage
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

console.log("--- SERVER.JS (Corrected Version)");

// --- 3. CORE MIDDLEWARE ---
// CRITICAL: This section MUST come BEFORE your API routes.
app.use(cors({
    origin: '*', 
    credentials: true
}));
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// --- 4. DATABASE CONNECTION ---
// IMPORTANT: Using environment variables for robustness and security.
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_DATABASE 
};

const pool = mysql.createPool(dbConfig);


// --- 5. DATABASE HELPER FUNCTIONS ---

/**
 * Executes a query that is expected to return a single row (e.g., SELECT by ID or email).
 */
async function getSql(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows[0];
}

/**
 * Executes a query that is expected to return multiple rows (e.g., SELECT all users).
 */
async function allSql(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows;
}

/**
 * Executes a DML query (INSERT, UPDATE, DELETE).
 */
async function runSql(sql, params = []) {
    const [result] = await pool.query(sql, params);
    return result;
}

// --- 6. API ROUTES ---

// Exp 2 (DML): User Registration
app.post('/api/register', async (req, res) => {
    const { name, email, password, age, gender } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields: name, email, and password are required.' });
    }

    try {
        const existing = await getSql('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const validatedAge = (age !== undefined && age !== null && !isNaN(Number(age))) ? Number(age) : null;
        const validatedGender = gender || null;
        const userRole = 'user'; // Default role

        const hash = await bcrypt.hash(password, 10);
        
        const r = await runSql(
            'INSERT INTO users (name, email, password_hash, age, gender, role) VALUES (?, ?, ?, ?, ?, ?)', 
            [name, email, hash, validatedAge, validatedGender, userRole]
        );

        res.json({ success: true, userId: r.insertId });

    } catch (e) {
        console.error('Registration failed due to a server or DB issue:', e); 
        res.status(500).json({ error: 'Server error: registration failed. Please try again later.' }); 
    }
});


// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const user = await getSql('SELECT id,name,email,password_hash,role,age,gender FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    delete user.password_hash;
    res.json({ success: true, user });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Exp 4 (Set/Arithmetic): Public list of schemes
app.get('/api/schemes', async (req, res) => {
  try {
    const { q, academic_year, type, category, international } = req.query;
    let clauses = [];
    let params = [];
    if (q) { clauses.push("(scheme_name LIKE ? OR scholarship_name LIKE ?)"); params.push('%' + q + '%', '%' + q + '%'); }
    if (academic_year) { clauses.push('academic_year = ?'); params.push(academic_year.trim()); }
    if (type) { clauses.push('type = ?'); params.push(type.trim()); }
    if (category) {
      const cats = category.split(',').map(s => s.trim());
      clauses.push('category IN (' + cats.map(() => '?').join(',') + ')');
      params.push(...cats);
    }
    if (international === '1') { clauses.push('is_international_eligible = 1'); }
    const where = clauses.length ? (' WHERE ' + clauses.join(' AND ')) : '';
    const rows = await allSql('SELECT * FROM schemes' + where + ' ORDER BY application_deadline IS NULL, application_deadline',params);
    res.json({ schemes: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Get single scheme
app.get('/api/schemes/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const row = await getSql('SELECT * FROM schemes WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Scheme not found' });
    res.json({ scheme: row });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

const applyUpload = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'mark10', maxCount: 1 }
]);

// Exp 3 (TCL - Transaction): Apply for a scheme
app.post('/api/apply', applyUpload, async (req, res) => {
  let connection;
  try {
    const data = req.body.data ? JSON.parse(req.body.data) : {};
    const { user_id, scheme_id } = data;
    if (!user_id || !scheme_id) return res.status(400).json({ error: 'Missing user_id or scheme_id' });
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const r = await connection.query('INSERT INTO applications (user_id,scheme_id,amount_applied,data_json) VALUES (?,?,?,?)', [user_id, scheme_id, data.amount_applied || null, JSON.stringify(data)]);
    const appId = r[0].insertId;
    if (req.files) {
      if (req.files.photo) {
        const f = req.files.photo[0];
        await connection.query('INSERT INTO documents (application_id,doc_type,filename) VALUES (?,?,?)', [appId, f.fieldname, f.filename]);
      }
      if (req.files.mark10) {
        const f = req.files.mark10[0];
        await connection.query('INSERT INTO documents (application_id,doc_type,filename) VALUES (?,?,?)', [appId, f.fieldname, f.filename]);
      }
    }
    await connection.commit();
    res.json({ success: true, applicationId: appId });
  } catch (e) {
    if (connection) await connection.rollback();
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (connection) connection.release();
  }
});

// Exp 6 (JOIN): Get "My Applications"
app.get('/api/my-applications/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const sql = `
      SELECT a.id as application_id, s.scheme_name, s.scholarship_name, a.application_date, a.status 
      FROM applications a 
      LEFT JOIN schemes s ON a.scheme_id = s.id 
      WHERE a.user_id = ? 
      ORDER BY a.application_date DESC
    `;
    const rows = await allSql(sql, [userId]);
    res.json({ applications: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Exp 6 (JOIN): Get application details
app.get('/api/application/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const appRow = await getSql('SELECT a.*, s.scheme_name, s.scholarship_name, s.amount FROM applications a LEFT JOIN schemes s ON a.scheme_id = s.id WHERE a.id = ?', [id]);
    if (!appRow) return res.status(404).json({ error: 'Application not found' });
    const docs = await allSql('SELECT * FROM documents WHERE application_id = ?', [id]);
    res.json({ application: appRow, documents: docs });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Exp 5 (Aggregates) & Exp 7 (Subqueries): Admin stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const users = await getSql('SELECT COUNT(*) as c FROM users');
    const schemes = await getSql('SELECT COUNT(*) as c FROM schemes');
    const pending = await getSql("SELECT COUNT(*) as c FROM applications WHERE status = 'Pending'");
    res.json({ total_users: users.c, total_schemes: schemes.c, pending_applications: pending.c });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Exp 8 (FIXED): Get pending applications with a direct JOIN
app.get('/api/admin/pending-applications', async (req, res) => {
  try {
    // Use a direct LEFT JOIN query instead of the broken view
    const sql = `
      SELECT 
        a.id, 
        a.application_date, 
        a.status,
        u.name as applicant_name,
        u.email as applicant_email,
        s.scheme_name
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN schemes s ON a.scheme_id = s.id
      WHERE a.status = 'Pending'
      ORDER BY a.application_date ASC
    `;
    const rows = await allSql(sql);
    res.json({ applications: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});
// Exp 9 (Trigger): Approve/Reject an application
app.post('/api/admin/application/:id/approve', async (req, res) => {
  try {
    const id = req.params.id;
    await runSql("UPDATE applications SET status='Approved' WHERE id=?", [id]);
    res.json({ success: true, message: 'Trigger fired (if status changed)' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/application/:id/reject', async (req, res) => {
  try {
    const id = req.params.id;
    await runSql("UPDATE applications SET status='Rejected' WHERE id=?", [id]);
    res.json({ success: true, message: 'Trigger fired (if status changed)' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});


// --- 7. FRONTEND STATIC FILES & CATCH-ALL ---
// CRITICAL: This section MUST come AFTER all your API routes.
app.use(express.static(path.join(__dirname, 'public')));

// CRITICAL: This is the final catch-all for the frontend. It must be last.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 8. START SERVER (AFTER DB CHECK) ---
// Test the connection pool and START the server
pool.getConnection()
    .then(conn => {
        console.log('✅ Connected to MySQL database!');
        conn.release();
        
        // --- START SERVER ---
        // Only listen for connections AFTER the database is confirmed to be working
        app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    })
    .catch(err => {
        console.error('❌ FATAL ERROR: Could not connect to the database. Check your .env file and MySQL service:', err.message);
        process.exit(1); 
    });
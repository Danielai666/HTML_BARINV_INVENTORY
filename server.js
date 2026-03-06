const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const APP_ORIGIN = process.env.APP_ORIGIN || ""; // optional; supports comma-separated origins

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("railway") ? { rejectUnauthorized: false } : undefined
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

const ALLOWED_ORIGINS = APP_ORIGIN
  ? APP_ORIGIN.split(",").map(s => s.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // mobile apps / curl
    if (!ALLOWED_ORIGINS.length) return cb(null, true);
    return cb(null, ALLOWED_ORIGINS.includes(origin));
  },
  credentials: true
}));

function signToken(user){
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username, displayName: user.display_name },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function authRequired(req, res, next){
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer (.+)$/);
  if(!m) return res.status(401).json({ error: "missing_token" });
  try{
    req.user = jwt.verify(m[1], JWT_SECRET);
    return next();
  }catch(e){
    return res.status(401).json({ error: "invalid_token" });
  }
}

function requireRole(role){
  return (req, res, next) => {
    if(req.user?.role !== role) return res.status(403).json({ error: "forbidden" });
    next();
  };
}

app.get("/api/health", async (req, res) => {
  try{
    const r = await pool.query("SELECT now() as now");
    res.json({ ok: true, now: r.rows[0].now });
  }catch(e){
    res.status(500).json({ ok: false, error: "db_error" });
  }
});

// Auth
app.post("/api/auth/login", async (req, res) => {
  const { username, pin } = req.body || {};
  if(!username || !pin) return res.status(400).json({ error: "missing_fields" });

  const r = await pool.query("SELECT * FROM users WHERE username=$1 AND is_active=TRUE", [String(username).toLowerCase()]);
  if(!r.rowCount) return res.status(401).json({ error: "invalid_credentials" });

  const user = r.rows[0];
  const ok = await bcrypt.compare(String(pin), user.pin_hash);
  if(!ok) return res.status(401).json({ error: "invalid_credentials" });

  res.json({ token: signToken(user), user: { id: user.id, username: user.username, displayName: user.display_name, role: user.role }});
});


app.get("/api/auth/me", authRequired, async (req, res) => {
  const r = await pool.query(
    "SELECT id, username, display_name, role, is_active FROM users WHERE id=$1 LIMIT 1",
    [req.user.sub]
  );
  if(!r.rowCount) return res.status(404).json({ error: "not_found" });
  const user = r.rows[0];
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    isActive: user.is_active
  });
});

// Bootstrap: create first admin if none exists
app.post("/api/admin/bootstrap", async (req, res) => {
  const { username, displayName, pin } = req.body || {};
  if(!username || !displayName || !pin) return res.status(400).json({ error: "missing_fields" });

  const exists = await pool.query("SELECT 1 FROM users WHERE role='ADMIN' LIMIT 1");
  if(exists.rowCount) return res.status(409).json({ error: "admin_exists" });

  const hash = await bcrypt.hash(String(pin), 10);
  const u = await pool.query(
    "INSERT INTO users(username, display_name, pin_hash, role) VALUES($1,$2,$3,'ADMIN') RETURNING id, username, display_name, role",
    [String(username).toLowerCase(), String(displayName), hash]
  );
  res.json({ ok: true, admin: u.rows[0] });
});

// Admin: users
app.get("/api/admin/users", authRequired, requireRole("ADMIN"), async (req, res) => {
  const r = await pool.query("SELECT id, username, display_name, role, is_active, created_at FROM users ORDER BY created_at DESC");
  res.json(r.rows);
});

app.post("/api/admin/users", authRequired, requireRole("ADMIN"), async (req, res) => {
  const { username, displayName, pin, role } = req.body || {};
  if(!username || !displayName || !pin || !role) return res.status(400).json({ error: "missing_fields" });
  if(!["ADMIN","BARBACK"].includes(role)) return res.status(400).json({ error: "bad_role" });

  const hash = await bcrypt.hash(String(pin), 10);
  const r = await pool.query(
    "INSERT INTO users(username, display_name, pin_hash, role) VALUES($1,$2,$3,$4) RETURNING id, username, display_name, role, is_active, created_at",
    [String(username).toLowerCase(), String(displayName), hash, role]
  );
  res.json(r.rows[0]);
});

// Admin: items
app.get("/api/items", authRequired, async (req, res) => {
  const r = await pool.query("SELECT id, name, category, barcode FROM items ORDER BY name ASC");
  res.json(r.rows);
});

app.post("/api/admin/items", authRequired, requireRole("ADMIN"), async (req, res) => {
  const { name, category, barcode } = req.body || {};
  if(!name) return res.status(400).json({ error: "missing_name" });
  const r = await pool.query(
    "INSERT INTO items(name, category, barcode) VALUES($1,$2,$3) RETURNING id, name, category, barcode",
    [String(name), category ? String(category) : null, barcode ? String(barcode) : null]
  );
  res.json(r.rows[0]);
});

// Admin: bars & stations
app.get("/api/bars", authRequired, async (req, res) => {
  const bars = await pool.query("SELECT id, name FROM bars ORDER BY name ASC");
  const stations = await pool.query("SELECT id, bar_id, name FROM stations ORDER BY name ASC");
  res.json({ bars: bars.rows, stations: stations.rows });
});

app.post("/api/admin/bars", authRequired, requireRole("ADMIN"), async (req, res) => {
  const { name } = req.body || {};
  if(!name) return res.status(400).json({ error: "missing_name" });
  const r = await pool.query("INSERT INTO bars(name) VALUES($1) RETURNING id, name", [String(name)]);
  res.json(r.rows[0]);
});

app.post("/api/admin/stations", authRequired, requireRole("ADMIN"), async (req, res) => {
  const { barId, name } = req.body || {};
  if(!barId || !name) return res.status(400).json({ error: "missing_fields" });
  const r = await pool.query("INSERT INTO stations(bar_id, name) VALUES($1,$2) RETURNING id, bar_id, name", [barId, String(name)]);
  res.json(r.rows[0]);
});

// Nights
function dateKeyFromIso(iso){
  // accept YYYY-MM-DD
  return String(iso || "").slice(0,10);
}

app.post("/api/night/open", authRequired, async (req, res) => {
  const { dateKey } = req.body || {};
  const key = dateKeyFromIso(dateKey) || new Date().toISOString().slice(0,10);
  const r = await pool.query(
    "INSERT INTO nights(date_key) VALUES($1) ON CONFLICT(date_key) DO UPDATE SET date_key=EXCLUDED.date_key RETURNING id, date_key",
    [key]
  );
  res.json(r.rows[0]);
});

// Events: create (BARBACK can only create, ADMIN can create too)
app.post("/api/events", authRequired, async (req, res) => {
  const { nightId, type, barId, stationId, itemId, barcode, qty, note } = req.body || {};
  if(!nightId || !type) return res.status(400).json({ error: "missing_fields" });
  if(!["REQUEST","DELIVERED","RETURNED"].includes(type)) return res.status(400).json({ error: "bad_type" });

  // BARBACK restriction: must not set itemId unless provided; okay
  const q = Number(qty || 1);
  if(!Number.isFinite(q) || q <= 0) return res.status(400).json({ error: "bad_qty" });

  // Auto-resolve itemId by barcode if provided
  let resolvedItemId = itemId || null;
  let resolvedBarcode = barcode || null;
  if(!resolvedItemId && resolvedBarcode){
    const it = await pool.query("SELECT id FROM items WHERE barcode=$1", [String(resolvedBarcode)]);
    if(it.rowCount) resolvedItemId = it.rows[0].id;
  }

  const r = await pool.query(
    `INSERT INTO events(night_id, type, created_by, bar_id, station_id, item_id, barcode, qty, note)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [nightId, type, req.user.sub, barId || null, stationId || null, resolvedItemId, resolvedBarcode, q, note || null]
  );
  res.json(r.rows[0]);
});

// Events: list
app.get("/api/events", authRequired, async (req, res) => {
  const { nightId, status } = req.query;
  if(!nightId) return res.status(400).json({ error: "missing_nightId" });

  if(req.user.role === "BARBACK"){
    const r = await pool.query(
      `SELECT e.*, i.name as item_name, b.name as bar_name, s.name as station_name
       FROM events e
       LEFT JOIN items i ON i.id=e.item_id
       LEFT JOIN bars b ON b.id=e.bar_id
       LEFT JOIN stations s ON s.id=e.station_id
       WHERE e.night_id=$1 AND e.created_by=$2
       ORDER BY e.created_at DESC
       LIMIT 300`,
      [nightId, req.user.sub]
    );
    return res.json(r.rows);
  }

  // ADMIN: can view all
  const params = [nightId];
  let where = "e.night_id=$1";
  if(status){
    params.push(String(status));
    where += ` AND e.status=$${params.length}`;
  }

  const r = await pool.query(
    `SELECT e.*, i.name as item_name, b.name as bar_name, s.name as station_name, u.display_name as created_by_name
     FROM events e
     LEFT JOIN items i ON i.id=e.item_id
     LEFT JOIN bars b ON b.id=e.bar_id
     LEFT JOIN stations s ON s.id=e.station_id
     LEFT JOIN users u ON u.id=e.created_by
     WHERE ${where}
     ORDER BY e.created_at DESC
     LIMIT 1000`,
    params
  );
  res.json(r.rows);
});

// Events: approve/reject (ADMIN only)
app.post("/api/admin/events/:id/decision", authRequired, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body || {};
  if(!["APPROVED","REJECTED"].includes(decision)) return res.status(400).json({ error: "bad_decision" });

  const r = await pool.query(
    `UPDATE events
     SET status=$1, approved_by=$2, approved_at=now()
     WHERE id=$3
     RETURNING *`,
    [decision, req.user.sub, id]
  );
  if(!r.rowCount) return res.status(404).json({ error: "not_found" });
  res.json(r.rows[0]);
});

// Static site
app.use("/", express.static(path.join(__dirname, "public"), { etag: true, maxAge: "1h" }));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log("Inventory MVP listening on", PORT));

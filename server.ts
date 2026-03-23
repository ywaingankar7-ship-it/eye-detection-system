import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("eyepower.db");
db.pragma('foreign_keys = ON');

// Initialize Database (Minimal for legacy support if needed)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'patient'
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    brand TEXT,
    price REAL,
    stock INTEGER,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    customer_name TEXT,
    date TEXT,
    time TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    customer_name TEXT,
    customer_email TEXT,
    date TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS eye_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    customer_name TEXT,
    customer_email TEXT,
    results TEXT,
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const app = express();
app.use(express.json());

// File Upload Setup
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

app.use("/uploads", express.static(uploadDir));

// Fallback for missing uploads - return 404 JSON instead of HTML
app.get("/uploads/*", (req, res) => {
  res.status(404).json({ error: "File not found" });
});

// --- API ROUTES ---

// File Upload (Still used by Inventory.tsx)
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Migration Routes (Read from legacy SQLite)
const migrationTables = [
  { path: 'customers', table: 'customers' },
  { path: 'inventory', table: 'inventory' },
  { path: 'appointments', table: 'appointments' },
  { path: 'prescriptions', table: 'prescriptions' },
  { path: 'eye-tests', table: 'eye_tests' },
  { path: 'notifications', table: 'notifications' }
];

migrationTables.forEach(({ path, table }) => {
  app.get(`/api/${path}`, (req, res) => {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      res.json(rows);
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      res.status(500).json({ error: `Failed to fetch ${table}` });
    }
  });
});

// All other data operations are now handled by Firestore on the frontend.
// The following routes are deprecated and removed to improve performance.

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist/index.html")));
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Based Eye Power Detection Server running on http://localhost:${PORT}`);
  });
}

startServer();

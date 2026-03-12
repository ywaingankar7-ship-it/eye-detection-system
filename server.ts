import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "visionx-secret-key-2026";
const db = new Database("visionx.db");
db.pragma('foreign_keys = ON');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'patient', -- 'admin', 'patient', 'staff'
    branch_id INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    age INTEGER,
    gender TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'frame', 'lens', 'sunglasses'
    brand TEXT,
    model TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    model_url TEXT, -- URL for 3D model (.glb/.gltf)
    base_scale REAL DEFAULT 1.0,
    details TEXT -- JSON string
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS eye_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    results TEXT, -- JSON string
    image_url TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    inventory_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    sph_od TEXT,
    cyl_od TEXT,
    axis_od TEXT,
    sph_os TEXT,
    cyl_os TEXT,
    axis_os TEXT,
    add_power TEXT,
    pd TEXT,
    doctor_notes TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'appointment', 'order'
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// --- MIGRATIONS (Ensure columns exist if table was created earlier) ---
const ensureColumn = (table: string, column: string, type: string) => {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  if (!info.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`Added column ${column} to table ${table}`);
  }
};

ensureColumn('inventory', 'image_url', 'TEXT');
ensureColumn('inventory', 'model_url', 'TEXT');
ensureColumn('inventory', 'base_scale', 'REAL DEFAULT 1.0');
ensureColumn('eye_tests', 'image_url', 'TEXT');
ensureColumn('users', 'role', "TEXT DEFAULT 'patient'");

// Seed Admin if not exists
const adminEmail = "admin@visionx.com";
const adminUser = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);
if (!adminUser) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "VisionX Admin",
    adminEmail,
    hashedPassword,
    "admin"
  );
}

// Seed Patient if not exists
const patientEmail = "patient@visionx.ai";
const patientUser = db.prepare("SELECT * FROM users WHERE email = ?").get(patientEmail);
if (!patientUser) {
  const hashedPassword = bcrypt.hashSync("patient123", 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "John Doe",
    patientEmail,
    hashedPassword,
    "patient"
  );
  
  const newUser: any = db.prepare("SELECT id FROM users WHERE email = ?").get(patientEmail);
  
  // Seed initial notification for patient
  db.prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)").run(
    newUser.id,
    "Welcome to VisionX!",
    "Your account has been successfully created. Start by exploring our inventory or booking an eye test.",
    "info"
  );

  // Seed initial prescription for patient
  db.prepare("INSERT INTO prescriptions (customer_id, date, sph_od, cyl_od, axis_od, sph_os, cyl_os, axis_os, pd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    1, // Assuming first customer is John Doe
    "2024-02-15",
    "-1.25", "-0.50", "180",
    "-1.50", "-0.25", "175",
    "63"
  );
}

// Seed Inventory if empty
// Removed pre-stored items as per user request. 
// Only items added via the admin interface will be stored.
const markerFile = path.join(__dirname, ".inventory_cleared");
if (!fs.existsSync(markerFile)) {
  db.prepare("DELETE FROM inventory").run();
  fs.writeFileSync(markerFile, "true");
  console.log("[SERVER] Pre-stored inventory items cleared.");
}

// Seed Customers if empty
const custCount = db.prepare("SELECT COUNT(*) as count FROM customers").get() as any;
if (custCount.count === 0) {
  const customers = [
    { name: 'John Doe', email: 'patient@visionx.ai', phone: '+1 555 0123', address: '456 Oak Ave, Springfield', age: 25, gender: 'Male' },
    { name: 'Jane Smith', email: 'jane@example.com', phone: '+1 555 0456', address: '789 Pine St, Metropolis', age: 34, gender: 'Female' },
    { name: 'Robert Brown', email: 'robert@example.com', phone: '+1 555 0789', address: '101 Maple Ln, Gotham', age: 62, gender: 'Male' },
  ];
  const stmt = db.prepare("INSERT INTO customers (name, email, phone, address, age, gender) VALUES (?, ?, ?, ?, ?, ?)");
  customers.forEach(c => stmt.run(c.name, c.email, c.phone, c.address, c.age, c.gender));
}

// Seed Appointments if empty
const apptCount = db.prepare("SELECT COUNT(*) as count FROM appointments").get() as any;
if (apptCount.count === 0) {
  const appointments = [
    { customer_id: 1, date: new Date().toISOString().split('T')[0], time: '10:00 AM', status: 'pending', notes: 'Routine checkup' },
    { customer_id: 2, date: new Date().toISOString().split('T')[0], time: '11:30 AM', status: 'approved', notes: 'Lens replacement' },
    { customer_id: 3, date: new Date().toISOString().split('T')[0], time: '02:00 PM', status: 'completed', notes: 'New frame selection' },
  ];
  const stmt = db.prepare("INSERT INTO appointments (customer_id, date, time, status, notes) VALUES (?, ?, ?, ?, ?)");
  appointments.forEach(a => stmt.run(a.customer_id, a.date, a.time, a.status, a.notes));
}

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

// Middleware: Auth
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.log("[AUTH] No token provided");
    return res.status(401).json({ error: "Unauthorized: No token" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log("[AUTH] Authenticated user:", (decoded as any).email);
    next();
  } catch (err) {
    console.error("[AUTH] Token verification failed:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// --- API ROUTES ---

// File Upload
app.post("/api/upload", authenticate, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Auth
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
});

// Register
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
      name, email, hashedPassword, "patient"
    );
    
    const userId = result.lastInsertRowid;
    
    // Also create a customer record
    db.prepare("INSERT INTO customers (name, email) VALUES (?, ?)").run(name, email);
    
    // Welcome notification
    db.prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)").run(
      userId,
      "Welcome to VisionX!",
      "Your account has been successfully created. You can now book appointments and view your eye health records.",
      "info"
    );

    const token = jwt.sign({ id: userId, role: "patient", name }, JWT_SECRET);
    res.json({ token, user: { id: userId, name, role: "patient", email } });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// Customers
app.get("/api/customers", authenticate, (req, res) => {
  const customers = db.prepare("SELECT * FROM customers ORDER BY created_at DESC").all();
  res.json(customers);
});

app.post("/api/customers", authenticate, (req, res) => {
  const { name, email, phone, address, age, gender } = req.body;
  const result = db.prepare("INSERT INTO customers (name, email, phone, address, age, gender) VALUES (?, ?, ?, ?, ?, ?)").run(
    name, email, phone, address, age, gender
  );
  res.json({ id: result.lastInsertRowid });
});

// Analytics & Reports
app.get("/api/analytics/eye-conditions", authenticate, (req, res) => {
  const tests = db.prepare("SELECT results FROM eye_tests").all();
  const stats = { myopia: 0, hyperopia: 0, astigmatism: 0, normal: 0 };
  tests.forEach((t: any) => {
    const results = JSON.parse(t.results);
    const summary = (results.summary || "").toLowerCase();
    if (summary.includes("myopia")) stats.myopia++;
    else if (summary.includes("hyperopia")) stats.hyperopia++;
    else if (summary.includes("astigmatism")) stats.astigmatism++;
    else stats.normal++;
  });
  res.json(stats);
});

app.get("/api/analytics/demographics", authenticate, (req, res) => {
  const genderStats = db.prepare("SELECT gender, COUNT(*) as count FROM customers GROUP BY gender").all();
  const ageStats = db.prepare(`
    SELECT 
      CASE 
        WHEN age < 18 THEN '0-17'
        WHEN age BETWEEN 18 AND 35 THEN '18-35'
        WHEN age BETWEEN 36 AND 60 THEN '36-60'
        ELSE '60+'
      END as age_group,
      COUNT(*) as count 
    FROM customers 
    GROUP BY age_group
  `).all();
  res.json({ gender: genderStats, age: ageStats });
});

app.get("/api/activity-logs", authenticate, (req, res) => {
  const logs = db.prepare(`
    SELECT l.*, u.name as user_name 
    FROM activity_logs l 
    JOIN users u ON l.user_id = u.id 
    ORDER BY l.timestamp DESC 
    LIMIT 100
  `).all();
  res.json(logs);
});

// Patient Portal Endpoints
app.get("/api/patient/appointments", authenticate, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'patient') return res.status(403).json({ error: "Forbidden" });

  const customer = db.prepare("SELECT id FROM customers WHERE email = ?").get(user.email) as any;
  if (!customer) return res.json([]);

  const appointments = db.prepare("SELECT * FROM appointments WHERE customer_id = ? ORDER BY date ASC").all(customer.id);
  res.json(appointments);
});

app.get("/api/patient/tests", authenticate, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'patient') return res.status(403).json({ error: "Forbidden" });

  const customer = db.prepare("SELECT id FROM customers WHERE email = ?").get(user.email) as any;
  if (!customer) return res.json([]);

  const tests = db.prepare("SELECT * FROM eye_tests WHERE customer_id = ? ORDER BY date DESC").all(customer.id);
  res.json(tests);
});

app.get("/api/patient/prescriptions", authenticate, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'patient') return res.status(403).json({ error: "Forbidden" });

  const customer = db.prepare("SELECT id FROM customers WHERE email = ?").get(user.email) as any;
  if (!customer) return res.json([]);

  const prescriptions = db.prepare("SELECT * FROM prescriptions WHERE customer_id = ? ORDER BY date DESC").all(customer.id);
  res.json(prescriptions);
});

app.get("/api/notifications", authenticate, (req, res) => {
  const user = (req as any).user;
  const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC").all(user.id);
  res.json(notifications);
});

app.patch("/api/notifications/:id/read", authenticate, (req, res) => {
  const user = (req as any).user;
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(req.params.id, user.id);
  res.json({ success: true });
});

app.get("/api/cart", authenticate, (req, res) => {
  const user = (req as any).user;
  const cartItems = db.prepare(`
    SELECT c.*, i.brand, i.model, i.price, i.image_url, i.type
    FROM cart c
    JOIN inventory i ON c.inventory_id = i.id
    WHERE c.user_id = ?
  `).all(user.id);
  res.json(cartItems);
});

app.post("/api/cart", authenticate, (req, res) => {
  const user = (req as any).user;
  const { inventory_id, quantity } = req.body;
  
  const existing = db.prepare("SELECT * FROM cart WHERE user_id = ? AND inventory_id = ?").get(user.id, inventory_id) as any;
  
  if (existing) {
    db.prepare("UPDATE cart SET quantity = quantity + ? WHERE id = ?").run(quantity || 1, existing.id);
  } else {
    db.prepare("INSERT INTO cart (user_id, inventory_id, quantity) VALUES (?, ?, ?)").run(user.id, inventory_id, quantity || 1);
  }
  res.json({ success: true });
});

app.delete("/api/cart/:id", authenticate, (req, res) => {
  const user = (req as any).user;
  db.prepare("DELETE FROM cart WHERE id = ? AND user_id = ?").run(req.params.id, user.id);
  res.json({ success: true });
});

// Inventory
app.get("/api/inventory", authenticate, (req, res) => {
  const items = db.prepare("SELECT * FROM inventory").all();
  res.json(items);
});

app.post("/api/inventory", authenticate, (req, res) => {
  try {
    const { type, brand, model, price, stock, image_url, model_url, base_scale, details } = req.body;
    console.log("[SERVER] Adding inventory item:", { brand, model });
    
    const result = db.prepare("INSERT INTO inventory (type, brand, model, price, stock, image_url, model_url, base_scale, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      type, 
      brand, 
      model, 
      price, 
      stock, 
      image_url, 
      model_url, 
      base_scale || 1.0, 
      typeof details === 'string' ? details : JSON.stringify(details)
    );
    res.json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    console.error("[SERVER] Add inventory error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Appointments
app.delete("/api/inventory/:id", authenticate, (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      console.warn(`[SERVER] Unauthorized delete attempt by user: ${user.email}`);
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      console.error("[SERVER] Invalid ID for deletion:", req.params.id);
      return res.status(400).json({ error: "Invalid ID" });
    }

    console.log(`[SERVER] Deleting inventory item ID: ${id}`);
    
    // First remove from cart to avoid foreign key constraint issues
    const cartResult = db.prepare("DELETE FROM cart WHERE inventory_id = ?").run(id);
    console.log(`[SERVER] Removed ${cartResult.changes} items from cart for inventory_id: ${id}`);
    
    const result = db.prepare("DELETE FROM inventory WHERE id = ?").run(id);
    console.log(`[SERVER] Removed ${result.changes} items from inventory for id: ${id}`);
    
    if (result.changes === 0) {
      console.warn(`[SERVER] No item found with ID: ${id} to delete`);
      return res.status(404).json({ error: "Item not found" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("[SERVER] Delete inventory error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/inventory/:id", authenticate, (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const { type, brand, model, price, stock, image_url, model_url, base_scale, details } = req.body;
    
    console.log(`[SERVER] Updating inventory item ID: ${id}`, { brand, model });
    
    const result = db.prepare(`
      UPDATE inventory 
      SET type = ?, brand = ?, model = ?, price = ?, stock = ?, image_url = ?, model_url = ?, base_scale = ?, details = ? 
      WHERE id = ?
    `).run(
      type, 
      brand, 
      model, 
      price, 
      stock, 
      image_url, 
      model_url, 
      base_scale || 1.0, 
      typeof details === 'string' ? details : JSON.stringify(details), 
      id
    );
    
    if (result.changes === 0) {
      console.warn(`[SERVER] Update failed: No item found with ID: ${id}`);
      return res.status(404).json({ error: "Item not found" });
    }
    
    console.log(`[SERVER] Successfully updated item ID: ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error("[SERVER] Update inventory error:", err);
    res.status(500).json({ error: "Internal server error: " + (err as Error).message });
  }
});

app.get("/api/appointments", authenticate, (req, res) => {
  const appointments = db.prepare(`
    SELECT a.*, c.name as customer_name, c.email as customer_email
    FROM appointments a 
    JOIN customers c ON a.customer_id = c.id 
    ORDER BY a.date ASC, a.time ASC
  `).all();
  res.json(appointments);
});

app.delete("/api/customers/:id", authenticate, (req, res) => {
  db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/appointments", authenticate, (req, res) => {
  const { customer_id, date, time, notes } = req.body;
  const result = db.prepare("INSERT INTO appointments (customer_id, date, time, notes) VALUES (?, ?, ?, ?)").run(
    customer_id, date, time, notes
  );
  res.json({ id: result.lastInsertRowid });
});

app.patch("/api/appointments/:id", authenticate, (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ success: true });
});

// Prescriptions
app.get("/api/prescriptions", authenticate, (req, res) => {
  const prescriptions = db.prepare(`
    SELECT p.*, c.name as customer_name 
    FROM prescriptions p
    JOIN customers c ON p.customer_id = c.id 
    ORDER BY p.date DESC
  `).all();
  res.json(prescriptions);
});

app.post("/api/prescriptions", authenticate, (req, res) => {
  const { customer_id, date, sph_od, cyl_od, axis_od, sph_os, cyl_os, axis_os, add_power, pd, doctor_notes } = req.body;
  const result = db.prepare(`
    INSERT INTO prescriptions (customer_id, date, sph_od, cyl_od, axis_od, sph_os, cyl_os, axis_os, add_power, pd, doctor_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(customer_id, date, sph_od, cyl_od, axis_od, sph_os, cyl_os, axis_os, add_power, pd, doctor_notes);
  res.json({ id: result.lastInsertRowid });
});

// Manual Eye Test & AI Result Storage
app.get("/api/eye-tests", authenticate, (req, res) => {
  const tests = db.prepare(`
    SELECT t.*, c.name as customer_name 
    FROM eye_tests t 
    JOIN customers c ON t.customer_id = c.id 
    ORDER BY t.date DESC
  `).all();
  res.json(tests);
});

app.post("/api/customers/test", authenticate, (req, res) => {
  const { customer_id, results } = req.body;
  const result = db.prepare("INSERT INTO eye_tests (customer_id, results) VALUES (?, ?)").run(
    customer_id, JSON.stringify(results)
  );
  res.json({ id: result.lastInsertRowid });
});

// Analytics
app.get("/api/analytics", authenticate, (req, res) => {
  const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM customers").get() as any;
  const lowStock = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE stock < 5").get() as any;
  const appointmentsToday = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE date = date('now')").get() as any;
  const aiTests = db.prepare("SELECT COUNT(*) as count FROM eye_tests").get() as any;

  res.json({
    stats: {
      totalCustomers: totalCustomers.count,
      lowStock: lowStock.count,
      appointmentsToday: appointmentsToday.count,
      aiTests: aiTests.count
    }
  });
});

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
    console.log(`VisionX Server running on http://localhost:${PORT}`);
  });
}

startServer();

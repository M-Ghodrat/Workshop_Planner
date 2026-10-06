import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import {
  INITIAL_USERS,
  INITIAL_SERIES,
  INITIAL_WORKSHOPS,
  INITIAL_COURSES,
  INITIAL_MAPPINGS,
  INITIAL_MATERIALS,
} from './src/data/initialData';

// Parse port from CLI flags or environment variable
let PORT = 3000;
const portArgIdx = process.argv.indexOf('--port');
if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
  const p = parseInt(process.argv[portArgIdx + 1], 10);
  if (!isNaN(p)) PORT = p;
} else if (process.env.PORT) {
  const p = parseInt(process.env.PORT, 10);
  if (!isNaN(p)) PORT = p;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

interface DatabaseSchema {
  users: any[];
  series: any[];
  workshops: any[];
  courses: any[];
  mappings: any[];
  materials: any[];
  deletedSeriesIds: string[];
  deletedWorkshopIds: string[];
  version: number;
}

// In-memory database cache
let db: DatabaseSchema = {
  users: INITIAL_USERS,
  series: INITIAL_SERIES,
  workshops: INITIAL_WORKSHOPS,
  courses: INITIAL_COURSES,
  mappings: INITIAL_MAPPINGS,
  materials: INITIAL_MATERIALS,
  deletedSeriesIds: [],
  deletedWorkshopIds: [],
  version: 2,
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load database from disk or initialize
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.series) && Array.isArray(parsed.courses)) {
        const deletedSeries = Array.isArray(parsed.deletedSeriesIds) ? parsed.deletedSeriesIds : [];
        const deletedWorkshops = Array.isArray(parsed.deletedWorkshopIds) ? parsed.deletedWorkshopIds : [];

        db = {
          users: parsed.users || INITIAL_USERS,
          series: (parsed.series || []).filter((s: any) => s && s.id && !deletedSeries.includes(s.id)),
          workshops: (parsed.workshops || []).filter((w: any) => w && w.id && !deletedWorkshops.includes(w.id)),
          courses: parsed.courses || INITIAL_COURSES,
          mappings: parsed.mappings || [],
          materials: parsed.materials || [],
          deletedSeriesIds: deletedSeries,
          deletedWorkshopIds: deletedWorkshops,
          version: parsed.version || 2,
        };
        console.log(`[Database] Loaded persistent database from ${DB_FILE} with ${db.series.length} series, ${db.workshops.length} workshops, and ${db.courses.length} courses.`);
        return;
      }
    }
  } catch (err) {
    console.error('[Database] Failed to read database.json, initializing defaults:', err);
  }

  // Initialize with initialData
  db = {
    users: INITIAL_USERS,
    series: INITIAL_SERIES,
    workshops: INITIAL_WORKSHOPS,
    courses: INITIAL_COURSES,
    mappings: INITIAL_MAPPINGS,
    materials: INITIAL_MATERIALS,
    deletedSeriesIds: [],
    deletedWorkshopIds: [],
    version: 2,
  };
  saveDatabase();
  console.log(`[Database] Initialized new persistent database at ${DB_FILE}`);
}

// Save database atomically to disk
function saveDatabase() {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Database] Failed to write database.json:', err);
  }
}

// Initialize on startup
loadDatabase();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // --- API Endpoints ---
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      seriesCount: db.series.length,
      coursesCount: db.courses.length,
      workshopsCount: db.workshops.length,
      version: db.version,
    });
  });

  // Series
  app.get('/api/series', (_req: Request, res: Response) => {
    res.json(db.series);
  });

  app.post('/api/series', (req: Request, res: Response) => {
    const newSeries = req.body;
    if (!newSeries.id) {
      newSeries.id = `series-${Date.now()}`;
    }
    const idx = db.series.findIndex((s) => s.id === newSeries.id);
    if (idx >= 0) {
      db.series[idx] = { ...db.series[idx], ...newSeries, updatedAt: new Date().toISOString() };
    } else {
      db.series.unshift({ ...newSeries, createdAt: new Date().toISOString() });
    }
    db.deletedSeriesIds = db.deletedSeriesIds.filter((id) => id !== newSeries.id);
    saveDatabase();
    res.json(newSeries);
  });

  app.put('/api/series/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const idx = db.series.findIndex((s) => s.id === id);
    if (idx >= 0) {
      db.series[idx] = { ...db.series[idx], ...updates, updatedAt: new Date().toISOString() };
      saveDatabase();
      res.json(db.series[idx]);
    } else {
      const created = { id, ...updates, createdAt: new Date().toISOString() };
      db.series.unshift(created);
      saveDatabase();
      res.json(created);
    }
  });

  app.delete('/api/series/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.series = db.series.filter((s) => s.id !== id);
    if (!db.deletedSeriesIds.includes(id)) {
      db.deletedSeriesIds.push(id);
    }
    saveDatabase();
    res.json({ success: true, deletedId: id });
  });

  // Workshops
  app.get('/api/workshops', (_req: Request, res: Response) => {
    res.json(db.workshops);
  });

  app.post('/api/workshops', (req: Request, res: Response) => {
    const newWorkshop = req.body;
    if (!newWorkshop.id) {
      newWorkshop.id = `ws-${Date.now()}`;
    }
    const idx = db.workshops.findIndex((w) => w.id === newWorkshop.id);
    if (idx >= 0) {
      db.workshops[idx] = { ...db.workshops[idx], ...newWorkshop, updatedAt: new Date().toISOString() };
    } else {
      db.workshops.unshift({ ...newWorkshop, createdAt: new Date().toISOString() });
    }
    db.deletedWorkshopIds = db.deletedWorkshopIds.filter((id) => id !== newWorkshop.id);
    saveDatabase();
    res.json(newWorkshop);
  });

  app.put('/api/workshops/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const idx = db.workshops.findIndex((w) => w.id === id);
    if (idx >= 0) {
      db.workshops[idx] = { ...db.workshops[idx], ...updates, updatedAt: new Date().toISOString() };
      saveDatabase();
      res.json(db.workshops[idx]);
    } else {
      const created = { id, ...updates, createdAt: new Date().toISOString() };
      db.workshops.unshift(created);
      saveDatabase();
      res.json(created);
    }
  });

  app.delete('/api/workshops/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.workshops = db.workshops.filter((w) => w.id !== id);
    if (!db.deletedWorkshopIds.includes(id)) {
      db.deletedWorkshopIds.push(id);
    }
    saveDatabase();
    res.json({ success: true, deletedId: id });
  });

  // Courses
  app.get('/api/courses', (_req: Request, res: Response) => {
    res.json(db.courses);
  });

  app.post('/api/courses', (req: Request, res: Response) => {
    const newCourse = req.body;
    if (!newCourse.id) {
      newCourse.id = `course-${Date.now()}`;
    }
    const idx = db.courses.findIndex((c) => c.id === newCourse.id);
    if (idx >= 0) {
      db.courses[idx] = { ...db.courses[idx], ...newCourse, updatedAt: new Date().toISOString() };
    } else {
      db.courses.unshift({ ...newCourse, createdAt: new Date().toISOString() });
    }
    saveDatabase();
    res.json(newCourse);
  });

  app.put('/api/courses/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const idx = db.courses.findIndex((c) => c.id === id);
    if (idx >= 0) {
      db.courses[idx] = { ...db.courses[idx], ...updates, updatedAt: new Date().toISOString() };
      saveDatabase();
      res.json(db.courses[idx]);
    } else {
      const created = { id, ...updates, createdAt: new Date().toISOString() };
      db.courses.unshift(created);
      saveDatabase();
      res.json(created);
    }
  });

  app.delete('/api/courses/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.courses = db.courses.filter((c) => c.id !== id);
    db.mappings = db.mappings.filter((m) => m.courseId !== id);
    saveDatabase();
    res.json({ success: true, deletedId: id });
  });

  // Mappings
  app.get('/api/mappings', (_req: Request, res: Response) => {
    res.json(db.mappings);
  });

  app.post('/api/mappings', (req: Request, res: Response) => {
    const newMapping = req.body;
    if (!newMapping.id) {
      newMapping.id = `map-${Date.now()}`;
    }
    const idx = db.mappings.findIndex((m) => m.id === newMapping.id);
    if (idx >= 0) {
      db.mappings[idx] = { ...db.mappings[idx], ...newMapping };
    } else {
      db.mappings.unshift(newMapping);
    }
    saveDatabase();
    res.json(newMapping);
  });

  app.put('/api/mappings/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const idx = db.mappings.findIndex((m) => m.id === id);
    if (idx >= 0) {
      db.mappings[idx] = { ...db.mappings[idx], ...updates };
      saveDatabase();
      res.json(db.mappings[idx]);
    } else {
      const created = { id, ...updates };
      db.mappings.unshift(created);
      saveDatabase();
      res.json(created);
    }
  });

  app.delete('/api/mappings/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.mappings = db.mappings.filter((m) => m.id !== id);
    saveDatabase();
    res.json({ success: true, deletedId: id });
  });

  // Materials
  app.get('/api/materials', (_req: Request, res: Response) => {
    res.json(db.materials);
  });

  app.post('/api/materials', (req: Request, res: Response) => {
    const newMat = req.body;
    if (!newMat.id) {
      newMat.id = `mat-${Date.now()}`;
    }
    db.materials.unshift(newMat);
    saveDatabase();
    res.json(newMat);
  });

  app.delete('/api/materials/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.materials = db.materials.filter((m) => m.id !== id);
    saveDatabase();
    res.json({ success: true, deletedId: id });
  });

  // Users
  app.get('/api/users', (_req: Request, res: Response) => {
    res.json(db.users);
  });

  app.post('/api/users', (req: Request, res: Response) => {
    const user = req.body;
    const idx = db.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      db.users[idx] = { ...db.users[idx], ...user };
    } else {
      db.users.push(user);
    }
    saveDatabase();
    res.json(user);
  });

  // Database snapshot and reset
  app.get('/api/database', (_req: Request, res: Response) => {
    res.json(db);
  });

  app.post('/api/reset-database', (_req: Request, res: Response) => {
    db = {
      users: INITIAL_USERS,
      series: INITIAL_SERIES,
      workshops: INITIAL_WORKSHOPS,
      courses: INITIAL_COURSES,
      mappings: INITIAL_MAPPINGS,
      materials: INITIAL_MATERIALS,
      deletedSeriesIds: [],
      deletedWorkshopIds: [],
      version: Date.now(),
    };
    saveDatabase();
    res.json({ success: true, message: 'Database reset to canonical curriculum' });
  });

  // In development, mount Vite's dev server middleware
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      port: PORT,
      host: '0.0.0.0',
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Full-stack application running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authenticateAdmin } from '../lib/auth.js';
import { readConfig, writeConfig, readSchedule, writeSchedule } from '../lib/jsonStore.js';
import { setSimulationTime, getSimulationTime, clearSimulationTime, setSimulationSpeed, getSimulationSpeed } from '../lib/time.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(ROOT_DIR, 'content', 'media');
const router = express.Router();

// Admin authentication middleware
const requireAdminAuth = (req, res, next) => {
  if (!req.session.adminLoggedIn) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (await authenticateAdmin(username, password)) {
      req.session.adminLoggedIn = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid admin credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  req.session.adminLoggedIn = false;
  res.json({ success: true });
});

// Config management
router.get('/config', requireAdminAuth, async (req, res) => {
  try {
    const config = await readConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

router.put('/config', requireAdminAuth, async (req, res) => {
  try {
    await writeConfig(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Schedule management
router.get('/schedule', requireAdminAuth, async (req, res) => {
  try {
    const schedule = await readSchedule();
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read schedule' });
  }
});

router.put('/schedule', requireAdminAuth, async (req, res) => {
  try {
    await writeSchedule(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// File upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, MEDIA_DIR);      // eskiden 'content/media/' idi
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: (process.env.MAX_UPLOAD_MB || 50) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Görsel + Video + Ses uzantılarını destekle
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mov|mp3|wav|m4a|ogg|flac|aac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, video, and audio files are allowed'));
    }
  }
});

router.post('/upload', requireAdminAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({ 
    success: true, 
    path: `/content/media/${req.file.filename}`,
    filename: req.file.filename 
  });
});

// Simulation time management
router.get('/sim-time', requireAdminAuth, (req, res) => {
  const simTime = getSimulationTime();
  const simSpeed = getSimulationSpeed();
  res.json({ previewAtIso: simTime, speed: simSpeed });
});

router.post('/sim-time', requireAdminAuth, (req, res) => {
  const { previewAtIso, speed } = req.body;
  
  if (previewAtIso) {
    setSimulationTime(previewAtIso);
    if (speed !== undefined) {
      setSimulationSpeed(parseFloat(speed));
    }
  } else {
    clearSimulationTime();
  }
  
  res.json({ success: true, previewAtIso: getSimulationTime(), speed: getSimulationSpeed() });
});

// New endpoint to set simulation speed
router.post('/set-sim-speed', requireAdminAuth, (req, res) => {
  const { speed } = req.body;
  if (speed === undefined || isNaN(parseFloat(speed))) {
    return res.status(400).json({ error: 'Invalid speed value' });
  }
  setSimulationSpeed(parseFloat(speed));
  res.json({ success: true, speed: getSimulationSpeed(), previewAtIso: getSimulationTime() });
});

// Advance simulation time
router.post('/advance-sim-time', requireAdminAuth, async (req, res) => {
  const { unit, amount } = req.body;

  let currentSimTimeIso = getSimulationTime();
  if (!currentSimTimeIso) {
    currentSimTimeIso = new Date().toISOString();
  }

  let newTime = new Date(currentSimTimeIso);

  if (unit === 'hour') {
    newTime.setHours(newTime.getHours() + amount);
  } else if (unit === 'day') {
    newTime.setDate(newTime.getDate() + amount);
  } else {
    return res.status(400).json({ error: 'Invalid unit for advancing time' });
  }

  setSimulationTime(newTime.toISOString());
  res.json({ success: true, previewAtIso: getSimulationTime(), speed: getSimulationSpeed() });
});

export default router;
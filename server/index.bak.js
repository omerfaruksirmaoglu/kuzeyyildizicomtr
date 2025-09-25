import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { getSchedule, isSlotAccessible } from './lib/time.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 8000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Middleware
app.use(express.json({ limit: `${process.env.MAX_UPLOAD_MB || 50}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${process.env.MAX_UPLOAD_MB || 50}mb` }));

// Static files
app.use(express.static(path.join(ROOT_DIR, 'public')));
app.use('/content', express.static(path.join(ROOT_DIR, 'content')));

// Routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Default route - check session and redirect appropriately
app.get('/', async (req, res) => {
  if (!req.session.userLoggedIn) {
    return res.redirect('/login.html');
  }
  
  // Check if in gift mode AND if the 00:00 content is NOT yet accessible
  const schedule = await getSchedule();
  const giftEntry = schedule.find(entry => entry.atIso === "2025-09-29T00:00:00+03:00");
  
  let giftContentAccessible = false;
  if (giftEntry) {
    giftContentAccessible = isSlotAccessible(giftEntry);
  }

  if (req.session.giftMode && !giftContentAccessible) {
    // If giftMode is active AND the gift content is not yet accessible, stay on index.html
    return res.redirect('/index.html');
  }
  
  // Otherwise (not in gift mode, or gift mode is active but content is accessible), go to app.html
  res.redirect('/app.html');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🎉 Romantic Surprise App running on http://localhost:${PORT}`);
  console.log(`📅 Timeline: ${process.env.START_AT_ISO} → ${process.env.END_AT_ISO}`);
});
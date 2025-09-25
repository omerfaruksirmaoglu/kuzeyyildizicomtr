import express from 'express';
import { getCurrentServerTime, getCurrentSlot, getSchedule, isSlotAccessible, getTimeToStart, getTimeToNextMidnight, isSimulationActive, getSimulationSpeed } from '../lib/time.js';
import { authenticateUser } from '../lib/auth.js';
import { readConfig } from '../lib/jsonStore.js';

const router = express.Router();

// Public time endpoint
router.get('/server-time', (req, res) => {
  const { nowIso, tz } = getCurrentServerTime();
  res.json({ nowIso, tz });
});

// Public schedule endpoint (for client-side filtering)
router.get('/schedule', async (req, res) => {
  try {
    const schedule = await getSchedule();
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get schedule' });
  }
});

// Current accessible slot
router.get('/current-slot', async (req, res) => {
  try {
    const schedule = await getSchedule();
    const currentSlot = await getCurrentSlot(schedule);
    res.json({
      ...currentSlot,
      simulationSpeed: getSimulationSpeed()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get current slot' });
  }
});

// Get specific entry if accessible
router.get('/entry', async (req, res) => {
  try {
    const index = parseInt(req.query.index);
    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid index' });
    }

    const schedule = await getSchedule();
    const entry = schedule[index];
    
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Check server-side access
    if (!isSlotAccessible(entry)) {
      return res.status(403).json({ error: 'Entry not yet accessible' });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get entry' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (await authenticateUser(username, password)) {
      req.session.userLoggedIn = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// User logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Check login status
router.get('/auth-status', (req, res) => {
  const responseData = {
    loggedIn: !!req.session.userLoggedIn,
    giftMode: !!req.session.giftMode,
    simMode: isSimulationActive()
  };
  
  // If there's a specific post-answer message for gift mode, include it
  if (req.session.postAnswerMessageForGiftMode) {
    responseData.postAnswerMessageForGiftMode = req.session.postAnswerMessageForGiftMode;
    // Clear the message from session after sending it once
    delete req.session.postAnswerMessageForGiftMode;
  }
  
  res.json(responseData);
});

// Countdown data for index.html
router.get('/countdown-data', async (req, res) => {
  try {
    let msToNext;
    let nextEntryIso = null;
    
    if (req.session.giftMode) {
      // In gift mode, countdown to the specific 29 Eylül 00:00:00 entry
      const { timestamp } = getCurrentServerTime();
      const giftModeTargetTime = new Date("2025-09-29T00:00:00+03:00").getTime();
      msToNext = Math.max(0, giftModeTargetTime - timestamp);
      nextEntryIso = "2025-09-29T00:00:00+03:00";
    } else {
      // Normal mode, countdown to start time  
      msToNext = getTimeToStart();
      const config = await readConfig();
      nextEntryIso = config.startAtIso;
    }
    
    res.json({ msToNext, nextEntryIso });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get countdown data' });
  }
});

// Special password check (17:00 slot)
router.post('/check-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    // Normalize the input
    const normalized = password.trim()
      .replace(/\s+/g, ' ')
      .normalize('NFC')
      .toUpperCase();
    
    const correctAnswer = "İYİ Kİ DOĞDUN SEVGİLİM";
    
    if (normalized === correctAnswer) {
      req.session.giftMode = true;
      
      // Find the specific entry to get its postAnswerMessage
      const schedule = await getSchedule();
      const giftModeEntry = schedule.find(entry => entry.answer === correctAnswer);
      
      if (giftModeEntry && giftModeEntry.postAnswerMessage) {
        req.session.postAnswerMessageForGiftMode = giftModeEntry.postAnswerMessage;
      }
      
      const config = await readConfig();
      res.json({ 
        success: true, 
        giftMessage: config.giftMessage 
      });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to check password' });
  }
});

export default router;
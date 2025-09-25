// Global variables for simulation state
let _simulationBaseTime = null; // Real time when simulation started (Date object)
let _simulationOffsetMs = 0;    // Simulated time at _simulationBaseTime (milliseconds since epoch)
let _simulationSpeedMultiplier = 1; // How fast simulated time passes relative to real time

export function setSimulationTime(isoString) {
  _simulationBaseTime = new Date(); // Capture current real time
  _simulationOffsetMs = new Date(isoString).getTime(); // Capture the desired simulated time
}

export function setSimulationSpeed(multiplier) {
  // When changing speed, we need to re-calculate the offset to maintain continuity
  if (_simulationBaseTime !== null) {
    const currentSimulatedTime = getCurrentServerTime().timestamp;
    _simulationBaseTime = new Date(); // Reset base time to now
    _simulationOffsetMs = currentSimulatedTime; // Set offset to the current simulated time
  }
  _simulationSpeedMultiplier = multiplier;
}

export function getSimulationTime() {
  if (_simulationBaseTime === null) {
    return null; // No simulation active
  }
  // Calculate current simulated time
  const realElapsedTimeMs = new Date().getTime() - _simulationBaseTime.getTime();
  const simulatedElapsedTimeMs = realElapsedTimeMs * _simulationSpeedMultiplier;
  const currentSimulatedTimestamp = _simulationOffsetMs + simulatedElapsedTimeMs;
  return new Date(currentSimulatedTimestamp).toISOString();
}

export function getSimulationSpeed() {
  return _simulationSpeedMultiplier;
}

export function isSimulationActive() {
  return _simulationBaseTime !== null;
}

export function clearSimulationTime() {
  _simulationBaseTime = null;
  _simulationOffsetMs = 0;
  _simulationSpeedMultiplier = 1;
}

export function getCurrentServerTime() {
  const now = isSimulationActive() ? new Date(getSimulationTime()) : new Date();
  const tz = process.env.TIMEZONE || 'Europe/Istanbul';
  
  return {
    nowIso: now.toISOString(),
    tz: tz,
    timestamp: now.getTime()
  };
}

export function isSlotAccessible(entry) {
  const { timestamp } = getCurrentServerTime();
  const entryTime = new Date(entry.atIso).getTime();
  return entryTime <= timestamp;
}

export async function getCurrentSlot(schedule) {
  const { nowIso, timestamp } = getCurrentServerTime();
  
  // Filter accessible entries
  const accessibleEntries = schedule.filter(entry => isSlotAccessible(entry));
  
  if (accessibleEntries.length === 0) {
    const nextSlotInfo = getTimeToNextSlot(schedule, timestamp);
    return {
      index: -1,
      current: null,
      msToNext: nextSlotInfo.msToNext,
      nextEntryIso: nextSlotInfo.nextEntryIso
    };
  }
  
  // Get the latest accessible entry
  const latestEntry = accessibleEntries[accessibleEntries.length - 1];
  const latestIndex = schedule.findIndex(entry => entry.atIso === latestEntry.atIso);
  
  const nextSlotInfo = getTimeToNextSlot(schedule, timestamp);
  return {
    index: latestIndex,
    current: latestEntry,
    msToNext: nextSlotInfo.msToNext,
    nextEntryIso: nextSlotInfo.nextEntryIso
  };
}

function getTimeToNextSlot(schedule, currentTimestamp) {
  const nextEntry = schedule.find(entry => {
    const entryTime = new Date(entry.atIso).getTime();
    return entryTime > currentTimestamp;
  });
  
  if (!nextEntry) {
    return { msToNext: 0, nextEntryIso: null }; // No next slot
  }
  
  return {
    msToNext: new Date(nextEntry.atIso).getTime() - currentTimestamp,
    nextEntryIso: nextEntry.atIso
  };
}

export function getTimeToStart() {
  const startTime = new Date(process.env.START_AT_ISO).getTime();
  const { timestamp } = getCurrentServerTime();
  return Math.max(0, startTime - timestamp);
}

export function getTimeToEnd() {
  const endTime = new Date(process.env.END_AT_ISO).getTime();
  const { timestamp } = getCurrentServerTime();
  return Math.max(0, endTime - timestamp);
}

export function getTimeToNextMidnight() {
  const { timestamp } = getCurrentServerTime();
  const currentDate = new Date(timestamp);
  
  // Get next midnight
  const nextMidnight = new Date(currentDate);
  nextMidnight.setHours(24, 0, 0, 0); // Next day at 00:00:00
  
  return Math.max(0, nextMidnight.getTime() - timestamp);
}

// Import schedule helper
import { readSchedule } from './jsonStore.js';

export async function getSchedule() {
  return await readSchedule();
}
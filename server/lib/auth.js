import rateLimit from 'express-rate-limit';

// Rate limiting for login attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Unicode-safe string normalization and comparison
function normalizeString(str) {
  return str.trim().normalize('NFC');
}

function compareStrings(str1, str2) {
  return normalizeString(str1).toLowerCase() === normalizeString(str2).toLowerCase();
}

// User authentication
export async function authenticateUser(username, password) {
  const expectedUsername = process.env.USER_LOGIN_NAME || 'kuzeyyıldızı';
  const expectedPassword = process.env.USER_LOGIN_PASS || '1425925';
  
  return compareStrings(username, expectedUsername) && 
         compareStrings(password, expectedPassword);
}

// Admin authentication
export async function authenticateAdmin(username, password) {
  const expectedUsername = process.env.LOGIN_USER || 'admin';
  const expectedPassword = process.env.LOGIN_PASS || 'admin123';
  
  return compareStrings(username, expectedUsername) && 
         compareStrings(password, expectedPassword);
}
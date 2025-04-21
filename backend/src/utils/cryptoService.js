const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration for our encryption algorithms
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'; // Using AES with Galois/Counter Mode for authenticated encryption
const IV_LENGTH = 16; // Initialization Vector length (16 bytes = 128 bits)
const KEY_LENGTH = 32; // Key length (32 bytes = 256 bits)
const AUTH_TAG_LENGTH = 16; // Authentication tag length

// Directory for storing encryption keys
const KEY_DIR = path.join(__dirname, '../../keys');

// Ensure the keys directory exists
if (!fs.existsSync(KEY_DIR)) {
  fs.mkdirSync(KEY_DIR, { recursive: true });
}

/**
 * Generates a random encryption key
 * @returns {Buffer} A random 256-bit key
 */
const generateEncryptionKey = () => {
  return crypto.randomBytes(KEY_LENGTH);
};

/**
 * Encrypt data using AES-256-GCM
 * @param {Object|string} data - The data to encrypt
 * @returns {Object} Object containing encrypted data, IV, auth tag, and key
 */
const encryptData = (data) => {
  // Generate a random key and IV for each encryption operation
  const key = generateEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Convert input data to string if it's an object
  const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
  
  // Create cipher with key and IV
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  // Encrypt the data
  let encrypted = cipher.update(dataString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get the authentication tag produced by GCM
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Return everything needed for decryption
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
    key: key.toString('hex')
  };
};

/**
 * Decrypt data that was encrypted with AES-256-GCM
 * @param {Object} encryptedData - The encrypted data object with encrypted, iv, authTag, and key
 * @returns {Object|string} The decrypted data
 */
const decryptData = (encryptedData) => {
  const { encrypted, iv, authTag, key } = encryptedData;
  
  // Convert hex strings back to buffers
  const keyBuffer = Buffer.from(key, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, keyBuffer, ivBuffer);
  
  // Set the auth tag for verification
  decipher.setAuthTag(authTagBuffer);
  
  // Decrypt the data
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  // Parse JSON if the decrypted data is a JSON string
  try {
    return JSON.parse(decrypted);
  } catch (e) {
    return decrypted;
  }
};

/**
 * Generate a strong vote token
 * @returns {string} A secure random vote token
 */
const generateVoteToken = () => {
  // Generate a shorter 12-byte (96-bit) random value instead of 24-byte
  // This still provides very strong uniqueness (2^96 possibilities)
  const randomHex = crypto.randomBytes(12).toString('hex');
  
  // Format to a more compact token structure
  // Use shorter timestamp format
  const timestamp = Date.now().toString(36); // Base-36 encoding for compactness
  
  return `V-${timestamp}-${randomHex}`;
};

/**
 * Hash data (one-way function) using SHA-256
 * @param {string|Array|Object} data - The data to hash
 * @returns {string} The hex-encoded hash
 */
const hashData = (data) => {
  // Convert data to string if it's not already
  let dataString;
  
  if (typeof data === 'string') {
    dataString = data;
  } else if (Array.isArray(data)) {
    dataString = data.join('|');
  } else if (typeof data === 'object' && data !== null) {
    dataString = JSON.stringify(data);
  } else {
    dataString = String(data);
  }
  
  return crypto.createHash('sha256').update(dataString).digest('hex');
};

/**
 * Create a blind hash of voter ID that cannot be reversed but can be verified
 * @param {string} studentId - The student ID to blind
 * @param {string} electionId - The election ID as a salt
 * @returns {string} A blinded identifier that cannot be traced back to the student
 */
const createBlindedId = (studentId, electionId) => {
  // Combine with a server-side secret for extra security
  const serverSecret = process.env.SERVER_SECRET || 'trustelectSecretSalt';
  
  // Create a HMAC (keyed hash) of the student ID using the election ID and server secret
  return crypto
    .createHmac('sha256', `${electionId}-${serverSecret}`)
    .update(studentId.toString())
    .digest('hex');
};

module.exports = {
  encryptData,
  decryptData,
  generateVoteToken,
  hashData,
  createBlindedId
}; 
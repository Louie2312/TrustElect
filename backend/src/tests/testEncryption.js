/**
 * Test script for vote encryption system
 * 
 * Run with: node src/tests/testEncryption.js
 */

const cryptoService = require('../utils/cryptoService');
const pool = require('../config/db');

async function runEncryptionTests() {
  console.log('=============================');
  console.log('VOTE ENCRYPTION TESTING SUITE');
  console.log('=============================\n');
  
  // Test 1: Basic Encryption/Decryption
  console.log('TEST 1: Basic Encryption/Decryption');
  console.log('-----------------------------------');
  
  const testData = { 
    electionId: 123, 
    studentId: 456, 
    timestamp: new Date().toISOString(),
    selections: [
      { positionId: 1, candidateIds: [101, 102] },
      { positionId: 2, candidateIds: [201] }
    ]
  };
  
  console.log('Original data:', testData);
  
  // Encrypt the data
  console.log('\nEncrypting data...');
  const encrypted = cryptoService.encryptData(testData);
  console.log('Encrypted result:');
  console.log('- Encrypted data length:', encrypted.encrypted.length, 'chars');
  console.log('- IV:', encrypted.iv);
  console.log('- Auth Tag:', encrypted.authTag);
  console.log('- Key length:', encrypted.key.length, 'chars');
  
  // Decrypt the data
  console.log('\nDecrypting data...');
  const decrypted = cryptoService.decryptData(encrypted);
  console.log('Decrypted result:', decrypted);
  
  // Verify decryption matches original
  const matches = JSON.stringify(testData) === JSON.stringify(decrypted);
  console.log('\nDecryption Matches Original:', matches ? '✅ YES' : '❌ NO');
  
  // Test 2: Tamper Resistance
  console.log('\n\nTEST 2: Tamper Resistance');
  console.log('-------------------------');
  
  // Create a tampered version by modifying the encrypted data
  const tampered = { ...encrypted };
  
  // Modify the middle of the encrypted string
  const middle = Math.floor(tampered.encrypted.length / 2);
  const chars = tampered.encrypted.split('');
  chars[middle] = chars[middle] === 'a' ? 'b' : 'a'; // Flip a character
  tampered.encrypted = chars.join('');
  
  console.log('Attempting to decrypt tampered data...');
  try {
    const decryptedTampered = cryptoService.decryptData(tampered);
    console.log('❌ FAIL: Decryption of tampered data succeeded (should have failed)');
  } catch (error) {
    console.log('✅ SUCCESS: Decryption of tampered data failed as expected');
    console.log('Error:', error.message);
  }
  
  // Test 3: Vote Token Generation
  console.log('\n\nTEST 3: Vote Token Generation');
  console.log('-----------------------------');
  
  console.log('Generating 5 vote tokens to verify format and uniqueness:');
  const tokens = [];
  for (let i = 0; i < 5; i++) {
    const token = cryptoService.generateVoteToken();
    tokens.push(token);
    console.log(`Token ${i+1}: ${token} (Length: ${token.length})`);
  }
  
  // Check for duplicates
  const uniqueTokens = new Set(tokens);
  console.log('\nAll tokens unique:', uniqueTokens.size === tokens.length ? '✅ YES' : '❌ NO');
  
  // Test 4: Blinded Voter ID
  console.log('\n\nTEST 4: Blinded Voter ID');
  console.log('-------------------------');
  
  const studentId = '12345';
  const electionId = '789';
  
  const blindedId1 = cryptoService.createBlindedId(studentId, electionId);
  console.log(`Blinded ID for Student ${studentId}, Election ${electionId}:`);
  console.log(blindedId1);
  
  // Verify same inputs produce same output (deterministic)
  const blindedId2 = cryptoService.createBlindedId(studentId, electionId);
  console.log('\nSame inputs produce same blinded ID:', blindedId1 === blindedId2 ? '✅ YES' : '❌ NO');
  
  // Verify different elections produce different blinded IDs
  const blindedId3 = cryptoService.createBlindedId(studentId, '999');
  console.log('Different election produces different ID:', blindedId1 !== blindedId3 ? '✅ YES' : '❌ NO');
  
  // Test 5: Database Connection (if available)
  console.log('\n\nTEST 5: Database Connection');
  console.log('---------------------------');
  
  try {
    console.log('Attempting to connect to database...');
    const client = await pool.connect();
    console.log('✅ SUCCESS: Connected to database');
    
    try {
      // Check if vote_token column is properly sized
      const { rows } = await client.query(`
        SELECT character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'votes' AND column_name = 'vote_token'
      `);
      
      if (rows.length > 0) {
        console.log(`Vote token column maximum length: ${rows[0].character_maximum_length}`);
        // Check if our token size fits
        const testToken = cryptoService.generateVoteToken();
        if (testToken.length <= rows[0].character_maximum_length) {
          console.log(`✅ SUCCESS: Current token (${testToken.length} chars) fits in column (${rows[0].character_maximum_length} chars)`);
        } else {
          console.log(`❌ WARNING: Current token (${testToken.length} chars) is too long for column (${rows[0].character_maximum_length} chars)`);
        }
      } else {
        console.log('❌ WARNING: Could not determine vote_token column length');
      }
    } catch (queryError) {
      console.log('❌ Error checking database schema:', queryError.message);
    }
    
    client.release();
  } catch (dbError) {
    console.log('❌ Error connecting to database:', dbError.message);
    console.log('Skipping database tests');
  }
  
  console.log('\n=============================');
  console.log('ENCRYPTION TESTING COMPLETE');
  console.log('=============================');
}

// Run the tests
runEncryptionTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
  }); 
const axios = require('axios');

// Test IP validation
async function testIPValidation() {
  try {
    console.log('Testing IP validation...');
    
    // Test 1: Check if a student has laboratory assignment
    const testStudentId = 1; // Replace with actual student ID
    const testElectionId = 1; // Replace with actual election ID
    const testIP = '10.9.203.53'; // IP from Lab 208
    
    console.log(`Testing with Student ID: ${testStudentId}, Election ID: ${testElectionId}, IP: ${testIP}`);
    
    // Test the IP validation endpoint
    const response = await axios.post('http://localhost:5000/api/laboratory-precincts/validate-ip', {
      studentId: testStudentId,
      electionId: testElectionId,
      clientIP: testIP
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('IP Validation Response:', response.data);
    
  } catch (error) {
    console.error('Error testing IP validation:', error.response?.data || error.message);
  }
}

// Test student laboratory assignment
async function testStudentAssignment() {
  try {
    console.log('Testing student laboratory assignment...');
    
    const testStudentId = 1; // Replace with actual student ID
    const testElectionId = 1; // Replace with actual election ID
    
    const response = await axios.get(`http://localhost:5000/api/laboratory-precincts/student/${testStudentId}/election/${testElectionId}`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Student Assignment Response:', response.data);
    
  } catch (error) {
    console.error('Error testing student assignment:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('=== IP Validation Test ===');
  await testStudentAssignment();
  console.log('\n=== Student Assignment Test ===');
  await testIPValidation();
}

runTests();

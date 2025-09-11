const axios = require('axios');

/**
 * Simple Performance Test Script
 * Tests the system's ability to handle concurrent users
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const CONCURRENT_USERS = 50; // Test with 50 concurrent users
const REQUESTS_PER_USER = 10;

async function makeRequest(endpoint, token = null) {
  const startTime = Date.now();
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      timeout: 10000
    });
    const endTime = Date.now();
    return {
      success: true,
      status: response.status,
      responseTime: endTime - startTime,
      data: response.data
    };
  } catch (error) {
    const endTime = Date.now();
    return {
      success: false,
      status: error.response?.status || 0,
      responseTime: endTime - startTime,
      error: error.message
    };
  }
}

async function simulateUser(userId) {
  const results = [];
  
  // Simulate user behavior
  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    // Health check
    results.push(await makeRequest('/api/health'));
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
  }
  
  return results;
}

async function runPerformanceTest() {
  console.log('🚀 Starting performance test...');
  console.log(`👥 Testing ${CONCURRENT_USERS} concurrent users`);
  console.log(`📊 ${REQUESTS_PER_USER} requests per user`);
  console.log(`🌐 Target: ${BASE_URL}`);
  
  const startTime = Date.now();
  const allResults = [];
  
  // Create array of user simulation promises
  const userPromises = Array.from({ length: CONCURRENT_USERS }, (_, i) => 
    simulateUser(i + 1)
  );
  
  // Run all users concurrently
  const userResults = await Promise.all(userPromises);
  
  // Flatten results
  userResults.forEach(userResult => {
    allResults.push(...userResult);
  });
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  // Analyze results
  const successful = allResults.filter(r => r.success);
  const failed = allResults.filter(r => !r.success);
  const responseTimes = successful.map(r => r.responseTime);
  
  const stats = {
    totalRequests: allResults.length,
    successful: successful.length,
    failed: failed.length,
    successRate: (successful.length / allResults.length * 100).toFixed(2),
    totalTime: totalTime,
    averageResponseTime: responseTimes.length > 0 ? 
      Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0,
    minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
    maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
    requestsPerSecond: Math.round(allResults.length / (totalTime / 1000))
  };
  
  console.log('\n📈 Performance Test Results:');
  console.log('================================');
  console.log(`✅ Successful requests: ${stats.successful}/${stats.totalRequests} (${stats.successRate}%)`);
  console.log(`❌ Failed requests: ${stats.failed}`);
  console.log(`⏱️  Total time: ${stats.totalTime}ms`);
  console.log(`📊 Requests per second: ${stats.requestsPerSecond}`);
  console.log(`⚡ Average response time: ${stats.averageResponseTime}ms`);
  console.log(`🏃 Min response time: ${stats.minResponseTime}ms`);
  console.log(`🐌 Max response time: ${stats.maxResponseTime}ms`);
  
  // Performance assessment
  if (stats.successRate >= 95 && stats.averageResponseTime < 2000) {
    console.log('\n🎉 EXCELLENT! System is ready for high-concurrency voting!');
  } else if (stats.successRate >= 90 && stats.averageResponseTime < 5000) {
    console.log('\n✅ GOOD! System should handle moderate concurrent users well.');
  } else {
    console.log('\n⚠️  WARNING! System may struggle with high concurrent users.');
    console.log('💡 Consider running database optimization: npm run optimize-db');
  }
  
  // Show error details if any
  if (failed.length > 0) {
    console.log('\n❌ Error Summary:');
    const errorCounts = {};
    failed.forEach(f => {
      const error = f.error || `Status ${f.status}`;
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
    
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`   ${error}: ${count} times`);
    });
  }
  
  return stats;
}

// Run the test
if (require.main === module) {
  runPerformanceTest()
    .then(() => {
      console.log('\n🏁 Performance test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Performance test failed:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceTest };

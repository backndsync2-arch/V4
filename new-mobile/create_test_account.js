/**
 * Script to create a test client account: shervin3
 * 
 * Usage:
 *   1. First, login as admin to get access token
 *   2. Update ADMIN_EMAIL and ADMIN_PASSWORD below
 *   3. Run: node create_test_account.js
 */

const https = require('https');
const http = require('http');

const API_BASE = 'https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1';
const ADMIN_EMAIL = 'admin@sync2gear.com'; // Update this
const ADMIN_PASSWORD = 'Admin@Sync2Gear2025!'; // Update this

// Test account details
const TEST_ACCOUNT = {
  email: 'shervin3',
  name: 'shervin3',
  password: 'Team@1234',
  role: 'client'
};

// Helper function to make HTTP requests
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function createTestAccount() {
  try {
    console.log('Step 1: Logging in as admin...');
    const loginResponse = await makeRequest(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (loginResponse.status !== 200 && loginResponse.status !== 201) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.data)}`);
    }

    const accessToken = loginResponse.data.access;
    if (!accessToken) {
      throw new Error('No access token received');
    }

    console.log('✓ Login successful');
    console.log('');

    console.log('Step 2: Creating client organization...');
    const clientResponse = await makeRequest(`${API_BASE}/admin/clients/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    }, {
      name: TEST_ACCOUNT.name,
      email: TEST_ACCOUNT.email,
      business_name: TEST_ACCOUNT.name,
      subscription_tier: 'basic',
      subscription_status: 'trial'
    });

    if (clientResponse.status !== 201) {
      if (clientResponse.data.error && clientResponse.data.error.includes('already exists')) {
        console.log('⚠ Client organization already exists, using existing one...');
        // Try to get existing client
        const getClientsResponse = await makeRequest(`${API_BASE}/admin/clients/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (getClientsResponse.status === 200) {
          const clients = Array.isArray(getClientsResponse.data) 
            ? getClientsResponse.data 
            : (getClientsResponse.data.results || []);
          const existingClient = clients.find(c => c.email === TEST_ACCOUNT.email);
          if (existingClient) {
            var clientId = existingClient.id || existingClient._id;
            console.log(`✓ Using existing client organization with ID: ${clientId}`);
          } else {
            throw new Error('Client organization exists but could not be found');
          }
        } else {
          throw new Error(`Failed to get existing clients: ${JSON.stringify(clientResponse.data)}`);
        }
      } else {
        throw new Error(`Failed to create client: ${JSON.stringify(clientResponse.data)}`);
      }
    } else {
      var clientId = clientResponse.data.id || clientResponse.data._id;
      console.log(`✓ Client organization created with ID: ${clientId}`);
    }
    console.log('');

    console.log('Step 3: Creating user account...');
    const userResponse = await makeRequest(`${API_BASE}/admin/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    }, {
      email: TEST_ACCOUNT.email,
      name: TEST_ACCOUNT.name,
      role: TEST_ACCOUNT.role,
      client_id: clientId,
      password: TEST_ACCOUNT.password
    });

    if (userResponse.status !== 201) {
      if (userResponse.data.error && userResponse.data.error.includes('already exists')) {
        console.log('⚠ User already exists!');
        console.log('');
        console.log('Test account details:');
        console.log(`  Email: ${TEST_ACCOUNT.email}`);
        console.log(`  Password: ${TEST_ACCOUNT.password}`);
        console.log(`  Role: ${TEST_ACCOUNT.role}`);
        console.log('');
        console.log('You can use these credentials to login.');
        return;
      } else {
        throw new Error(`Failed to create user: ${JSON.stringify(userResponse.data)}`);
      }
    }

    console.log('✓ User account created successfully!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Test Account Created Successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Email: ${TEST_ACCOUNT.email}`);
    console.log(`Password: ${TEST_ACCOUNT.password}`);
    console.log(`Role: ${TEST_ACCOUNT.role}`);
    console.log(`Client ID: ${clientId}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('You can now login with these credentials in the mobile app.');

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
createTestAccount();


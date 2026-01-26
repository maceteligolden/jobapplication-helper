#!/usr/bin/env node

/**
 * Hugging Face Connection Verification Script
 * Verifies that the application can connect to Hugging Face API
 * Run this script to test your connection before starting the app
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getToken() {
  // Try to read from .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/(?:HUGGINGFACE_API_TOKEN|NEXT_PUBLIC_HUGGINGFACE_API_TOKEN|HF_TOKEN|HF_API_TOKEN)\s*=\s*(.+)/i);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  
  // Try environment variables
  return (
    process.env.HUGGINGFACE_API_TOKEN ||
    process.env.NEXT_PUBLIC_HUGGINGFACE_API_TOKEN ||
    process.env.HF_TOKEN ||
    process.env.HF_API_TOKEN
  );
}

async function verifyToken(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'huggingface.co',
      path: '/api/whoami',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'JobApplicationHelper-Verification',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const userInfo = JSON.parse(data);
            resolve({ success: true, userInfo, statusCode: res.statusCode });
          } catch (e) {
            resolve({ success: false, error: 'Invalid JSON response', statusCode: res.statusCode });
          }
        } else {
          resolve({ success: false, error: data, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function main() {
  log('\n🔍 Hugging Face Connection Verification', 'cyan');
  log('='.repeat(50), 'cyan');
  
  // Step 1: Check for token
  log('\n📋 Step 1: Checking for API token...', 'blue');
  const token = getToken();
  
  if (!token) {
    log('❌ Token not found!', 'red');
    log('\nPlease set HUGGINGFACE_API_TOKEN in your .env.local file:', 'yellow');
    log('  1. Create .env.local in the project root', 'yellow');
    log('  2. Add: HUGGINGFACE_API_TOKEN=your_token_here', 'yellow');
    log('  3. Get your token from: https://hf.co/settings/tokens', 'yellow');
    process.exit(1);
  }
  
  log(`✅ Token found: ${token.substring(0, 10)}... (${token.length} chars)`, 'green');
  
  // Step 2: Validate token format
  log('\n📋 Step 2: Validating token format...', 'blue');
  if (token.startsWith('hf_') && token.length >= 20) {
    log('✅ Token format looks valid', 'green');
  } else {
    log('⚠️  Token format may be invalid (expected to start with "hf_" and be at least 20 chars)', 'yellow');
  }
  
  // Step 3: Test connection
  log('\n📋 Step 3: Testing API connection...', 'blue');
  try {
    const startTime = Date.now();
    const result = await verifyToken(token);
    const responseTime = Date.now() - startTime;
    
    if (result.success) {
      log('✅ Connection successful!', 'green');
      log(`   Response time: ${responseTime}ms`, 'green');
      log(`   User: ${result.userInfo.name || 'Unknown'}`, 'green');
      log(`   Email: ${result.userInfo.email ? result.userInfo.email.substring(0, 10) + '...' : 'Not provided'}`, 'green');
      log('\n🎉 Hugging Face connection is working correctly!', 'green');
      log('   You can now start the application with: npm run dev', 'green');
    } else {
      log('❌ Connection failed!', 'red');
      log(`   Status code: ${result.statusCode}`, 'red');
      log(`   Error: ${result.error}`, 'red');
      
      if (result.statusCode === 401) {
        log('\n💡 This usually means:', 'yellow');
        log('   - Token is invalid or expired', 'yellow');
        log('   - Token doesn\'t have required permissions', 'yellow');
        log('   - Get a new token: https://hf.co/settings/tokens', 'yellow');
      } else if (result.statusCode === 403) {
        log('\n💡 This usually means:', 'yellow');
        log('   - Token doesn\'t have required permissions', 'yellow');
        log('   - Check token permissions at: https://hf.co/settings/tokens', 'yellow');
      }
      
      process.exit(1);
    }
  } catch (error) {
    log('❌ Connection test failed!', 'red');
    log(`   Error: ${error.message}`, 'red');
    
    if (error.message.includes('timeout')) {
      log('\n💡 Network timeout - check your internet connection', 'yellow');
    } else if (error.message.includes('ENOTFOUND')) {
      log('\n💡 DNS resolution failed - check your internet connection', 'yellow');
    }
    
    process.exit(1);
  }
  
    // Step 4: Check providers
    log('\n📋 Step 4: Checking inference providers...', 'blue');
    try {
      const providersResponse = await fetch('https://huggingface.co/api/settings/inference-providers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (providersResponse.ok) {
        const providers = await providersResponse.json();
        
        if (Array.isArray(providers) && providers.length > 0) {
          log(`✅ Found ${providers.length} provider(s):`, 'green');
          providers.forEach((provider, index) => {
            const status = provider.enabled ? '✅ Enabled' : '❌ Disabled';
            const active = provider.active ? '🟢 Active' : '🔴 Inactive';
            log(`   ${index + 1}. ${provider.name || provider.provider || 'Unknown'}: ${status} ${active}`, 'green');
          });
          
          const enabledCount = providers.filter(p => p.enabled).length;
          const activeCount = providers.filter(p => p.active).length;
          
          if (enabledCount === 0) {
            log('\n⚠️  No providers are enabled!', 'yellow');
            log('   Please enable at least one provider at: https://hf.co/settings/inference-providers', 'yellow');
          } else if (activeCount === 0) {
            log('\n⚠️  No providers are active!', 'yellow');
            log('   Some providers may be temporarily unavailable', 'yellow');
          } else {
            log(`\n✅ ${activeCount} provider(s) are active and ready to use`, 'green');
          }
        } else if (typeof providers === 'object') {
          const providerList = Object.entries(providers);
          log(`✅ Found ${providerList.length} provider(s):`, 'green');
          providerList.forEach(([name, value], index) => {
            const enabled = value.enabled || false;
            const active = value.active || false;
            const status = enabled ? '✅ Enabled' : '❌ Disabled';
            const activeStatus = active ? '🟢 Active' : '🔴 Inactive';
            log(`   ${index + 1}. ${name}: ${status} ${activeStatus}`, 'green');
          });
        } else {
          log('⚠️  Could not parse providers response', 'yellow');
          log('   Visit: https://hf.co/settings/inference-providers to check manually', 'yellow');
        }
      } else {
        log('⚠️  Could not fetch providers (may require different permissions)', 'yellow');
        log('   Visit: https://hf.co/settings/inference-providers to check manually', 'yellow');
        
        // Try testing known providers
        log('\n📋 Testing known providers...', 'blue');
        const knownProviders = [
          { name: 'Novita', testModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct' },
          { name: 'Together', testModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct' },
          { name: 'Fireworks', testModel: 'mistralai/Mistral-7B-Instruct-v0.2' },
        ];
        
        for (const provider of knownProviders) {
          try {
            const testResponse = await fetch(`https://router.huggingface.co/models/${provider.testModel}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inputs: 'test',
                parameters: { max_new_tokens: 1 },
              }),
            });
            
            const status = testResponse.status === 200 || testResponse.status === 202 
              ? '🟢 Available' 
              : testResponse.status === 503 
              ? '🔴 Unavailable' 
              : '🟡 Unknown';
            log(`   ${provider.name}: ${status} (Status: ${testResponse.status})`, 'green');
          } catch (error) {
            log(`   ${provider.name}: 🔴 Error`, 'red');
          }
        }
      }
    } catch (error) {
      log('⚠️  Error checking providers:', 'yellow');
      log(`   ${error.message}`, 'yellow');
      log('   Visit: https://hf.co/settings/inference-providers to check manually', 'yellow');
    }
    
    log('\n' + '='.repeat(50), 'cyan');
}

main().catch((error) => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});

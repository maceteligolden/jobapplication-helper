/**
 * Verify Hugging Face token and show available models
 */

const fs = require('fs');

// Read token from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const tokenMatch = envContent.match(/NEXT_PUBLIC_HUGGINGFACE_API_TOKEN\s*=\s*(.+)/);
const token = tokenMatch ? tokenMatch[1].trim().replace(/^["']|["']$/g, '') : null;

if (!token) {
  console.error('❌ Token not found in .env.local');
  process.exit(1);
}

console.log('🔑 Token Verification\n');
console.log(`Token: ${token.substring(0, 15)}...${token.substring(token.length - 4)}`);
console.log(`Length: ${token.length} characters`);
console.log(`Format: ${token.startsWith('hf_') ? '✅ Valid format (starts with hf_)' : '⚠️  Unexpected format'}`);
console.log('');

async function verifyToken() {
  console.log('1. Testing token with Hugging Face API...\n');
  
  // Test 1: Whoami endpoint
  try {
    const whoamiResponse = await fetch('https://huggingface.co/api/whoami', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (whoamiResponse.ok) {
      const user = await whoamiResponse.json();
      console.log(`   ✅ Token is VALID`);
      console.log(`   User: ${user.name || user.username || 'Unknown'}`);
      console.log(`   Type: ${user.type || 'user'}`);
    } else {
      const errorText = await whoamiResponse.text();
      console.log(`   ❌ Token validation failed (${whoamiResponse.status})`);
      console.log(`   Response: ${errorText.substring(0, 200)}`);
      console.log('\n   This means:');
      console.log('   - Token may be invalid or expired');
      console.log('   - Token may not have read permissions');
      console.log('   - Get a new token: https://hf.co/settings/tokens');
      return;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return;
  }
  
  // Test 2: Check inference providers via model access
  console.log('\n2. Testing model access (this shows available providers)...\n');
  
  const models = [
    'meta-llama/Meta-Llama-3.1-8B-Instruct',
    'mistralai/Mistral-7B-Instruct-v0.2',
    'microsoft/Phi-3-mini-4k-instruct',
  ];
  
  const availableModels = [];
  
  for (const model of models) {
    process.stdout.write(`   Testing ${model}... `);
    
    try {
      const response = await fetch(`https://router.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: 'test',
          parameters: { max_new_tokens: 5 },
        }),
      });
      
      const responseText = await response.text();
      
      if (response.ok) {
        console.log('✅ AVAILABLE');
        availableModels.push(model);
      } else {
        console.log(`❌ ${response.status}`);
        
        // Try to parse error
        try {
          const error = JSON.parse(responseText);
          if (error.error) {
            console.log(`      ${error.error.substring(0, 60)}...`);
          }
        } catch {
          console.log(`      ${responseText.substring(0, 60)}...`);
        }
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message.substring(0, 40)}...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY\n');
  
  if (availableModels.length > 0) {
    console.log(`✅ Available Models (${availableModels.length}):`);
    availableModels.forEach(model => console.log(`   - ${model}`));
    console.log('\n💡 Update src/shared/constants/index.ts to use one of these models.');
  } else {
    console.log('❌ No models are accessible');
    console.log('\nThis indicates:');
    console.log('1. Inference providers are not properly enabled');
    console.log('2. Providers are enabled but not active/working');
    console.log('3. Token doesn\'t have access to inference API');
    console.log('\nNext steps:');
    console.log('1. Visit: https://hf.co/settings/inference-providers');
    console.log('2. Enable and activate at least one provider');
    console.log('3. Check provider status - some may need additional setup');
    console.log('4. Verify your account has access to inference API');
  }
}

verifyToken().catch(console.error);

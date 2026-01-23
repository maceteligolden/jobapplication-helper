/**
 * Check Hugging Face inference providers and available models
 */

const fs = require('fs');
const path = require('path');

// Load token
function getToken() {
  const envFiles = ['.env.local', '.env'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(__dirname, envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/(?:HUGGINGFACE_API_TOKEN|NEXT_PUBLIC_HUGGINGFACE_API_TOKEN|HF_TOKEN|HF_API_TOKEN)\s*=\s*(.+)/i);
      if (match) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return null;
}

const token = getToken();

if (!token) {
  console.error('❌ No token found!');
  process.exit(1);
}

console.log('🔍 Checking Hugging Face Providers and Models...\n');
console.log('Token:', token.substring(0, 10) + '...' + token.substring(token.length - 4));
console.log('');

/**
 * Check provider status via API
 */
async function checkProviders() {
  try {
    // Try to get user info to verify token
    console.log('1. Verifying token...');
    const userResponse = await fetch('https://huggingface.co/api/whoami', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (userResponse.ok) {
      const user = await userResponse.json();
      console.log(`   ✅ Token valid! User: ${user.name || 'Unknown'}`);
    } else {
      console.log(`   ❌ Token invalid or expired (${userResponse.status})`);
      return;
    }
    
    console.log('\n2. Checking inference providers...');
    console.log('   Visit: https://hf.co/settings/inference-providers');
    console.log('   Make sure at least one provider is ENABLED and ACTIVE');
    
    // Test a simple model to see provider response
    console.log('\n3. Testing model access...');
    
    const testModels = [
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.2',
    ];
    
    for (const model of testModels) {
      console.log(`\n   Testing: ${model}`);
      
      try {
        // Try using the inference API directly
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
          console.log(`      ✅ Model is accessible!`);
          try {
            const data = JSON.parse(responseText);
            console.log(`      Response preview: ${JSON.stringify(data).substring(0, 100)}...`);
          } catch {
            console.log(`      Response: ${responseText.substring(0, 100)}...`);
          }
        } else {
          console.log(`      ❌ Status: ${response.status}`);
          console.log(`      Response: ${responseText.substring(0, 200)}`);
          
          // Parse error if JSON
          try {
            const error = JSON.parse(responseText);
            if (error.error) {
              console.log(`      Error: ${error.error}`);
            }
          } catch {}
        }
      } catch (error) {
        console.log(`      ❌ Exception: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n💡 DIAGNOSIS:\n');
    
    console.log('If all models return 404 or provider errors:');
    console.log('1. Go to: https://hf.co/settings/inference-providers');
    console.log('2. Enable at least ONE provider (Novita, Together, Fireworks, etc.)');
    console.log('3. Make sure the provider shows as "Active" or "Enabled"');
    console.log('4. Some providers may require additional setup or API keys');
    console.log('5. Restart your dev server after enabling providers');
    
    console.log('\nIf providers are enabled but still failing:');
    console.log('- Check provider status pages for outages');
    console.log('- Verify your token has the right permissions');
    console.log('- Try a different provider');
    console.log('- Some models may require accepting terms of use');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProviders();

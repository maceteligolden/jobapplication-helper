/**
 * Check if your Hugging Face token has the required permissions
 * Specifically checks for "Make calls to Inference Providers" permission
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
  console.error('❌ No token found in .env.local or .env');
  console.log('\nCreate a token at: https://hf.co/settings/tokens');
  process.exit(1);
}

console.log('🔍 Checking Token Permissions\n');
console.log('Token:', token.substring(0, 15) + '...' + token.substring(token.length - 4));
console.log('');

async function checkPermissions() {
  // Step 1: Verify token is valid
  console.log('1. Verifying token validity...');
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
      const error = await whoamiResponse.text();
      console.log(`   ❌ Token is INVALID (${whoamiResponse.status})`);
      console.log(`   Error: ${error}`);
      console.log('\n   💡 Solution:');
      console.log('   1. Go to: https://hf.co/settings/tokens');
      console.log('   2. Create a new token');
      console.log('   3. Make sure "Make calls to Inference Providers" is checked');
      console.log('   4. Update .env.local with the new token');
      return;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return;
  }
  
  // Step 2: Test inference API access (this requires the permission)
  console.log('\n2. Testing Inference API access...');
  console.log('   (This requires "Make calls to Inference Providers" permission)');
  
  const testModel = 'meta-llama/Meta-Llama-3.1-8B-Instruct';
  
  try {
    const response = await fetch(`https://router.huggingface.co/models/${testModel}`, {
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
      console.log(`   ✅ Inference API access works!`);
      console.log(`   Model ${testModel} is accessible`);
      console.log('\n   ✅ Your token has the correct permissions!');
    } else {
      console.log(`   ❌ Inference API access failed (${response.status})`);
      
      try {
        const error = JSON.parse(responseText);
        console.log(`   Error: ${error.error || responseText}`);
        
        if (response.status === 401 || response.status === 403) {
          console.log('\n   💡 This likely means:');
          console.log('   - Token lacks "Make calls to Inference Providers" permission');
          console.log('   - OR token is invalid/expired');
          console.log('\n   Solution:');
          console.log('   1. Go to: https://hf.co/settings/tokens');
          console.log('   2. Edit your token or create a new one');
          console.log('   3. ✅ Check "Make calls to Inference Providers"');
          console.log('   4. Save and update .env.local');
        } else if (response.status === 404) {
          console.log('\n   💡 Model not found or provider not configured');
          console.log('   - Check inference providers: https://hf.co/settings/inference-providers');
          console.log('   - Enable at least one provider');
        }
      } catch {
        console.log(`   Response: ${responseText.substring(0, 200)}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📋 PERMISSION CHECKLIST\n');
  console.log('Required permissions:');
  console.log('  [ ] Token is valid (tested above)');
  console.log('  [ ] "Make calls to Inference Providers" is checked');
  console.log('  [ ] Token has "Read" role (or "Write")');
  console.log('  [ ] Inference providers are enabled');
  console.log('\nIf any are missing:');
  console.log('  1. Visit: https://hf.co/settings/tokens');
  console.log('  2. Edit token or create new one');
  console.log('  3. Ensure "Make calls to Inference Providers" is checked');
  console.log('  4. Visit: https://hf.co/settings/inference-providers');
  console.log('  5. Enable at least one provider');
  console.log('\nSee TOKEN_PERMISSIONS.md for detailed instructions.');
}

checkPermissions().catch(console.error);

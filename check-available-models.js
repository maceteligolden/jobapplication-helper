/**
 * Check available Hugging Face models via API
 * Lists models that are accessible with the current token
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(__dirname, envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

// Get token
const token =
  process.env.HUGGINGFACE_API_TOKEN ||
  process.env.NEXT_PUBLIC_HUGGINGFACE_API_TOKEN ||
  process.env.HF_TOKEN ||
  process.env.HF_API_TOKEN;

if (!token) {
  console.error('❌ No Hugging Face token found!');
  process.exit(1);
}

console.log('🔍 Checking available models with your token...\n');
console.log('Token:', token.substring(0, 10) + '...' + token.substring(token.length - 4));
console.log('');

/**
 * Test a model to see if it's available
 */
async function testModel(modelId) {
  try {
    const response = await fetch(`https://router.huggingface.co/models/${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: 'test',
        parameters: {
          max_new_tokens: 5,
        },
      }),
    });

    if (response.ok) {
      return { available: true, status: response.status };
    } else {
      const errorText = await response.text();
      return { 
        available: false, 
        status: response.status, 
        error: errorText.substring(0, 100) 
      };
    }
  } catch (error) {
    return { 
      available: false, 
      error: error.message 
    };
  }
}

/**
 * Check models from a list
 */
async function checkModels() {
  const modelsToTest = [
    // Current models
    'meta-llama/Meta-Llama-3.1-8B-Instruct',
    'mistralai/Mistral-7B-Instruct-v0.2',
    'mistralai/Mistral-7B-Instruct-v0.1',
    'microsoft/Phi-3-mini-4k-instruct',
    
    // Alternative models
    'meta-llama/Llama-3-8B-Instruct',
    'meta-llama/Llama-2-7b-chat-hf',
    'mistralai/Mistral-7B-Instruct-v0.3',
    'microsoft/Phi-3-medium-4k-instruct',
    'HuggingFaceH4/zephyr-7b-beta',
    'Qwen/Qwen2-7B-Instruct',
    'google/gemma-2b-it',
    'google/flan-t5-large',
  ];

  console.log('Testing models...\n');
  
  const results = {
    available: [],
    unavailable: [],
    errors: [],
  };

  for (const model of modelsToTest) {
    process.stdout.write(`Testing ${model}... `);
    const result = await testModel(model);
    
    if (result.available) {
      console.log('✅ AVAILABLE');
      results.available.push(model);
    } else {
      console.log(`❌ Not available (${result.status || 'error'})`);
      results.unavailable.push({ model, ...result });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESULTS SUMMARY\n');
  console.log(`✅ Available models (${results.available.length}):`);
  results.available.forEach(model => console.log(`   - ${model}`));
  
  console.log(`\n❌ Unavailable models (${results.unavailable.length}):`);
  results.unavailable.forEach(({ model, status, error }) => {
    console.log(`   - ${model} (Status: ${status || 'N/A'})`);
    if (error) {
      console.log(`     Error: ${error.substring(0, 80)}...`);
    }
  });

  console.log('\n💡 Recommendation:');
  if (results.available.length > 0) {
    console.log(`   Use one of these available models: ${results.available[0]}`);
    console.log(`   Update src/shared/constants/index.ts to use an available model.`);
  } else {
    console.log('   ⚠️  No models are available!');
    console.log('   This usually means:');
    console.log('   1. Inference providers are not properly configured');
    console.log('   2. Token doesn\'t have access to these models');
    console.log('   3. Models require accepting terms of use');
    console.log('   Check: https://hf.co/settings/inference-providers');
  }
}

// Run the check
checkModels().catch(error => {
  console.error('Error checking models:', error);
  process.exit(1);
});

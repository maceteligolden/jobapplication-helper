/**
 * List available Hugging Face models using the HfInference SDK
 */

const { HfInference } = require('@huggingface/inference');
const fs = require('fs');
const path = require('path');

// Load token from .env.local or .env
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

console.log('🔍 Checking available models with Hugging Face SDK...\n');
console.log('Token:', token.substring(0, 10) + '...' + token.substring(token.length - 4));
console.log('');

const hf = new HfInference(token);

// Models to test
const modelsToTest = [
  { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', type: 'conversational' },
  { id: 'mistralai/Mistral-7B-Instruct-v0.2', type: 'conversational' },
  { id: 'mistralai/Mistral-7B-Instruct-v0.1', type: 'conversational' },
  { id: 'microsoft/Phi-3-mini-4k-instruct', type: 'text-generation' },
  { id: 'meta-llama/Llama-3-8B-Instruct', type: 'conversational' },
  { id: 'HuggingFaceH4/zephyr-7b-beta', type: 'conversational' },
  { id: 'google/flan-t5-large', type: 'text-generation' },
];

async function testModel(model) {
  try {
    if (model.type === 'conversational') {
      const response = await hf.chatCompletion({
        model: model.id,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      });
      return { available: true, method: 'chatCompletion', response: 'success' };
    } else {
      const response = await hf.textGeneration({
        model: model.id,
        inputs: 'test',
        parameters: { max_new_tokens: 5 },
      });
      return { available: true, method: 'textGeneration', response: 'success' };
    }
  } catch (error) {
    return { 
      available: false, 
      error: error.message,
      errorType: error.constructor.name,
    };
  }
}

async function checkAllModels() {
  console.log('Testing models...\n');
  
  const results = {
    available: [],
    unavailable: [],
  };

  for (const model of modelsToTest) {
    process.stdout.write(`Testing ${model.id} (${model.type})... `);
    
    try {
      const result = await testModel(model);
      
      if (result.available) {
        console.log(`✅ AVAILABLE (via ${result.method})`);
        results.available.push({ ...model, ...result });
      } else {
        console.log(`❌ ${result.errorType || 'Error'}: ${result.error?.substring(0, 60)}...`);
        results.unavailable.push({ ...model, ...result });
      }
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
      results.unavailable.push({ ...model, error: error.message });
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 RESULTS SUMMARY\n');
  
  if (results.available.length > 0) {
    console.log(`✅ AVAILABLE MODELS (${results.available.length}):\n`);
    results.available.forEach((model, index) => {
      console.log(`${index + 1}. ${model.id}`);
      console.log(`   Type: ${model.type}`);
      console.log(`   Method: ${model.method}`);
      console.log('');
    });
    
    console.log('💡 RECOMMENDATION:');
    console.log(`   Use: ${results.available[0].id}`);
    console.log(`   Update src/shared/constants/index.ts with this model.`);
  } else {
    console.log('❌ NO MODELS AVAILABLE\n');
    console.log('All models failed. Common reasons:');
    console.log('1. Inference providers not enabled: https://hf.co/settings/inference-providers');
    console.log('2. Token lacks permissions');
    console.log('3. Models require accepting terms of use');
    console.log('4. Provider API issues');
    console.log('');
    console.log('Error details:');
    results.unavailable.slice(0, 3).forEach(({ id, error, errorType }) => {
      console.log(`   ${id}: ${errorType} - ${error?.substring(0, 80)}`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
}

checkAllModels().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

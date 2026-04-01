const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const geminiService = require('../services/geminiService');

async function testGemini() {
  console.log('Testing Gemini Integration...');
  console.log('Model:', process.env.GEMINI_MODEL || 'gemini-1.5-flash');
  console.log('API Key present:', !!process.env.GEMINI_API_KEY);

  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY is missing in .env. Test will likely fail.');
  }

  try {
    console.log('--- Debug: Listing all models available for your API Key ---');
    
    // Use the native SDK method if possible, or fetch via axios if SDK doesn't expose it easily
    const axios = require('axios');
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    
    if (response.data && response.data.models) {
      console.log('Available Models:');
      response.data.models.forEach(m => {
        if (m.supportedGenerationMethods.includes('generateContent')) {
          console.log(`- ${m.name} (${m.displayName})`);
        }
      });
    } else {
      console.log('Could not retrieve model list.');
    }

    console.log('\n--- Attempting Fallback Chain ---');
    const mockCreator = {
      niches: ['Fashion', 'Lifestyle'],
      totalFollowers: 15000,
      averageEngagement: 3.5
    };

    const mockParams = {
      creator: mockCreator,
      platform: 'instagram',
      contentType: 'short_form',
      refreshToken: 'test-seed'
    };

    const result = await geminiService.generateContentIdeas(mockParams);
    if (result && result.ideas && result.ideas.length > 0) {
      console.log(`✅ Success! Generated ideas using model: ${result.source}`);
      result.ideas.forEach((idea, i) => console.log(`${i + 1}. ${idea}`));
    } else {
      console.log('❌ Failed to generate ideas (all models in chain exhausted or failed).');
    }
  } catch (error) {
    console.error('💥 Error during test:', error.message);
  }
}

testGemini();

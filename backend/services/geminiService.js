const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini Service for AI content generation with multi-model fallback chain
 */
class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      
      // Preferred fallback chain based on your specific AI Studio quotas
      this.modelChain = [
        process.env.GEMINI_MODEL ? (process.env.GEMINI_MODEL.startsWith('models/') ? process.env.GEMINI_MODEL : `models/${process.env.GEMINI_MODEL}`) : 'models/gemini-3.1-flash-lite-preview',
        'models/gemini-3-flash-preview',
        'models/gemini-2.5-flash',
        'models/gemini-2.5-flash-lite',
        'models/gemini-2.0-flash'
      ];
    } else {
      console.warn('GEMINI_API_KEY is not set. GeminiService will be unavailable.');
      this.modelChain = [];
    }
  }

  /**
   * Generate content ideas based on creator context, cycling through models if one fails
   * @param {Object} params 
   * @returns {Promise<Object|null>} { ideas: string[], source: string }
   */
  async generateContentIdeas({ creator, platform, contentType, refreshToken }) {
    if (!this.genAI || this.modelChain.length === 0) return null;

    const nicheText = (creator.niches || []).slice(0, 3).join(', ') || 'general creator growth';
    const followerCount = Number(creator.totalFollowers || 0).toLocaleString();
    const engagement = Number(creator.averageEngagement || 0).toFixed(2);
    const nonce = refreshToken || `${Date.now()}`;

    const prompt = `
      You are a social media growth strategist.
      Generate exactly 5 distinct ${contentType.replace('_', ' ')} content ideas for a ${platform} creator.
      
      Creator Context:
      - Niches: ${nicheText}
      - Followers: ${followerCount}
      - Avg Engagement: ${engagement}%
      - Variation Key: ${nonce}

      Requirements:
      1. Return ONLY a numbered list of ideas (1. Idea, 2. Idea, etc.).
      2. One idea per line.
      3. Each idea must be concise (under 20 words) and practical.
      4. Category Rule: Every idea MUST clearly belong to "${contentType}".
      5. Safety Rule: If category is NOT beauty/health/wellness, do NOT mention skincare, skin, serum, or face masks.
    `;

    // Cycle through the model chain
    for (const modelName of this.modelChain) {
      let timeoutId;
      try {
        console.log(`[GeminiService] Attempting generation with model: ${modelName}`);
        const model = this.genAI.getGenerativeModel({ model: modelName });
        
        // Add a 5-second timeout for each model attempt (faster fallback)
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), 5000);
        });

        const result = await Promise.race([
          model.generateContent(prompt),
          timeoutPromise
        ]);

        clearTimeout(timeoutId); // ✅ Clear timer so the process doesn't hang
        const response = await result.response;
        const text = response.text();

        const ideas = this.parseIdeas(text);
        if (ideas && ideas.length > 0) {
          console.log(`[GeminiService] Success with model: ${modelName}`);
          return { ideas, source: modelName };
        }
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId); // ✅ Clear timer on error too
        const isQuotaError = error.message.includes('429') || error.message.includes('quota');
        const isModelNotFoundError = error.message.includes('404');
        const isTimeout = error.message === 'TIMEOUT';
        
        if (isQuotaError) {
          console.warn(`[GeminiService] Quota exceeded for model ${modelName}, trying next...`);
        } else if (isModelNotFoundError) {
          console.warn(`[GeminiService] Model ${modelName} not found/supported, trying next...`);
        } else if (isTimeout) {
          console.warn(`[GeminiService] Model ${modelName} timed out (5s), trying next...`);
        } else {
          console.error(`[GeminiService] Error with model ${modelName}:`, error.message);
        }
        continue; // Try the next model
      }
    }

    console.error('[GeminiService] All Gemini models in the fallback chain failed.');
    return null;
  }

  /**
   * Parse ideas from raw AI text
   * @param {string} text 
   * @returns {string[]}
   */
  parseIdeas(text) {
    if (!text) return [];
    
    const lines = text
      .split('\n')
      .map(line => line.replace(/^\s*(?:[-*•]+|\d+[\.)])\s*/, '').trim())
      .filter(line => line.length >= 10 && line.length <= 240);

    return [...new Set(lines)].slice(0, 5);
  }
}

module.exports = new GeminiService();

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit initialization using Gemini 1.5 Flash (Stable v1).
 * This model is optimized for high efficiency, low latency, and free-tier compatibility.
 */
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
  ],
  model: 'googleai/gemini-1.5-flash',
});
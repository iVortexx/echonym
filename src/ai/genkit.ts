import {genkit, GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins: GenkitPlugin[] = [];
// Only initialize the Google AI plugin if the API key is provided.
// This allows the app to run without AI features if the key is missing.
if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI({apiKey: process.env.GEMINI_API_KEY}));
}

export const ai = genkit({
  plugins,
  // Set a default model, but calls may fail if no plugins are active.
  // The actions file will guard against this.
  model: 'googleai/gemini-2.0-flash',
});

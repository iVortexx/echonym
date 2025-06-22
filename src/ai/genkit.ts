
import {genkit as realGenkit, GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

let aiInstance: any;

// Only initialize the Google AI plugin and Genkit if the API key is provided.
// This allows the app to run without AI features if the key is missing.
if (process.env.GEMINI_API_KEY) {
  aiInstance = realGenkit({
    plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY})],
    // Set a default model, but calls may fail if no plugins are active.
    // The actions file will guard against this.
    model: 'googleai/gemini-2.0-flash',
  });
} else {
  // If no API key, create a placeholder object.
  // The guards in the flow files should prevent this from ever being used.
  // This proxy throws an error if any of its properties are accessed.
  const handler = {
    get(target: any, prop: string | symbol) {
      // These properties might be accessed by framework internals.
      // Return undefined to avoid breaking things unexpectedly.
      if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON') {
        return undefined;
      }
      // For any other property access, throw a clear error.
      throw new Error(
        `Attempted to use Genkit AI feature '${String(prop)}' but Genkit is not initialized. ` +
        `Please ensure your GEMINI_API_KEY is set in your environment.`
      );
    },
  };
  aiInstance = new Proxy({}, handler);
}

export const ai = aiInstance;

import { config } from 'dotenv';
config();

if (process.env.GEMINI_API_KEY) {
  require('@/ai/flows/suggest-tags.ts');
  require('@/ai/flows/score-post-flow.ts');
  require('@/ai/flows/summarize-post-flow.ts');
} else {
  console.warn(
    'GEMINI_API_KEY not found. Genkit dev server will start, but no flows will be available.'
  );
}

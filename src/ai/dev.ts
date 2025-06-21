import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-tags.ts';
import '@/ai/flows/score-post-flow.ts';
import '@/ai/flows/summarize-post-flow.ts';

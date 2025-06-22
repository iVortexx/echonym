'use server';
/**
 * @fileOverview A flow that summarizes a post.
 *
 * - summarizePost - A function that creates a TL;DR summary for post content.
 * - SummarizePostInput - The input type for the summarizePost function.
 * - SummarizePostOutput - The return type for the summarizePost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizePostInputSchema = z.object({
  content: z.string().describe('The content of the post to summarize.'),
});
export type SummarizePostInput = z.infer<typeof SummarizePostInputSchema>;

const SummarizePostOutputSchema = z.object({
  summary: z
    .string()
    .describe('A very short, one-sentence TL;DR summary of the post.'),
});
export type SummarizePostOutput = z.infer<typeof SummarizePostOutputSchema>;

let summarizePostFlow: any;

export async function summarizePost(
  input: SummarizePostInput
): Promise<SummarizePostOutput> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI features are disabled. Missing GEMINI_API_KEY.');
  }

  if (!summarizePostFlow) {
    const prompt = ai.definePrompt({
      name: 'summarizePostPrompt',
      input: {schema: SummarizePostInputSchema},
      output: {schema: SummarizePostOutputSchema},
      prompt: `You are an expert at summarizing technical articles and posts.
Analyze the following content and generate a single, concise sentence that acts as a "TL;DR" (Too Long; Didn't Read).
The summary should capture the main point or finding of the post.

Content:
{{{content}}}
`,
    });

    summarizePostFlow = ai.defineFlow(
      {
        name: 'summarizePostFlow',
        inputSchema: SummarizePostInputSchema,
        outputSchema: SummarizePostOutputSchema,
      },
      async input => {
        const {output} = await prompt(input);
        return output!;
      }
    );
  }

  return summarizePostFlow(input);
}

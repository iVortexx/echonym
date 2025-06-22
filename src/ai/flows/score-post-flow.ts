'use server';
/**
 * @fileOverview A flow that scores a post for clarity and safety.
 *
 * - scorePost - A function that analyzes post content.
 * - ScorePostInput - The input type for the scorePost function.
 * - ScorePostOutput - The return type for the scorePost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScorePostInputSchema = z.object({
  title: z.string().describe('The title of the post.'),
  content: z.string().describe('The content of the post.'),
});
export type ScorePostInput = z.infer<typeof ScorePostInputSchema>;

const ScorePostOutputSchema = z.object({
  score: z
    .number()
    .describe(
      'A score from 1-100 representing the overall quality, clarity, and safety of the post.'
    ),
  clarity: z
    .string()
    .describe(
      'Constructive, one-sentence feedback on how to improve the post for clarity and impact.'
    ),
  safety: z
    .string()
    .describe(
      'A one-sentence analysis of potential safety issues, such as exposed secrets or PII. If none, say "No safety issues found."'
    ),
});
export type ScorePostOutput = z.infer<typeof ScorePostOutputSchema>;

let scorePostFlow: any;

export async function scorePost(
  input: ScorePostInput
): Promise<ScorePostOutput> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI features are disabled. Missing GEMINI_API_KEY.');
  }

  if (!scorePostFlow) {
    const prompt = ai.definePrompt({
      name: 'scorePostPrompt',
      input: {schema: ScorePostInputSchema},
      output: {schema: ScorePostOutputSchema},
      prompt: `You are a writing assistant for a community of security researchers.
Your task is to analyze a user's post and provide a score and feedback.

Analyze the following post:
Title: {{{title}}}
Content:
{{{content}}}

1.  **Clarity and Quality Score**: Rate the post from 1 to 100. A high score means the post is clear, well-structured, and provides valuable information. A low score means it is vague, hard to follow, or contains little substance.
2.  **Clarity Feedback**: Provide one single, actionable sentence to help the user improve their post's clarity.
3.  **Safety Feedback**: Check for potential security risks like exposed API keys, personal information (PII), or credentials. Provide a single sentence summarizing your findings. If there are no obvious risks, state that.

Return your analysis in the specified JSON format.`,
    });

    scorePostFlow = ai.defineFlow(
      {
        name: 'scorePostFlow',
        inputSchema: ScorePostInputSchema,
        outputSchema: ScorePostOutputSchema,
      },
      async input => {
        const {output} = await prompt(input);
        return output!;
      }
    );
  }
  
  return scorePostFlow(input);
}

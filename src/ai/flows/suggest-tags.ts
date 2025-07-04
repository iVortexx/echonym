'use server';
/**
 * @fileOverview A flow that suggests relevant tags for a post based on its content.
 *
 * - suggestTags - A function that suggests tags for a given post content.
 * - SuggestTagsInput - The input type for the suggestTags function.
 * - SuggestTagsOutput - The return type for the suggestTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTagsInputSchema = z.object({
  content: z.string().describe('The content of the post.'),
});
export type SuggestTagsInput = z.infer<typeof SuggestTagsInputSchema>;

const SuggestTagsOutputSchema = z.object({
  tags: z.array(z.string()).describe('An array of suggested tags.'),
});
export type SuggestTagsOutput = z.infer<typeof SuggestTagsOutputSchema>;

export async function suggestTags(input: SuggestTagsInput): Promise<SuggestTagsOutput> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI features are disabled. Missing GEMINI_API_KEY.');
  }

  const prompt = ai.definePrompt({
    name: 'suggestTagsPrompt',
    input: {schema: SuggestTagsInputSchema},
    output: {schema: SuggestTagsOutputSchema},
    prompt: `You are an expert in categorizing technical content within the cybersecurity domain. Your task is to analyze the provided post content and select the most specific and relevant tags from a predefined list.

**Instructions:**
1.  Carefully read the content to understand its main topic.
2.  Choose between 1 and 3 tags from the allowed list below.
3.  **Prioritize specificity.** For example, if the post is about a specific CVE, choose \`cve\` instead of the more generic \`security\`. If it's about network packet analysis, choose \`networking\` and \`forensics\` over just \`security\`.
4.  Use \`discussion\` for broader conversations, questions, or topics that don't fit into a specific technical category.
5.  Only use the \`security\` tag if no other tag from the list is a better, more specific fit.
6.  Do not invent new tags. If no tags seem appropriate, return an empty array.

**Allowed Tags:**
\`security\`, \`reverse-eng\`, \`web-security\`, \`malware\`, \`cve\`, \`networking\`, \`crypto\`, \`forensics\`, \`discussion\`

**Content to Analyze:**
{{{content}}}
`,
  });

  const suggestTagsFlow = ai.defineFlow(
    {
      name: 'suggestTagsFlow',
      inputSchema: SuggestTagsInputSchema,
      outputSchema: SuggestTagsOutputSchema,
    },
    async input => {
      const {output} = await prompt(input);
      return output!;
    }
  );

  return suggestTagsFlow(input);
}

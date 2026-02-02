'use server';

/**
 * @fileOverview A Genkit flow that generates a concise summary of a pull request diff.
 *
 * - generateReviewSummary - A function that generates the review summary.
 * - GenerateReviewSummaryInput - The input type for the generateReviewSummary function.
 * - GenerateReviewSummaryOutput - The return type for the generateReviewSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReviewSummaryInputSchema = z.object({
  diff: z.string().describe('The diff of the pull request.'),
  projectContext: z
    .string()
    .optional()
    .describe('Optional high-level context about the project, like coding standards or tech stack.'),
});
export type GenerateReviewSummaryInput = z.infer<typeof GenerateReviewSummaryInputSchema>;

const GenerateReviewSummaryOutputSchema = z.string().describe('A concise summary of the pull request diff.');
export type GenerateReviewSummaryOutput = z.infer<typeof GenerateReviewSummaryOutputSchema>;

export async function generateReviewSummary(input: GenerateReviewSummaryInput): Promise<GenerateReviewSummaryOutput> {
  return generateReviewSummaryFlow(input);
}

const generateReviewSummaryFlow = ai.defineFlow(
  {
    name: 'generateReviewSummaryFlow',
    inputSchema: GenerateReviewSummaryInputSchema,
    outputSchema: GenerateReviewSummaryOutputSchema,
  },
  async ({ diff, projectContext }) => {
    let prompt = `You are an expert code reviewer. Your goal is to provide a concise, high-level summary of the changes in a pull request, identify potential issues, and suggest improvements.

Analyze the following pull request diff:

\`\`\`diff
${diff}
\`\`\`
`;

    if (projectContext) {
      prompt += `
When reviewing, please take the following project context into account:
---
${projectContext}
---
`;
    }

    prompt += `
Please structure your review with the following sections:
## Summary
A brief, high-level overview of the changes.

## Potential Issues
Point out any potential bugs, logic errors, or areas that might not follow best practices.

## Suggestions
Offer suggestions for improvement, such as refactoring, alternative approaches, or code simplification.

Provide your response in Markdown format.
`;

    const { text } = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-2.5-flash',
    });
    return text!;
  }
);

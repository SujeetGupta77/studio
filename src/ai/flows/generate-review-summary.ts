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

const GenerateReviewSummaryInputSchema = z.string().describe('The diff of the pull request.');
export type GenerateReviewSummaryInput = z.infer<typeof GenerateReviewSummaryInputSchema>;

const GenerateReviewSummaryOutputSchema = z.string().describe('A concise summary of the pull request diff.');
export type GenerateReviewSummaryOutput = z.infer<typeof GenerateReviewSummaryOutputSchema>;

export async function generateReviewSummary(input: GenerateReviewSummaryInput): Promise<GenerateReviewSummaryOutput> {
  return generateReviewSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReviewSummaryPrompt',
  input: {schema: GenerateReviewSummaryInputSchema},
  output: {schema: GenerateReviewSummaryOutputSchema},
  prompt: `You are a code reviewer. Please provide a concise summary of the following pull request diff:\n\n{{input}}`,
});

const generateReviewSummaryFlow = ai.defineFlow(
  {
    name: 'generateReviewSummaryFlow',
    inputSchema: GenerateReviewSummaryInputSchema,
    outputSchema: GenerateReviewSummaryOutputSchema,
  },
  async input => {
    const {text} = await ai.generate({
      prompt: `You are a code reviewer. Provide a concise summary of the following code changes:\n\n${input}`,
      model: 'googleai/gemini-2.5-flash',
    });
    return text!;
  }
);

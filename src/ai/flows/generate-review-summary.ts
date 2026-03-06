'use server';

/**
 * @fileOverview A Genkit flow that generates a structured review of a pull request diff.
 * 
 * Includes file paths and line numbers for specific issues to support inline commenting.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { refineReviewSummary } from './refine-review-summary';

const GenerateReviewSummaryInputSchema = z.object({
  diff: z.string().describe('The diff of the pull request.'),
  projectContext: z
    .string()
    .optional()
    .describe('Optional context about the project.'),
});
export type GenerateReviewSummaryInput = z.infer<typeof GenerateReviewSummaryInputSchema>;

const GenerateReviewSummaryOutputSchema = z.string().describe('A refined and structured summary of the PR diff.');
export type GenerateReviewSummaryOutput = z.infer<typeof GenerateReviewSummaryOutputSchema>;

export async function generateReviewSummary(input: GenerateReviewSummaryInput): Promise<GenerateReviewSummaryOutput> {
  const initialReview = await generateReviewSummaryFlow(input);
  const refinedReview = await refineReviewSummary(initialReview);
  return refinedReview;
}

const systemInstructions = "# AI Coding Assistant Instructions\n\n"
  + "## Project Overview\n"
  + "Mobile Dairy Web is an Angular-based dairy management system supporting multiple organizations (Laxmi, SKE, Staging).\n\n"
  + "## Key Technologies\n"
  + "- **Frontend**: Angular 19 with TypeScript (Standalone Components & esbuild)\n"
  + "- **UI Libraries**: PrimeNG 19, Bootstrap 5, Angular Material 19\n"
  + "- **Internationalization**: ngx-translate (16.x)\n"
  + "- **Mobile**: Capacitor (iOS) - 8.x\n"
  + "- **Package Manager**: pnpm\n\n"
  + "## Core Architecture\n"
  + "- **Admin Dashboard**: src/app/dashboard/admin/ (Lazy-loaded feature modules)\n"
  + "- **Shared Module**: src/app/shared/ (Common components, services, and utilities)\n"
  + "- **API Communication**: Core services in shared/services/api/ using ApiService and ApiHelperService.\n"
  + "- **Authentication**: JWT-based auth via AuthService and GuardService.\n"
  + "- **State Management**: Service-based state using Angular DI.\n\n"
  + "## Project Conventions\n"
  + "1. **Standalone Components**: Required for new code in Angular 19.\n"
  + "2. **Forms**: Use FormHelper for validation.\n"
  + "3. **Error Handling**: Use ApiHelperService.handleError().\n"
  + "4. **UI/UX**: Use NgxUiLoader for loading states. All strings use translate pipe.\n"
  + "5. **Organization Logic**: Check environment.isLaxmiBuild or isSkeBuild for conditional logic.\n";

const generateReviewSummaryFlow = ai.defineFlow(
  {
    name: 'generateReviewSummaryFlow',
    inputSchema: GenerateReviewSummaryInputSchema,
    outputSchema: z.string(),
  },
  async ({ diff, projectContext }) => {

    let promptText = "You are an expert code reviewer. Provide a concise summary and identify issues categorized by priority ([High], [Medium], [Low])."
      + "\n\nCRITICAL: For every point in 'Potential Issues', you MUST identify the file path and the line number from the diff."
      + "\nFormat issues exactly like this: * [Priority] [File: path/to/file.ts] [Line: 123] Problem description. **Suggestion:** Concrete fix or improvement code/guidance."
      + "\n\nCRITICAL: Ensure the Suggestion is part of the SAME bullet point as the issue. This allows us to post them as a single inline comment."
      + "\n\n---\n"
      + systemInstructions
      + "\n---\n"
      + "Analyze this diff:\n"
      + "```diff\n"
      + diff
      + "\n```\n";

    if (projectContext) {
      promptText += "\nContext for THIS PR:\n" + projectContext + "\n";
    }

    promptText += "\nStructure:\n"
      + "## Summary\n"
      + "High level overview of the changes.\n\n"
      + "## Potential Issues\n"
      + "List localized issues using the format: * [Priority] [File: path] [Line: num] Description. **Suggestion:** Fix details.\n\n"
      + "## Generic Suggestions\n"
      + "Broad architectural advice, best practices, or global improvements not tied to a single line.\n";

    const { text } = await ai.generate({
      prompt: promptText,
      model: 'googleai/gemini-2.5-flash',
    });
    return text!;
  }
);
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

const systemInstructions = "# AI Coding Assistant Instructions\n\n## Project Overview\nMobile Dairy Web is an Angular-based dairy management system. The application handles milk collection, farmer management, invoicing, and reporting.\n\n## Key Technologies\n- **Frontend**: Angular 19 with TypeScript (Standalone Components & esbuild)\n- **UI Libraries**: PrimeNG 19, Bootstrap 5, Angular Material 19\n- **Internationalization**: ngx-translate (16.x)\n- **Mobile**: Capacitor (iOS) - 8.x\n- **Package Manager**: pnpm\n\n## Core Architecture\n- **Admin Dashboard**: src/app/dashboard/admin/\n- **Shared Module**: src/app/shared/\n- **API Communication**: Core services in shared/services/api/ using ApiService.\n- **Authentication**: JWT-based auth via AuthService.\n- **State Management**: Service-based state using Angular DI.\n\n## Project Conventions\n1. **Standalone Components**: Preferred in Angular 19.\n2. **Forms**: Mix of template-driven and reactive. Use FormHelper.\n3. **Error Handling**: HTTP interceptors and ApiHelperService.handleError().\n4. **UI/UX**: Use NgxUiLoader for loading states. All strings use translate pipe.\n";

const generateReviewSummaryFlow = ai.defineFlow(
  {
    name: 'generateReviewSummaryFlow',
    inputSchema: GenerateReviewSummaryInputSchema,
    outputSchema: z.string(),
  },
  async ({ diff, projectContext }) => {

    let promptText = "You are an expert code reviewer. Provide a concise summary and identify issues categorized by priority ([High], [Medium], [Low])."
      + "\n\nCRITICAL: For every point in 'Potential Issues', you MUST identify the file path and the line number from the diff if possible."
      + "\nFormat issues exactly like this: * [Priority] [File: path/to/file.ts] [Line: 123] Description of the issue."
      + "\nIf you cannot find a specific line, just use [File: path/to/file.ts]."
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
      + "High level overview.\n\n"
      + "## Potential Issues\n"
      + "List issues using the [Priority] [File: path] [Line: num] format.\n\n"
      + "## Suggestions\n"
      + "Improvements and best practices.\n";

    const { text } = await ai.generate({
      prompt: promptText,
      model: 'googleai/gemini-2.5-flash',
    });
    return text!;
  }
);

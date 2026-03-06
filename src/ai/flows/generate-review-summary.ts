'use server';

/**
 * @fileOverview A Genkit flow that generates a concise summary of a pull request diff.
 *
 * - generateReviewSummary - A function that orchestrates generating and refining the review summary.
 * - GenerateReviewSummaryInput - The input type for the generateReviewSummary function.
 * - GenerateReviewSummaryOutput - The return type for the generateReviewSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { refineReviewSummary } from './refine-review-summary';

const GenerateReviewSummaryInputSchema = z.object({
  diff: z.string().describe('The diff of the pull request.'),
  projectContext: z
    .string()
    .optional()
    .describe('Optional high-level context about the project, like coding standards or tech stack.'),
});
export type GenerateReviewSummaryInput = z.infer<typeof GenerateReviewSummaryInputSchema>;

const GenerateReviewSummaryOutputSchema = z.string().describe('A concise and refined summary of the pull request diff.');
export type GenerateReviewSummaryOutput = z.infer<typeof GenerateReviewSummaryOutputSchema>;

// This function now orchestrates the two-step process.
export async function generateReviewSummary(input: GenerateReviewSummaryInput): Promise<GenerateReviewSummaryOutput> {
  // Step 1: Generate the initial review.
  const initialReview = await generateReviewSummaryFlow(input);
  
  // Step 2: Pass the initial review to the refinement agent.
  const refinedReview = await refineReviewSummary(initialReview);

  return refinedReview;
}

const systemInstructions = "# AI Coding Assistant Instructions\n\n## Project Overview\nMobile Dairy Web is an Angular-based dairy management system supporting multiple organizations. The application handles milk collection, farmer management, invoicing, and reporting with organization-specific builds (Laxmi, SKE, Staging).\n\n## Key Technologies\n- **Frontend**: Angular 19 with TypeScript (Standalone Components & esbuild)\n- **UI Libraries**: PrimeNG 19, Bootstrap 5, Angular Material 19\n- **Internationalization**: ngx-translate (16.x)\n- **Mobile**: Capacitor (iOS) - 8.x\n- **Package Manager**: pnpm (with pnpm-lock.yaml)\n- **Build Tool**: esbuild (ESBuild compiler from Angular 19)\n\n## Core Architecture\n\n### Module Structure\n- **Admin Dashboard** (src/app/dashboard/admin/): Main feature module with lazy-loaded submodules\n  - Key components in components/ handle distinct business domains (collections, customers, invoicing)\n  - Each feature typically has its own routing module for code-splitting\n- **Shared Module** (src/app/shared/): Cross-cutting concerns\n  - Common components, services, and utilities\n  - Authentication, API communication, and interceptors\n\n### Data Flow Patterns\n1. **API Communication**:\n   - Core services in shared/services/api/\n   - ApiService for base HTTP operations\n   - ApiHelperService for common data transformations\n   - Interceptor handles auth tokens and error management\n\n2. **Authentication**:\n   - JWT-based auth handled by AuthService\n   - Route guards in shared/services/auth/guard.service.ts\n   - Session timeout management in app root\n\n3. **State Management**:\n   - Service-based state using Angular DI\n   - No external state management library\n   - Components communicate via services\n\n## Development Workflows\n\n### Build Process\n- **Build Tool**: esbuild (ESBuild compiler, default from Angular 19)\n- **Module Format**: Standalone components (preferred over traditional NgModules)\n- **Environment-specific configuration** via file replacement in angular.json\n- **Version management** through update-version.js (major, minor, patch)\n- **Organization-specific builds** with conditional logic:\n  - Laxmi: environment.isLaxmiBuild\n  - SKE: environment.isSkeBuild\n- **Compression**: gzipper applied to dist folder after build\n- **iOS builds**: Capacitor sync required: npm run build:ios\n- **Package Manager**: pnpm for faster, more efficient dependency management\n\n## Project Conventions\n\n### Component Organization\n1. **Standalone Components** (Recommended for new code):\n   - Preferred pattern in Angular 19\n   - No NgModule declarations required\n   - Import dependencies directly in component\n\n2. **Smart/Container Components**:\n   - Handle data fetching and business logic\n   - Typically placed in feature modules\n   - Manage state and communicate with services\n\n3. **Presentational Components**:\n   - Focus on UI rendering\n   - Accept inputs, emit outputs\n   - Placed in shared/components/\n\n### Code Patterns\n1. **Routing**:\n   - Feature modules use child routing\n   - Lazy loading configured in routing modules\n   - Auth guards protect routes based on permissions\n\n2. **Forms**:\n   - Mix of template-driven and reactive forms\n   - Custom validators in shared module\n   - Form helpers for common validations\n\n3. **Error Handling**:\n   - HTTP interceptors catch API errors\n   - Global error handling through services\n   - Toast notifications for user feedback\n\n### UI/UX Standards\n1. **Loading States**: Use NgxUiLoader for consistent loading indicators\n2. **Responsive Design**: Mobile-first using Bootstrap grid\n3. **Internationalization**: All user-facing strings use translate pipe\n4. **Theming**: PrimeNG with Material preset, customized via SCSS\n";

// This is the first agent (the PR reviewer).
const generateReviewSummaryFlow = ai.defineFlow(
  {
    name: 'generateReviewSummaryFlow',
    inputSchema: GenerateReviewSummaryInputSchema,
    outputSchema: z.string(),
  },
  async ({ diff, projectContext }) => {

    let promptText = "You are an expert code reviewer for an Angular project. Your goal is to provide a concise, high-level summary of the changes in a pull request, identify potential issues categorized by priority, and suggest improvements. You must adhere to the coding standards and conventions outlined below."
      + "\n---\n"
      + systemInstructions
      + "\n---\n"
      + "Analyze the following pull request diff:\n"
      + "```diff\n"
      + diff
      + "\n```\n";

    if (projectContext) {
      promptText += "\nIn addition to the overall project conventions, please take the following specific context for THIS PR into account:\n"
        + "---\n"
        + projectContext
        + "\n---\n";
    }

    promptText += "\nPlease structure your review with the following sections, ensuring your feedback aligns with the project's architecture and conventions:\n"
      + "## Summary\n"
      + "A brief, high-level overview of the changes and how they fit into the 'Mobile Dairy Web' project.\n\n"
      + "## Potential Issues\n"
      + "Point out potential bugs, logic errors, or deviations from project conventions. For each issue, start the bullet point with a priority tag: [High], [Medium], or [Low] to indicate severity.\n\n"
      + "## Suggestions\n"
      + "Offer suggestions for improvement, such as refactoring, using existing shared services, or aligning with the specified UI/UX standards.\n\n"
      + "Provide your response in Markdown format.\n";

    const { text } = await ai.generate({
      prompt: promptText,
      model: 'googleai/gemini-2.5-flash',
    });
    return text!;
  }
);

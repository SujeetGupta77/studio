
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

// This is the first agent (the PR reviewer). It's now an internal implementation detail.
const generateReviewSummaryFlow = ai.defineFlow(
  {
    name: 'generateReviewSummaryFlow',
    inputSchema: GenerateReviewSummaryInputSchema,
    outputSchema: z.string(), // Output is just a string now
  },
  async ({ diff, projectContext }) => {

    const systemInstructions = `
# AI Coding Assistant Instructions

## Project Overview
Mobile Dairy Web is an Angular-based dairy management system supporting multiple organizations. The application handles milk collection, farmer management, invoicing, and reporting with organization-specific builds (Laxmi, SKE, Staging).

## Key Technologies
- **Frontend**: Angular 19 with TypeScript (Standalone Components & esbuild)
- **UI Libraries**: PrimeNG 19, Bootstrap 5, Angular Material 19
- **Internationalization**: ngx-translate (16.x)
- **Mobile**: Capacitor (iOS) - 8.x
- **Package Manager**: pnpm (with pnpm-lock.yaml)
- **Build Tool**: esbuild (ESBuild compiler from Angular 19)

## Core Architecture

### Module Structure
- **Admin Dashboard** (\`src/app/dashboard/admin/\`): Main feature module with lazy-loaded submodules
  - Key components in \`components/\` handle distinct business domains (collections, customers, invoicing)
  - Each feature typically has its own routing module for code-splitting
- **Shared Module** (\`src/app/shared/\`): Cross-cutting concerns
  - Common components, services, and utilities
  - Authentication, API communication, and interceptors

### Data Flow Patterns
1. **API Communication**:
   - Core services in \`shared/services/api/\`
   - \`ApiService\` for base HTTP operations
   - \`ApiHelperService\` for common data transformations
   - Interceptor handles auth tokens and error management

2. **Authentication**:
   - JWT-based auth handled by \`AuthService\`
   - Route guards in \`shared/services/auth/guard.service.ts\`
   - Session timeout management in app root

3. **State Management**:
   - Service-based state using Angular DI
   - No external state management library
   - Components communicate via services

## Development Workflows

### Environment Setup
\`\`\`bash
# Install dependencies (using pnpm)
pnpm install

# Development server
npm start

# Organization-specific builds with version management
npm run build:laxmi           # Major version bump
npm run build:laxmi:minor     # Minor version bump
npm run build:laxmi:patch     # Patch version bump
npm run build:ske             # SKE organization
npm run build:staging         # Staging environment
npm run build:prod            # Production build

# Local builds (without version bump)
npm run build:laxmi-local
npm run build:ske-local
npm run build:staging-local

# iOS development
npm run build:ios             # Capacitor sync
npm run open:ios              # Open iOS project
npm run run:ios               # Run on iOS
\`\`\`

### Build Process
- **Build Tool**: esbuild (ESBuild compiler, default from Angular 19)
- **Module Format**: Standalone components (preferred over traditional NgModules)
- **Environment-specific configuration** via file replacement in angular.json
- **Version management** through \`update-version.js\` (major, minor, patch)
- **Organization-specific builds** with conditional logic:
  - Laxmi: \`environment.isLaxmiBuild\`
  - SKE: \`environment.isSkeBuild\`
- **Compression**: gzipper applied to dist folder after build
- **iOS builds**: Capacitor sync required: \`npm run build:ios\`
- **Package Manager**: pnpm for faster, more efficient dependency management

## Project Conventions

### Component Organization
1. **Standalone Components** (Recommended for new code):
   - Preferred pattern in Angular 19
   - No NgModule declarations required
   - Import dependencies directly in component
   - Example: \`src/app/dashboard/admin/components/collections/collections.component.ts\`

2. **Smart/Container Components**:
   - Handle data fetching and business logic
   - Typically placed in feature modules
   - Manage state and communicate with services

3. **Presentational Components**:
   - Focus on UI rendering
   - Accept inputs, emit outputs
   - Placed in \`shared/components/\`
   - Example: \`shared/components/reports-data-table/\`

### Code Patterns
1. **Routing**:
   - Feature modules use child routing
   - Lazy loading configured in routing modules
   - Auth guards protect routes based on permissions

2. **Forms**:
   - Mix of template-driven and reactive forms
   - Custom validators in shared module
   - Form helpers for common validations

3. **Error Handling**:
   - HTTP interceptors catch API errors
   - Global error handling through services
   - Toast notifications for user feedback

### UI/UX Standards
1. **Loading States**: Use \`NgxUiLoader\` for consistent loading indicators
2. **Responsive Design**: Mobile-first using Bootstrap grid
3. **Internationalization**: All user-facing strings use translate pipe
4. **Theming**: PrimeNG with Material preset, customized via SCSS

## Integration Points
1. **Backend API**: RESTful endpoints defined in environment configs
2. **Mobile Platform**: Capacitor bridge for iOS native features
3. **External Systems**: ERP integration for inventory and payments

## Common Gotchas
1. **Organization-Specific Code**: Check \`environment.isLaxmiBuild\`/\`environment.isSkeBuild\`
2. **Form Validation**: Always use \`FormHelper\` for consistent validation
3. **API Error Handling**: Use \`ApiHelperService.handleError()\`
4. **Route Guards**: Check permission constants in \`utils/userFeatures.ts\`

## Testing Guidelines
1. Use Karma for unit tests with consistent patterns
2. Component tests focus on business logic
3. Mock API calls using service stubs
4. E2E tests with Protractor for critical flows
`;

    let prompt = 'You are an expert code reviewer for an Angular project. Your goal is to provide a concise, high-level summary of the changes in a pull request, identify potential issues, and suggest improvements. You must adhere to the coding standards and conventions outlined below.'
      + '\n---\n'
      + systemInstructions
      + '\n---\n'
      + 'Analyze the following pull request diff:\n'
      + '```diff\n'
      + diff
      + '\n```\n';


    if (projectContext) {
      prompt += '\nIn addition to the overall project conventions, please take the following specific context for THIS PR into account:\n'
        + '---\n'
        + projectContext
        + '\n---\n';
    }

    prompt += '\nPlease structure your review with the following sections, ensuring your feedback aligns with the project\'s architecture and conventions:\n'
      + '## Summary\n'
      + 'A brief, high-level overview of the changes and how they fit into the \'Mobile Dairy Web\' project.\n\n'
      + '## Potential Issues\n'
      + 'Point out any potential bugs, logic errors, or deviations from the established project conventions (e.g., not using Standalone Components, incorrect error handling).\n\n'
      + '## Suggestions\n'
      + 'Offer suggestions for improvement, such as refactoring, using existing shared services, or aligning with the specified UI/UX standards.\n\n'
      + 'Provide your response in Markdown format.\n';

    const { text } = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-2.5-flash',
    });
    return text!;
  }
);

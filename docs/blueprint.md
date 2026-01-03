# **App Name**: Bitbucket Buddy

## Core Features:

- PR Diff Fetching: Fetches the diff of a Bitbucket pull request using the Bitbucket API v2.
- AI Code Review: Sends the PR diff to Gemini 1.5 Flash with a system prompt for code review, focusing on bugs, security, and efficiency. Output formatted in Markdown.
- Formatted Terminal Output: Renders the AI's response in the terminal using rich.console and Markdown modules, providing a formatted document-like view.
- Review Posting: Posts the AI-generated review as a comment to the Bitbucket pull request via the Bitbucket API if the user confirms.
- Interactive CLI: Provides an interactive command-line interface for users to input the PR URL and confirm posting the review.

## Style Guidelines:

- Primary color: Soft blue (#7BB7FF) for a calm, professional feel.
- Background color: Light grey (#F0F4F7) to provide a clean and unobtrusive backdrop.
- Accent color: Subtle purple (#A685E2) to highlight key prompts or messages.
- Body and headline font: 'Inter', a grotesque-style sans-serif for a neutral, objective look.
- Simple, professional icons for clarity.
- Clean and structured layout using rich's console for readability.
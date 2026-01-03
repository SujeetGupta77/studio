
'use server';

import { generateReviewSummary } from '@/ai/flows/generate-review-summary';
import { z } from 'zod';

// Mock PR diff for demonstration purposes. In a real app, this would be fetched from the Bitbucket API.
const MOCK_DIFF = `diff --git a/src/utils/math.js b/src/utils/math.js
new file mode 100644
index 0000000..f5d1c2b
--- /dev/null
+++ b/src/utils/math.js
@@ -0,0 +1,20 @@
+/**
+ * Adds two numbers.
+ * @param {number} a
+ * @param {number} b
+ * @returns {number}
+ */
+export function add(a, b) {
+  // This is a simple function.
+  return a + b;
+}
+
+/**
+ * Executes a string as code. This is highly insecure and should never be used in production.
+ * It's a clear security vulnerability (Cross-Site Scripting - XSS).
+ * @param {string} codeString
+ */
+export function executeCode(codeString) {
+  eval(codeString);
+}
`;

const bitbucketUrlSchema = z.string().url().regex(
  /^https:\/\/bitbucket\.org\/[^/]+\/[^/]+\/pull-requests\/\d+/,
  "Please enter a valid Bitbucket PR URL (e.g., https://bitbucket.org/workspace/repo/pull-requests/123)."
);

export type ReviewState = {
  review?: string | null;
  prUrl?: string | null;
  error?: string | null;
  id: number;
};

export async function generateReviewAction(
  prevState: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const url = formData.get('prUrl') as string;

  const validation = bitbucketUrlSchema.safeParse(url);

  if (!validation.success) {
    return {
      ...prevState,
      error: validation.error.errors[0].message,
      id: prevState.id + 1,
    };
  }

  try {
    // In a real app, you would fetch the diff from the Bitbucket API here.
    console.log(`Fetching diff for PR: ${url}`);
    const diff = MOCK_DIFF;

    const review = await generateReviewSummary(diff);

    return {
      review,
      prUrl: url,
      error: null,
      id: prevState.id + 1,
    };
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      ...prevState,
      error: `Failed to generate review: ${errorMessage}`,
      id: prevState.id + 1,
    };
  }
}

export type PostReviewState = {
    message?: string;
    error?: string;
    id: number;
}

export async function postReviewAction(prevState: PostReviewState, formData: FormData): Promise<PostReviewState> {
    const review = formData.get('review') as string;
    const prUrl = formData.get('prUrl') as string;

    if (!review || !prUrl) {
        return { error: 'Missing review content or PR URL.', id: prevState.id + 1 };
    }

    try {
        const urlParts = prUrl.match(/bitbucket.org\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)/);
        if (!urlParts) {
            return { error: 'Invalid PR URL format for posting.', id: prevState.id + 1 };
        }
        const [_, workspace, repo_slug, pull_request_id] = urlParts;
        
        console.log(`Simulating POST comment to Bitbucket PR: ${prUrl}`);
        console.log(`Workspace: ${workspace}, Repo: ${repo_slug}, PR ID: ${pull_request_id}`);
        console.log('--- COMMENT CONTENT ---');
        console.log(review);
        console.log('-----------------------');

        await new Promise(resolve => setTimeout(resolve, 1000));

        return { message: 'Comment posted successfully!', id: prevState.id + 1 };

    } catch(e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        return { error: `Failed to post comment: ${errorMessage}`, id: prevState.id + 1 };
    }
}

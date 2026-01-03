
'use server';

import { generateReviewSummary } from '@/ai/flows/generate-review-summary';
import { z } from 'zod';

// Mock PR diff for demonstration purposes. In a real app, this would be fetched from the Bitbucket API.
const MOCK_DIFF = `diff --git a/src/components/ReviewerPage.tsx b/src/components/ReviewerPage.tsx
index 22b192d..9b9e3a3 100644
--- a/src/components/ReviewerPage.tsx
+++ b/src/components/ReviewerPage.tsx
@@ -1,5 +1,6 @@
 'use client';
 
+import { useEffect, useRef, useTransition } from 'react';
 import { useFormState } from 'react-dom';
 import { generateReviewAction, ReviewState } from '@/app/actions';
 import { Button } from '@/components/ui/button';
@@ -7,9 +8,7 @@
 import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
 import { AlertTriangle, LoaderCircle, Wand2 } from 'lucide-react';
-import { useEffect, useRef, useState, useTransition } from 'react';
 import { Skeleton } from './ui/skeleton';
 import ReviewDisplay from './ReviewDisplay';
 
-export default function ReviewerPage() {
+export default function ReviewerPage() {
   const initialState: ReviewState = { id: 0, review: null, prUrl: null, error: null };
   const [state, formAction] = useFormState(generateReviewAction, initialState);
   const [isPending, startTransition] = useTransition();
`;

const bitbucketUrlSchema = z.string().url().regex(
  /^https:\/\/bitbucket\.org\/[^/]+\/[^/]+\/pull-requests\/\d+/,
  "Please enter a valid Bitbucket PR URL (e.g., https://bitbucket.org/workspace/repo/pull-requests/123)."
);

export type ReviewState = {
  review?: string | null;
  prUrl?: string | null;
  username?: string | null;
  appPassword?: string | null;
  error?: string | null;
  id: number;
};

export async function generateReviewAction(
  prevState: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const url = formData.get('prUrl') as string;
  const username = formData.get('username') as string;
  const appPassword = formData.get('appPassword') as string;

  const validation = bitbucketUrlSchema.safeParse(url);

  if (!validation.success) {
    return {
      ...prevState,
      error: validation.error.errors[0].message,
      id: prevState.id + 1,
    };
  }

  if (!username || !appPassword) {
    return {
      ...prevState,
      error: 'Please provide both a username and an App Password.',
      id: prevState.id + 1,
    }
  }

  try {
    // In a real app, you would fetch the diff from the Bitbucket API here.
    console.log(`Fetching diff for PR: ${url} with user: ${username}`);
    const diff = MOCK_DIFF;

    const review = await generateReviewSummary(diff);

    return {
      review,
      prUrl: url,
      username,
      appPassword,
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
    const username = formData.get('username') as string;
    const appPassword = formData.get('appPassword') as string;

    if (!review || !prUrl || !username || !appPassword) {
        return { error: 'Missing review content, PR URL, or credentials.', id: prevState.id + 1 };
    }

    try {
        const urlParts = prUrl.match(/bitbucket.org\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)/);
        if (!urlParts) {
            return { error: 'Invalid PR URL format for posting.', id: prevState.id + 1 };
        }
        const [_, workspace, repo_slug, pull_request_id] = urlParts;
        
        console.log(`Simulating POST comment to Bitbucket PR: ${prUrl} as user ${username}`);
        console.log(`Workspace: ${workspace}, Repo: ${repo_slug}, PR ID: ${pull_request_id}`);
        console.log('--- COMMENT CONTENT ---');
        console.log(review);
        console.log('-----------------------');

        // Here you would make the actual API call to Bitbucket
        // const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${repo_slug}/pullrequests/${pull_request_id}/comments`, {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`),
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({ content: { raw: review } }),
        // });
        // if (!response.ok) {
        //     const errorText = await response.text();
        //     throw new Error(`Bitbucket API error: ${response.status} ${errorText}`);
        // }

        await new Promise(resolve => setTimeout(resolve, 1000));

        return { message: 'Comment posted successfully!', id: prevState.id + 1 };

    } catch(e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        return { error: `Failed to post comment: ${errorMessage}`, id: prevState.id + 1 };
    }
}

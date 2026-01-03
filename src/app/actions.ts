
'use server';

import { generateReviewSummary } from '@/ai/flows/generate-review-summary';
import { z } from 'zod';
import { Buffer } from 'buffer';

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
    const urlParts = url.match(/bitbucket.org\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)/);
    if (!urlParts) {
        return { ...prevState, error: 'Could not parse Bitbucket URL.', id: prevState.id + 1 };
    }
    const [_, workspace, repo_slug, pull_request_id] = urlParts;
    
    const diffUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo_slug}/pullrequests/${pull_request_id}/diff`;

    const authHeader = 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    const response = await fetch(diffUrl, {
        headers: {
            'Authorization': authHeader,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bitbucket API error: ${response.status} ${errorText}`);
    }

    const diff = await response.text();

    if (!diff) {
        return { ...prevState, error: 'Could not retrieve PR diff. The PR might be empty or an error occurred.', id: prevState.id + 1 };
    }

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
        
        const commentsUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo_slug}/pullrequests/${pull_request_id}/comments`;
        const authHeader = 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');

        const response = await fetch(commentsUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: { raw: review } }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Bitbucket API error: ${response.status} ${errorText}`);
        }

        return { message: 'Comment posted successfully!', id: prevState.id + 1 };

    } catch(e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        return { error: `Failed to post comment: ${errorMessage}`, id: prevState.id + 1 };
    }
}

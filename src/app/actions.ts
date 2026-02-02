
'use server';

import { generateReviewSummary, GenerateReviewSummaryInput } from '@/ai/flows/generate-review-summary';
import btoa from 'btoa';
import { z } from 'zod';

const bitbucketUrlSchema = z.string().url().regex(
  /^https:\/\/bitbucket\.org\/[^/]+\/[^/]+\/pull-requests\/\d+/,
  "Please enter a valid Bitbucket PR URL (e.g., https://bitbucket.org/workspace/repo/pull-requests/123)."
);

export type ReviewState = {
  review?: string | null;
  prUrl?: string | null;
  projectContext?: string | null;
  error?: string | null;
  id: number;
};

export async function generateReviewAction(
  prevState: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const url = formData.get('prUrl') as string;
  const projectContext = formData.get('projectContext') as string;
  
  const username = process.env.BITBUCKET_USERNAME;
  const appPassword = process.env.BITBUCKET_APP_PASSWORD;

  const validation = bitbucketUrlSchema.safeParse(url);

  if (!validation.success) {
    return {
      ...prevState,
      prUrl: url,
      projectContext,
      error: validation.error.errors[0].message,
      id: prevState.id + 1,
    };
  }

  if (!username || !appPassword) {
    return {
        ...prevState,
        prUrl: url,
        projectContext,
        error: "Bitbucket username and App Password are not configured in your environment variables. Please set BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD.",
        id: prevState.id + 1,
    }
  }

  // Construct the API URL from a URL like:
  // https://bitbucket.org/workspace/repo/pull-requests/123
  // to:
  // https://api.bitbucket.org/2.0/repositories/workspace/repo/pullrequests/123
  const apiUrl = url
    .replace('https://bitbucket.org/', 'https://api.bitbucket.org/2.0/repositories/')
    .replace('/pull-requests/', '/pullrequests/');

  const diffUrl = `${apiUrl}/diff`;

  try {
    const response = await fetch(diffUrl, {
        headers: {
            'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`),
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bitbucket API error: ${response.status} - ${errorText}. Please check your credentials and App Password permissions in your environment variables.`);
    }

    const diff = await response.text();

    if (!diff) {
        return {
            prUrl: url,
            projectContext,
            error: "Could not fetch diff from Bitbucket. The pull request might be empty or you may not have access.",
            id: prevState.id + 1,
        }
    }

    const review = await generateReviewSummary({ diff, projectContext });

    return {
      review,
      prUrl: url,
      projectContext,
      error: null,
      id: prevState.id + 1,
    };
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      prUrl: url,
      projectContext,
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
    
    const username = process.env.BITBUCKET_USERNAME;
    const appPassword = process.env.BITBUCKET_APP_PASSWORD;
    
    if (!review || !prUrl) {
        return { error: 'Missing required data to post review.', id: prevState.id + 1 };
    }

    if (!username || !appPassword) {
        return { error: 'Bitbucket credentials not found in environment variables.', id: prevState.id + 1 };
    }

    const apiUrl = prUrl
      .replace('https://bitbucket.org/', 'https://api.bitbucket.org/2.0/repositories/')
      .replace('/pull-requests/', '/pullrequests/');

    const commentUrl = `${apiUrl}/comments`;

    try {
        const response = await fetch(commentUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: {
                    raw: review,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Bitbucket API error: ${response.status} - ${errorText}`);
        }

        return { message: 'Comment posted successfully!', id: prevState.id + 1 };
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        return { error: `Failed to post comment: ${errorMessage}`, id: prevState.id + 1 };
    }
}


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
  const projectContext = formData.get('projectContext') as string;
  
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
        error: "Bitbucket username and App Password are required.",
        id: prevState.id + 1,
    }
  }

  // Construct the API URL for the diff
  const apiUrlBase = url.replace('https://bitbucket.org/', 'https://api.bitbucket.org/2.0/repositories/');
  const diffUrl = `${apiUrlBase}/diff`;

  try {
    const response = await fetch(diffUrl, {
        headers: {
            'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`),
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bitbucket API error: ${response.status} - ${errorText}. Please check your credentials and App Password permissions.`);
    }

    const diff = await response.text();

    if (!diff) {
        return {
            ...prevState,
            username,
            appPassword,
            error: "Could not fetch diff from Bitbucket. The pull request might be empty or you may not have access.",
            id: prevState.id + 1,
        }
    }

    const review = await generateReviewSummary({ diff, projectContext });

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
      username,
      appPassword,
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
        return { error: 'Missing required data to post review.', id: prevState.id + 1 };
    }

    const apiUrlBase = prUrl.replace('https://bitbucket.org/', 'https://api.bitbucket.org/2.0/repositories/');
    const commentUrl = `${apiUrlBase}/comments`;

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

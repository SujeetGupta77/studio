'use server';

import { generateReviewSummary } from '@/ai/flows/generate-review-summary';
import btoa from 'btoa';
import { z } from 'zod';

const bitbucketUrlSchema = z.string().url().regex(
  /^https:\/\/bitbucket\.org\/[^/]+\/[^/]+\/pull-requests\/\d+/,
  "Please enter a valid Bitbucket PR URL."
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
    return { ...prevState, prUrl: url, projectContext, error: validation.error.errors[0].message, id: prevState.id + 1 };
  }

  if (!username || !appPassword) {
    return { ...prevState, prUrl: url, projectContext, error: "Missing Bitbucket credentials in .env", id: prevState.id + 1 };
  }

  const apiUrl = url.replace('https://bitbucket.org/', 'https://api.bitbucket.org/2.0/repositories/').replace('/pull-requests/', '/pullrequests/');
  const diffUrl = `${apiUrl}/diff`;

  try {
    const response = await fetch(diffUrl, {
        headers: { 'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`) }
    });

    if (!response.ok) {
        throw new Error(`Bitbucket API error: ${response.status}`);
    }

    const diff = await response.text();
    if (!diff) {
        return { prUrl: url, projectContext, error: "PR diff is empty.", id: prevState.id + 1 };
    }

    const review = await generateReviewSummary({ diff, projectContext });

    return { review, prUrl: url, projectContext, error: null, id: prevState.id + 1 };
  } catch (e) {
    console.error(e);
    return { prUrl: url, projectContext, error: "Failed to fetch PR data.", id: prevState.id + 1 };
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
    const path = formData.get('path') as string;
    const lineStr = formData.get('line') as string;
    
    const username = process.env.BITBUCKET_USERNAME;
    const appPassword = process.env.BITBUCKET_APP_PASSWORD;
    
    if (!review || !prUrl) {
        return { error: 'Missing review text or PR URL.', id: prevState.id + 1 };
    }

    const apiUrl = prUrl.replace('https://bitbucket.org/', 'https://api.bitbucket.org/2.0/repositories/').replace('/pull-requests/', '/pullrequests/');
    const commentUrl = `${apiUrl}/comments`;

    // Construct request body
    const body: any = {
        content: { raw: review }
    };

    // If path is provided, make it an inline comment
    if (path) {
        body.inline = {
            path: path,
            to: lineStr ? parseInt(lineStr, 10) : undefined // 'to' refers to the new version of the file
        };
    }

    try {
        const response = await fetch(commentUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Bitbucket error: ${response.status} - ${errorText}`);
        }

        return { message: 'Comment posted!', id: prevState.id + 1 };
    } catch (e) {
        console.error(e);
        return { error: `Failed to post: ${e instanceof Error ? e.message : 'Unknown error'}`, id: prevState.id + 1 };
    }
}

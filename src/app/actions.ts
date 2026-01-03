
'use server';

import { generateReviewSummary } from '@/ai/flows/generate-review-summary';
import { z } from 'zod';

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

// This is a sample diff for demonstration purposes.
const sampleDiff = `
diff --git a/src/components/ReviewerPage.tsx b/src/components/ReviewerPage.tsx
index 8f7e8d6..5b8b9a5 100644
--- a/src/components/ReviewerPage.tsx
+++ b/src/components/ReviewerPage.tsx
@@ -1,13 +1,11 @@
 'use client';
 
-import { useActionState, useEffect, useRef, useTransition } from 'react';
+import { useActionState, useEffect, useRef } from 'react';
 import { generateReviewAction, ReviewState } from '@/app/actions';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
-import { AlertTriangle, KeyRound, LoaderCircle, User, Wand2 } from 'lucide-react';
+import { AlertTriangle, LoaderCircle, Wand2 } from 'lucide-react';
 import { Skeleton } from './ui/skeleton';
 import ReviewDisplay from './ReviewDisplay';
 import { Label } from './ui/label';
@@ -15,55 +13,24 @@
 export default function ReviewerPage() {
   const initialState: ReviewState = { id: 0, review: null, prUrl: null, error: null };
   const [state, formAction] = useActionState(generateReviewAction, initialState);
-  const [isPending, startTransition] = useTransition();
   const formRef = useRef<HTMLFormElement>(null);
   
-  const handleFormAction = (formData: FormData) => {
-    startTransition(() => {
-        formAction(formData);
-    });
-  }
-
   useEffect(() => {
     // This effect ensures that a new review replaces an old one if the user submits again.
     // It also clears previous errors when a new submission starts.
   }, [state.id]);
 
   return (
     <div className="space-y-6">
-      <form action={handleFormAction} ref={formRef} className="space-y-4">
-        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
-            <div className="space-y-2">
-              <Label htmlFor="username">Bitbucket Username</Label>
-              <div className="relative">
-                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
-                <Input
-                    id="username"
-                    name="username"
-                    placeholder="YourUsername"
-                    required
-                    className="pl-10"
-                    disabled={isPending}
-                />
-              </div>
-            </div>
-            <div className="space-y-2">
-              <Label htmlFor="appPassword">App Password</Label>
-              <div className="relative">
-                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
-                <Input
-                    id="appPassword"
-                    name="appPassword"
-                    type="password"
-                    placeholder="••••••••••••••••"
-                    required
-                    className="pl-10"
-                    disabled={isPending}
-                />
-              </div>
-            </div>
-        </div>
-
+      <form action={formAction} ref={formRef} className="space-y-4">
         <div className="space-y-2">
           <Label htmlFor="prUrl" className="font-medium">
             Bitbucket PR URL
@@ -74,22 +41,21 @@
             type="url"
             placeholder="https://bitbucket.org/workspace/repo/pull-requests/123"
             required
-            className="text-base"
-            disabled={isPending}
+            className="text-base"            
           />
         </div>
-        <Button type="submit" className="w-full" disabled={isPending}>
-          {isPending ? <LoaderCircle className="animate-spin" /> : <Wand2 />}
-          <span className="ml-2">{isPending ? 'Analyzing...' : 'Generate Review'}</span>
+        <Button type="submit" className="w-full">
+          <Wand2 />
+          <span className="ml-2">Generate Review</span>
         </Button>
       </form>
 
-      {state.error && !isPending && (
+      {state.error && (
         <Alert variant="destructive">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle>Error</AlertTitle>
           <AlertDescription>{state.error}</AlertDescription>
         </Alert>
       )}
 
-      {isPending && (
-        <div className="space-y-4 pt-4">
-          <Skeleton className="h-8 w-1/3 bg-muted" />
-          <Skeleton className="h-4 w-full bg-muted" />
-          <Skeleton className="h-4 w-full bg-muted" />
-          <Skeleton className="h-4 w-2/3 bg-muted" />
-        </div>
-      )}
-
-      {state.review && state.prUrl && state.username && state.appPassword && !isPending && (
+      {state.review && state.prUrl && (
         <ReviewDisplay 
           review={state.review} 
           prUrl={state.prUrl}
-          username={state.username}
-          appPassword={state.appPassword}
         />
       )}
     </div>
`;

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
    const review = await generateReviewSummary(sampleDiff);

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

    // In a real app, this would post to the Bitbucket API.
    // For now, we'll just log it to the console to simulate the action.
    console.log("--- Posting to Bitbucket (Simulation) ---");
    console.log(`PR URL: ${prUrl}`);
    console.log(`Comment: ${review}`);
    console.log("------------------------------------------");

    return { message: 'Comment posted successfully (simulated)!', id: prevState.id + 1 };
}


'use client';

import { useFormState } from 'react-dom';
import { generateReviewAction, ReviewState } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, LoaderCircle, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Skeleton } from './ui/skeleton';
import ReviewDisplay from './ReviewDisplay';

export default function ReviewerPage() {
  const initialState: ReviewState = { id: 0, review: null, prUrl: null, error: null };
  const [state, formAction] = useFormState(generateReviewAction, initialState);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  
  const handleFormAction = (formData: FormData) => {
    startTransition(() => {
        formAction(formData);
    });
  }

  useEffect(() => {
    // This effect ensures that a new review replaces an old one if the user submits again.
    // It also clears previous errors when a new submission starts.
  }, [state.id]);

  return (
    <div className="space-y-6">
      <form action={handleFormAction} ref={formRef} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="prUrl" className="font-medium">
            Bitbucket PR URL
          </label>
          <Input
            id="prUrl"
            name="prUrl"
            type="url"
            placeholder="https://bitbucket.org/workspace/repo/pull-requests/123"
            required
            className="text-base"
            disabled={isPending}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <LoaderCircle className="animate-spin" /> : <Wand2 />}
          <span className="ml-2">{isPending ? 'Analyzing...' : 'Generate Review'}</span>
        </Button>
      </form>

      {state.error && !isPending && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {isPending && (
        <div className="space-y-4 pt-4">
          <Skeleton className="h-8 w-1/3 bg-muted" />
          <Skeleton className="h-4 w-full bg-muted" />
          <Skeleton className="h-4 w-full bg-muted" />
          <Skeleton className="h-4 w-2/3 bg-muted" />
        </div>
      )}

      {state.review && state.prUrl && !isPending && (
        <ReviewDisplay review={state.review} prUrl={state.prUrl} />
      )}
    </div>
  );
}

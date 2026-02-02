
'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import { generateReviewAction, ReviewState } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, KeyRound, LoaderCircle, User, Wand2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import ReviewDisplay from './ReviewDisplay';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

export default function ReviewerPage() {
  const initialState: ReviewState = { id: 0, review: null, prUrl: null, error: null, username: null, appPassword: null };
  const [state, formAction] = useActionState(generateReviewAction, initialState);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Bitbucket Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    id="username"
                    name="username"
                    placeholder="YourUsername"
                    required
                    className="pl-10"
                    disabled={isPending}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appPassword">App Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    id="appPassword"
                    name="appPassword"
                    type="password"
                    placeholder="••••••••••••••••"
                    required
                    className="pl-10"
                    disabled={isPending}
                />
              </div>
            </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prUrl" className="font-medium">
            Bitbucket PR URL
          </Label>
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
        
        <div className="space-y-2">
            <Label htmlFor="projectContext">Project Context (Optional)</Label>
            <Textarea
                id="projectContext"
                name="projectContext"
                placeholder="Provide high-level context, coding standards, or tech stack info to improve the review..."
                className="min-h-[100px]"
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

      {state.review && state.prUrl && state.username && state.appPassword && !isPending && (
        <ReviewDisplay 
          review={state.review} 
          prUrl={state.prUrl}
          username={state.username}
          appPassword={state.appPassword}
        />
      )}
    </div>
  );
}

import ReviewerPage from '@/components/ReviewerPage';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GitPullRequestDraft } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-full items-center justify-center p-4 sm:p-8 bg-background">
      <div className="w-full max-w-2xl mx-auto">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center items-center mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <GitPullRequestDraft className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Bitbucket Buddy</CardTitle>
            <CardDescription className="text-lg text-muted-foreground pt-2">
              AI-powered code reviews for your Bitbucket Pull Requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewerPage />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

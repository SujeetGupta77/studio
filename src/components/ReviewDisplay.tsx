
'use client';

import { postReviewAction, PostReviewState } from "@/app/actions";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { LoaderCircle, Send, CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Markdown from "./Markdown";

function PostButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} variant="secondary">
            {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
            <span className="ml-2">{pending ? 'Posting...' : 'Post to Bitbucket'}</span>
        </Button>
    )
}

type ReviewDisplayProps = {
    review: string;
    prUrl: string;
    username: string;
    appPassword?: string;
}

export default function ReviewDisplay({ review, prUrl, username, appPassword }: ReviewDisplayProps) {
    const initialState: PostReviewState = { id: 0 };
    const [state, formAction] = useFormState(postReviewAction, initialState);
    const { toast } = useToast();

    useEffect(() => {
        if (state.message) {
            toast({
                title: "Success",
                description: state.message,
            });
        }
        if (state.error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: state.error,
            });
        }
    }, [state, toast]);


    return (
        <Card className="mt-6 border-primary/20 border-t-4">
            <CardHeader>
                <CardTitle>Review Analysis</CardTitle>
            </CardHeader>
            <CardContent>
                <Markdown content={review} />
                <Separator className="my-6" />
                <div className="flex justify-end">
                    {state.message ? (
                        <div className="flex items-center space-x-2 text-green-600 font-semibold p-2 rounded-md bg-green-100">
                           <CheckCircle className="h-5 w-5" />
                           <span>Review posted successfully!</span>
                        </div>
                    ) : (
                        <form action={formAction}>
                            <input type="hidden" name="review" value={review} />
                            <input type="hidden" name="prUrl" value={prUrl} />
                            <input type="hidden" name="username" value={username} />
                            <input type="hidden" name="appPassword" value={appPassword} />
                            <PostButton />
                        </form>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

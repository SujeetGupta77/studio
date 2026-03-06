
'use client';

import { postReviewAction, PostReviewState } from "@/app/actions";
import { useActionState, useEffect, useState, useMemo } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { LoaderCircle, Send, CheckCircle, FileText, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Markdown from "./Markdown";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

function PostButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending || disabled} variant="default" className="shadow-md">
            {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
            <span className="ml-2">{pending ? 'Posting...' : 'Post Selected to Bitbucket'}</span>
        </Button>
    )
}

type ReviewDisplayProps = {
    review: string;
    prUrl: string;
}

type ReviewSection = {
    title: string;
    content: string;
    items: { id: string; text: string; selected: boolean }[];
};

export default function ReviewDisplay({ review, prUrl }: ReviewDisplayProps) {
    const initialState: PostReviewState = { id: 0 };
    const [state, formAction] = useActionState(postReviewAction, initialState);
    const { toast } = useToast();

    // Parse the review into sections and items
    const initialSections = useMemo(() => {
        const sections: ReviewSection[] = [];
        const lines = review.split('\n');
        let currentSection: ReviewSection | null = null;

        lines.forEach((line, index) => {
            if (line.startsWith('## ')) {
                if (currentSection) sections.push(currentSection);
                currentSection = {
                    title: line.substring(3).trim(),
                    content: '',
                    items: []
                };
            } else if (currentSection) {
                const trimmed = line.trim();
                if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                    currentSection.items.push({
                        id: `item-${sections.length}-${currentSection.items.length}`,
                        text: trimmed.substring(2),
                        selected: true
                    });
                } else if (trimmed !== '') {
                    currentSection.content += line + '\n';
                }
            }
        });
        if (currentSection) sections.push(currentSection);
        return sections;
    }, [review]);

    const [sections, setSections] = useState<ReviewSection[]>(initialSections);

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

    const toggleItem = (sectionIndex: number, itemIndex: number) => {
        const newSections = [...sections];
        newSections[sectionIndex].items[itemIndex].selected = !newSections[sectionIndex].items[itemIndex].selected;
        setSections(newSections);
    };

    const toggleSection = (sectionIndex: number) => {
        const newSections = [...sections];
        const allSelected = newSections[sectionIndex].items.every(item => item.selected);
        newSections[sectionIndex].items.forEach(item => item.selected = !allSelected);
        setSections(newSections);
    };

    const finalReview = useMemo(() => {
        let output = '';
        sections.forEach(section => {
            const selectedItems = section.items.filter(i => i.selected);
            if (section.content.trim() || selectedItems.length > 0) {
                output += `## ${section.title}\n`;
                if (section.content.trim()) output += section.content.trim() + '\n\n';
                selectedItems.forEach(item => {
                    output += `* ${item.text}\n`;
                });
                output += '\n';
            }
        });
        return output.trim();
    }, [sections]);

    const totalSelected = sections.reduce((acc, s) => acc + s.items.filter(i => i.selected).length, 0);
    const hasSelection = totalSelected > 0 || sections.some(s => s.content.trim() !== '');

    return (
        <Card className="mt-6 border-primary/20 border-t-4 bg-gradient-to-b from-card to-background/20 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-primary" />
                        <span>Review Analysis</span>
                    </div>
                    <div className="text-xs font-normal text-muted-foreground bg-background px-2 py-1 rounded-full border">
                        {totalSelected} points selected
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-8">
                    {sections.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-4">
                            <div className="flex items-center justify-between group">
                                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                                    {section.title}
                                </h3>
                                {section.items.length > 0 && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => toggleSection(sIdx)}
                                    >
                                        {section.items.every(i => i.selected) ? 'Deselect All' : 'Select All'}
                                    </Button>
                                )}
                            </div>
                            
                            {section.content.trim() && (
                                <div className="pl-2 border-l-2 border-muted py-1 italic text-muted-foreground text-sm">
                                    <Markdown content={section.content} />
                                </div>
                            )}

                            <div className="space-y-2 pl-2">
                                {section.items.map((item, iIdx) => (
                                    <div 
                                        key={item.id} 
                                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                            item.selected 
                                            ? 'bg-primary/5 border-primary/20' 
                                            : 'bg-muted/20 border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <Checkbox 
                                            id={item.id} 
                                            checked={item.selected} 
                                            onCheckedChange={() => toggleItem(sIdx, iIdx)}
                                            className="mt-1"
                                        />
                                        <Label 
                                            htmlFor={item.id} 
                                            className="flex-1 cursor-pointer leading-relaxed text-sm font-normal"
                                        >
                                            <Markdown content={item.text} />
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <Separator className="my-8" />
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground italic">
                        {totalSelected === 0 ? "Select points above to post a comment." : "Selected points will be combined into a single comment."}
                    </div>
                    
                    {state.message ? (
                        <div className="flex items-center space-x-2 text-green-600 font-semibold p-3 rounded-md bg-green-100 dark:bg-green-900/30 dark:text-green-400 border border-green-200">
                           <CheckCircle className="h-5 w-5" />
                           <span>Comment posted successfully!</span>
                        </div>
                    ) : (
                        <form action={formAction}>
                            <input type="hidden" name="review" value={finalReview} />
                            <input type="hidden" name="prUrl" value={prUrl} />
                            <PostButton disabled={!hasSelection} />
                        </form>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

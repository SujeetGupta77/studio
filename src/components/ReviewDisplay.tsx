
'use client';

import { postReviewAction } from "@/app/actions";
import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { LoaderCircle, Send, CheckCircle, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Markdown from "./Markdown";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

type ReviewDisplayProps = {
    review: string;
    prUrl: string;
}

type ReviewItem = {
    id: string;
    text: string;
    selected: boolean;
    status: 'idle' | 'posting' | 'success' | 'error';
};

type ReviewSection = {
    id: string;
    title: string;
    content: string;
    contentStatus: 'idle' | 'posting' | 'success' | 'error';
    items: ReviewItem[];
};

export default function ReviewDisplay({ review, prUrl }: ReviewDisplayProps) {
    const { toast } = useToast();
    const [isBulkPosting, setIsBulkPosting] = useState(false);

    // Parse the review into sections and items
    const initialSections = useMemo(() => {
        const sections: ReviewSection[] = [];
        const lines = review.split('\n');
        let currentSection: ReviewSection | null = null;

        lines.forEach((line) => {
            if (line.startsWith('## ')) {
                if (currentSection) sections.push(currentSection);
                currentSection = {
                    id: `section-${sections.length}`,
                    title: line.substring(3).trim(),
                    content: '',
                    contentStatus: 'idle',
                    items: []
                };
            } else if (currentSection) {
                const trimmed = line.trim();
                if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                    currentSection.items.push({
                        id: `item-${sections.length}-${currentSection.items.length}`,
                        text: trimmed.substring(2),
                        selected: true,
                        status: 'idle'
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

    const handlePostIndividual = async (text: string, type: 'item' | 'content', sIdx: number, iIdx?: number) => {
        if (!text.trim()) return;

        // Update local state to show loading
        const newSections = [...sections];
        if (type === 'item' && iIdx !== undefined) {
            newSections[sIdx].items[iIdx].status = 'posting';
        } else {
            newSections[sIdx].contentStatus = 'posting';
        }
        setSections(newSections);

        const formData = new FormData();
        formData.append('review', text);
        formData.append('prUrl', prUrl);

        try {
            const result = await postReviewAction({ id: Date.now() }, formData);
            
            const updatedSections = [...sections];
            if (result.error) {
                if (type === 'item' && iIdx !== undefined) updatedSections[sIdx].items[iIdx].status = 'error';
                else updatedSections[sIdx].contentStatus = 'error';
                
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error,
                });
            } else {
                if (type === 'item' && iIdx !== undefined) updatedSections[sIdx].items[iIdx].status = 'success';
                else updatedSections[sIdx].contentStatus = 'success';
                
                toast({
                    title: "Success",
                    description: "Comment posted to Bitbucket.",
                });
            }
            setSections(updatedSections);
        } catch (e) {
            console.error(e);
            const errorSections = [...sections];
            if (type === 'item' && iIdx !== undefined) errorSections[sIdx].items[iIdx].status = 'error';
            else errorSections[sIdx].contentStatus = 'error';
            setSections(errorSections);
        }
    };

    const handleBulkPost = async () => {
        setIsBulkPosting(true);
        let output = '';
        sections.forEach(section => {
            const selectedItems = section.items.filter(i => i.selected && i.status !== 'success');
            const shouldIncludeContent = section.content.trim() && section.contentStatus !== 'success';
            
            if (shouldIncludeContent || selectedItems.length > 0) {
                output += `## ${section.title}\n`;
                if (shouldIncludeContent) output += section.content.trim() + '\n\n';
                selectedItems.forEach(item => {
                    output += `* ${item.text}\n`;
                });
                output += '\n';
            }
        });

        if (!output.trim()) {
            toast({ title: "No new items selected", description: "All selected items might have been posted already." });
            setIsBulkPosting(false);
            return;
        }

        const formData = new FormData();
        formData.append('review', output.trim());
        formData.append('prUrl', prUrl);

        const result = await postReviewAction({ id: Date.now() }, formData);
        
        if (result.error) {
            toast({ variant: "destructive", title: "Error", description: result.error });
        } else {
            toast({ title: "Success", description: "Selected points posted as a consolidated comment." });
            // Mark all selected as success
            const updatedSections = sections.map(s => ({
                ...s,
                contentStatus: s.content.trim() ? ('success' as const) : s.contentStatus,
                items: s.items.map(i => i.selected ? { ...i, status: 'success' as const } : i)
            }));
            setSections(updatedSections);
        }
        setIsBulkPosting(false);
    };

    const toggleItem = (sIdx: number, iIdx: number) => {
        const newSections = [...sections];
        newSections[sIdx].items[iIdx].selected = !newSections[sIdx].items[iIdx].selected;
        setSections(newSections);
    };

    const toggleSection = (sIdx: number) => {
        const newSections = [...sections];
        const allSelected = newSections[sIdx].items.every(item => item.selected);
        newSections[sIdx].items.forEach(item => item.selected = !allSelected);
        setSections(newSections);
    };

    const totalSelected = sections.reduce((acc, s) => acc + s.items.filter(i => i.selected && i.status !== 'success').length, 0);

    return (
        <Card className="mt-6 border-primary/20 border-t-4 bg-gradient-to-b from-card to-background/20 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-primary" />
                        <span>Review Analysis</span>
                    </div>
                    <div className="text-xs font-normal text-muted-foreground bg-background px-2 py-1 rounded-full border">
                        {totalSelected} points pending
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-10">
                    {sections.map((section, sIdx) => (
                        <div key={section.id} className="space-y-4">
                            <div className="flex items-center justify-between group border-b pb-2">
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
                                <div className={`relative pl-4 border-l-2 border-muted py-2 group transition-all ${section.contentStatus === 'success' ? 'opacity-50' : ''}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 text-sm italic text-muted-foreground">
                                            <Markdown content={section.content} />
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={section.contentStatus === 'success' ? "outline" : "secondary"}
                                            className="h-8 w-8 shrink-0 rounded-full"
                                            disabled={section.contentStatus === 'posting' || section.contentStatus === 'success'}
                                            onClick={() => handlePostIndividual(section.content, 'content', sIdx)}
                                            title="Post summary text as comment"
                                        >
                                            {section.contentStatus === 'posting' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 
                                             section.contentStatus === 'success' ? <Check className="h-4 w-4 text-green-600" /> : <Send className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 pl-2">
                                {section.items.map((item, iIdx) => (
                                    <div 
                                        key={item.id} 
                                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all group/item ${
                                            item.status === 'success' ? 'bg-green-50/30 border-green-100 opacity-60' :
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
                                            disabled={item.status === 'success'}
                                        />
                                        <Label 
                                            htmlFor={item.id} 
                                            className="flex-1 cursor-pointer leading-relaxed text-sm font-normal"
                                        >
                                            <Markdown content={item.text} />
                                        </Label>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className={`h-8 px-2 flex items-center gap-1.5 transition-all ${item.status === 'success' ? 'text-green-600' : 'opacity-0 group-hover/item:opacity-100'}`}
                                            disabled={item.status === 'posting' || item.status === 'success'}
                                            onClick={() => handlePostIndividual(`* ${item.text}`, 'item', sIdx, iIdx)}
                                        >
                                            {item.status === 'posting' ? <LoaderCircle className="h-3 w-3 animate-spin" /> : 
                                             item.status === 'success' ? <><Check className="h-3 w-3" /> <span className="text-[10px] font-bold uppercase">Posted</span></> : 
                                             <><Send className="h-3 w-3" /> <span className="text-[10px] font-bold uppercase">Post</span></>}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <Separator className="my-10" />
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-xl bg-muted/20 border">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold">Bulk Actions</p>
                        <p className="text-xs text-muted-foreground italic">
                            {totalSelected === 0 ? "All items posted or none selected." : `${totalSelected} selected items will be combined into one comment.`}
                        </p>
                    </div>
                    
                    <Button 
                        onClick={handleBulkPost} 
                        disabled={isBulkPosting || totalSelected === 0} 
                        variant="default" 
                        className="min-w-[200px] shadow-lg"
                    >
                        {isBulkPosting ? <LoaderCircle className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                        {isBulkPosting ? 'Posting...' : 'Post Selected Group'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

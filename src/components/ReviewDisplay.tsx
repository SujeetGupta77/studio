'use client';

import { postReviewAction } from "@/app/actions";
import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { LoaderCircle, Send, CheckCircle, FileText, Check, MapPin } from "lucide-react";
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
    cleanText: string;
    selected: boolean;
    status: 'idle' | 'posting' | 'success' | 'error';
    path?: string;
    line?: string;
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
                    const fullText = trimmed.substring(2);
                    
                    // Regex to extract file and line info: [File: path/to/file] [Line: 123]
                    const fileMatch = fullText.match(/\[File:\s*([^\]]+)\]/);
                    const lineMatch = fullText.match(/\[Line:\s*(\d+)\]/);
                    
                    const path = fileMatch ? fileMatch[1].trim() : undefined;
                    const lineVal = lineMatch ? lineMatch[1].trim() : undefined;
                    
                    // Clean text removes the metadata tags for a cleaner display
                    let cleanText = fullText;
                    if (fileMatch) cleanText = cleanText.replace(fileMatch[0], '').trim();
                    if (lineMatch) cleanText = cleanText.replace(lineMatch[0], '').trim();
                    cleanText = cleanText.replace(/\s+/g, ' '); // remove double spaces

                    currentSection.items.push({
                        id: `item-${sections.length}-${currentSection.items.length}`,
                        text: fullText,
                        cleanText: cleanText,
                        selected: true,
                        status: 'idle',
                        path,
                        line: lineVal
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

    const handlePostIndividual = async (item: ReviewItem | string, type: 'item' | 'content', sIdx: number, iIdx?: number) => {
        const text = typeof item === 'string' ? item : item.cleanText;
        if (!text.trim()) return;

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
        
        if (typeof item !== 'string') {
            if (item.path) formData.append('path', item.path);
            if (item.line) formData.append('line', item.line);
        }

        try {
            const result = await postReviewAction({ id: Date.now() }, formData);
            const updatedSections = [...sections];
            const status = result.error ? 'error' : 'success';
            
            if (type === 'item' && iIdx !== undefined) updatedSections[sIdx].items[iIdx].status = status;
            else updatedSections[sIdx].contentStatus = status;
            
            toast({
                variant: result.error ? "destructive" : "default",
                title: result.error ? "Error" : "Success",
                description: result.error || "Comment posted to Bitbucket.",
            });
            setSections(updatedSections);
        } catch (e) {
            console.error(e);
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
                    output += `* ${item.cleanText}\n`;
                });
                output += '\n';
            }
        });

        if (!output.trim()) {
            toast({ title: "No new items selected" });
            setIsBulkPosting(false);
            return;
        }

        const formData = new FormData();
        formData.append('review', output.trim());
        formData.append('prUrl', prUrl);

        const result = await postReviewAction({ id: Date.now() }, formData);
        
        if (!result.error) {
            toast({ title: "Consolidated comment posted." });
            setSections(sections.map(s => ({
                ...s,
                contentStatus: s.content.trim() ? ('success' as const) : s.contentStatus,
                items: s.items.map(i => i.selected ? { ...i, status: 'success' as const } : i)
            })));
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setIsBulkPosting(false);
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
                            <h3 className="text-lg font-bold text-primary border-b pb-2">{section.title}</h3>
                            
                            {section.content.trim() && (
                                <div className={`relative pl-4 border-l-2 border-muted py-2 flex items-start justify-between gap-4 ${section.contentStatus === 'success' ? 'opacity-50' : ''}`}>
                                    <div className="flex-1 text-sm italic text-muted-foreground">
                                        <Markdown content={section.content} />
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-8 w-8 shrink-0 rounded-full"
                                        disabled={section.contentStatus === 'posting' || section.contentStatus === 'success'}
                                        onClick={() => handlePostIndividual(section.content, 'content', sIdx)}
                                    >
                                        {section.contentStatus === 'posting' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 
                                         section.contentStatus === 'success' ? <Check className="h-4 w-4 text-green-600" /> : <Send className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>
                            )}

                            <div className="space-y-3 pl-2">
                                {section.items.map((item, iIdx) => (
                                    <div 
                                        key={item.id} 
                                        className={`flex flex-col gap-2 p-3 rounded-lg border transition-all ${
                                            item.status === 'success' ? 'bg-green-50/30 border-green-100 opacity-60' :
                                            item.selected ? 'bg-primary/5 border-primary/20' : 'bg-muted/20 border-transparent opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Checkbox 
                                                id={item.id} 
                                                checked={item.selected} 
                                                onCheckedChange={() => {
                                                    const news = [...sections];
                                                    news[sIdx].items[iIdx].selected = !news[sIdx].items[iIdx].selected;
                                                    setSections(news);
                                                }}
                                                className="mt-1"
                                                disabled={item.status === 'success'}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor={item.id} className="cursor-pointer leading-relaxed text-sm font-normal">
                                                    <Markdown content={item.cleanText} />
                                                </Label>
                                                {item.path && (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-muted/50 w-fit px-1.5 py-0.5 rounded border">
                                                        <MapPin className="h-2.5 w-2.5" />
                                                        {item.path}{item.line ? `:${item.line}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className={`h-8 px-2 flex items-center gap-1.5 ${item.status === 'success' ? 'text-green-600' : ''}`}
                                                disabled={item.status === 'posting' || item.status === 'success'}
                                                onClick={() => handlePostIndividual(item, 'item', sIdx, iIdx)}
                                            >
                                                {item.status === 'posting' ? <LoaderCircle className="h-3 w-3 animate-spin" /> : 
                                                 item.status === 'success' ? <Check className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                                                <span className="text-[10px] font-bold uppercase">
                                                    {item.status === 'posting' ? 'Posting' : item.status === 'success' ? 'Posted' : 'Post'}
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <Separator className="my-10" />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-xl bg-muted/20 border">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold">Bulk Actions (Global Comment)</p>
                        <p className="text-xs text-muted-foreground italic">Selected items will be combined into one activity feed comment.</p>
                    </div>
                    <Button onClick={handleBulkPost} disabled={isBulkPosting || totalSelected === 0} className="min-w-[200px] shadow-lg">
                        {isBulkPosting ? <LoaderCircle className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                        Post Selected Group
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// src/app/(authenticated)/project-ideas/view/page.tsx
"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, FileText, Target, Users, DollarSign, Calendar, AlertTriangle, Shield, Handshake, Megaphone, Send, Edit, Save, XCircle, Trash2, PlusCircle, SaveIcon, MessageSquare, CheckCircle, Clock, Download } from 'lucide-react';
import type { GenerateProjectProposalOutput, GenerateProjectProposalInput } from '@/ai/flows/generate-project-proposal-flow';
import type { ProjectIdea } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/hooks/use-auth';
import { createProjectIdea, updateProjectIdea, getProjectIdea } from '@/services/projectIdeaService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function ViewProjectProposalContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();

    const [proposal, setProposal] = useState<GenerateProjectProposalOutput | null>(null);
    const [originalIdea, setOriginalIdea] = useState<GenerateProjectProposalInput | null>(null);
    const [existingIdea, setExistingIdea] = useState<ProjectIdea | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const [proposalBackup, setProposalBackup] = useState<GenerateProjectProposalOutput | null>(null);
    const [adminFeedback, setAdminFeedback] = useState('');
    const proposalContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ideaId = searchParams.get('id');

        const loadData = async () => {
            setIsLoading(true);
            let ideaToLoad: ProjectIdea | null = null;
            
            const storedIdeaStr = sessionStorage.getItem('generatedProposal');
            const originalIdeaStr = sessionStorage.getItem('originalIdea');
            const selectedIdeaStr = sessionStorage.getItem('selectedProjectIdea');
            
            if (ideaId) {
                const fetchedIdea = await getProjectIdea(ideaId);
                if (fetchedIdea) {
                    ideaToLoad = fetchedIdea;
                } else if(selectedIdeaStr) {
                    ideaToLoad = JSON.parse(selectedIdeaStr);
                } else {
                     toast({ title: "Error", description: "Could not find the specified project idea.", variant: "destructive" });
                     router.replace('/project-ideas');
                     return;
                }
            } else if (storedIdeaStr && originalIdeaStr) {
                 try {
                    const parsedProposal = JSON.parse(storedIdeaStr);
                    const parsedOriginal = JSON.parse(originalIdeaStr);
                     ideaToLoad = {
                        ...parsedProposal,
                        ...parsedOriginal,
                        status: 'draft',
                     } as ProjectIdea;
                 } catch (e) {
                     toast({ title: "Error", description: "Could not load generated proposal data.", variant: "destructive" });
                     router.replace('/project-ideas');
                     return;
                 }
            } else {
                toast({ title: "No Proposal Found", description: "Please start by creating a new idea.", variant: "destructive" });
                router.replace('/project-ideas/new');
                return;
            }

            if (ideaToLoad) {
                setExistingIdea(ideaId ? ideaToLoad : null);
                setProposal({
                    projectIdea: ideaToLoad.projectIdea,
                    proposedActionPlan: ideaToLoad.proposedActionPlan,
                    implementationChallenges: ideaToLoad.implementationChallenges,
                    challengeSolutions: ideaToLoad.challengeSolutions,
                    communityInvolvement: ideaToLoad.communityInvolvement,
                    prPlan: ideaToLoad.prPlan,
                    estimatedExpenses: ideaToLoad.estimatedExpenses,
                    resourcePersonals: ideaToLoad.resourcePersonals,
                });
                setOriginalIdea({
                    projectName: ideaToLoad.projectName,
                    goal: ideaToLoad.goal,
                    targetAudience: ideaToLoad.targetAudience,
                    budget: ideaToLoad.budget,
                    timeline: ideaToLoad.timeline,
                    specialConsiderations: ideaToLoad.specialConsiderations,
                });
                setAdminFeedback(ideaToLoad.adminFeedback || '');
                
                if (!ideaId) {
                    setIsEditing(true);
                }
            }
            setIsLoading(false);
        };
        
        loadData();
        return () => {
            sessionStorage.removeItem('selectedProjectIdea');
        }
    }, [searchParams, router, toast]);

    const handleDownloadPdf = () => {
        const input = proposalContentRef.current;
        if (!input || !originalIdea) {
            toast({
                title: "Error",
                description: "Could not find proposal content to download.",
                variant: "destructive",
            });
            return;
        }

        toast({ title: "Generating PDF...", description: "Please wait a moment." });

        html2canvas(input, { scale: 2, useCORS: true, logging: false }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const imgWidth = pdfWidth - 20;
            const imgHeight = imgWidth / ratio;
            let heightLeft = imgHeight;
            let position = 10;

            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pdf.internal.pageSize.getHeight() - 20);

            while (heightLeft > 0) {
                position = -heightLeft + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= (pdf.internal.pageSize.getHeight() - 20);
            }
            pdf.save(`Project-Proposal-${originalIdea.projectName.replace(/ /g, '_')}.pdf`);
             toast({ title: "PDF Generated", description: "Your proposal is downloading." });
        }).catch(err => {
             console.error("Failed to generate PDF:", err);
             toast({ title: "PDF Generation Failed", description: "An error occurred while creating the PDF.", variant: "destructive" });
        });
    };

    const handleEdit = () => {
        setProposalBackup(JSON.parse(JSON.stringify(proposal))); // Deep copy for backup
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setProposal(proposalBackup); // Restore from backup
        setIsEditing(false);
        setProposalBackup(null);
    };
    
    const handleSaveEdits = () => {
        setIsEditing(false);
        setProposalBackup(null); // Clear backup
        toast({ title: "Changes Stored", description: "Your edits are stored locally. Save as a draft or submit for review to make them permanent." });
    };

    const handleSaveDraft = async () => {
        if (!proposal || !originalIdea || !user) return;
        setIsSubmitting(true);
        toast({ title: "Saving Draft...", description: "Please wait."});
        
        const ideaData = { ...originalIdea, ...proposal, authorId: user.id, authorName: user.name };
        
        try {
            if (existingIdea?.id) { 
                await updateProjectIdea(existingIdea.id, { ...ideaData, status: 'draft' });
                toast({ title: "Draft Updated!", description: "Your changes have been saved." });
                router.push('/project-ideas');
            } else {
                const newIdeaId = await createProjectIdea({ ...ideaData, status: 'draft' });
                toast({ title: "Draft Saved!", description: "You can find and edit it later from the Idea Hub." });
                sessionStorage.removeItem('generatedProposal');
                sessionStorage.removeItem('originalIdea');
                router.push('/project-ideas');
            }
        } catch (error) {
             console.error("Failed to save draft:", error);
             toast({ title: "Save Failed", description: "Could not save your draft.", variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSubmitForReview = async () => {
        if (!proposal || !originalIdea || !user) return;
        setIsSubmitting(true);
        toast({ title: "Submitting Proposal...", description: "Please wait."});
        
        const ideaData = { ...originalIdea, ...proposal, authorId: user.id, authorName: user.name, adminFeedback: '' };

        try {
            if (existingIdea?.id) {
                 await updateProjectIdea(existingIdea.id, { ...ideaData, status: 'pending_review' });
            } else {
                 await createProjectIdea({ ...ideaData, status: 'pending_review' });
            }
            toast({ title: "Submission Successful!", description: "Your project idea has been sent for admin review." });
            sessionStorage.removeItem('generatedProposal');
            sessionStorage.removeItem('originalIdea');
            router.push('/project-ideas');

        } catch (error) {
            console.error("Failed to submit project idea:", error);
            toast({ title: "Submission Failed", description: "Could not submit your proposal. Please try again.", variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdminAction = async (newStatus: 'approved' | 'needs_revision' | 'declined') => {
        if (!existingIdea?.id) return;
        setIsSubmitting(true);
        try {
            await updateProjectIdea(existingIdea.id, { status: newStatus, adminFeedback });
            toast({ title: "Action Complete", description: `Project has been marked as "${newStatus.replace('_', ' ')}".`});
            router.push('/admin/project-ideas');
        } catch (error) {
            console.error("Failed to update project status:", error);
            toast({ title: "Update Failed", description: "Could not update the project status.", variant: "destructive" });
        }
        setIsSubmitting(false);
    };
    
    const handleFieldChange = (section: keyof GenerateProjectProposalOutput, value: any, index?: number, field?: string) => {
        setProposal(prev => {
            if (!prev) return null;
            const newProposal = { ...prev };
            if (index !== undefined && field) {
                if (Array.isArray((newProposal as any)[section])) {
                    const newArray = [...(newProposal as any)[section]];
                    newArray[index] = { ...newArray[index], [field]: value };
                    (newProposal as any)[section] = newArray;
                }
            } else if (index !== undefined) {
                 if (Array.isArray((newProposal as any)[section])) {
                    const newArray = [...(newProposal as any)[section]];
                    newArray[index] = value;
                    (newProposal as any)[section] = newArray;
                }
            } else {
                (newProposal as any)[section] = value;
            }
            return newProposal;
        });
    };
    
    const handleActionPlanListChange = (field: keyof GenerateProjectProposalOutput['proposedActionPlan'], value: any, index: number) => {
        setProposal(prev => {
            if (!prev) return null;
            const newActionPlan = { ...prev.proposedActionPlan };
            const newArray = [...(newActionPlan as any)[field]];
            newArray[index] = value;
            (newActionPlan as any)[field] = newArray;
            return { ...prev, proposedActionPlan: newActionPlan };
        });
    };

    const handleActionPlanObjectiveChange = (value: string) => {
        setProposal(prev => {
            if (!prev) return null;
            return { ...prev, proposedActionPlan: { ...prev.proposedActionPlan, objective: value }};
        });
    };

    const handleAddItem = (section: keyof GenerateProjectProposalOutput | `proposedActionPlan.${keyof GenerateProjectProposalOutput['proposedActionPlan']}`) => {
        setProposal(prev => {
            if (!prev) return null;
            const newProposal = { ...prev };
            if (typeof section === 'string' && section.startsWith('proposedActionPlan.')) {
                const subField = section.split('.')[1] as keyof GenerateProjectProposalOutput['proposedActionPlan'];
                const newActionPlan = { ...newProposal.proposedActionPlan };
                (newActionPlan as any)[subField] = [...(newActionPlan as any)[subField], ''];
                return { ...prev, proposedActionPlan: newActionPlan };
            }
            const targetArray = (newProposal as any)[section];
            if (Array.isArray(targetArray)) {
                const isObjectArray = targetArray.length > 0 && typeof targetArray[0] === 'object' && targetArray[0] !== null;
                const newItem = isObjectArray ? { ...Object.keys(targetArray[0]).reduce((acc, key) => ({ ...acc, [key]: '' }), {}) } : '';
                (newProposal as any)[section] = [...targetArray, newItem];
            }
            return newProposal;
        });
    };

    const handleRemoveItem = (section: keyof GenerateProjectProposalOutput | `proposedActionPlan.${keyof GenerateProjectProposalOutput['proposedActionPlan']}`, index: number) => {
         setProposal(prev => {
            if (!prev) return null;
            const newProposal = { ...prev };
            if (typeof section === 'string' && section.startsWith('proposedActionPlan.')) {
                const subField = section.split('.')[1] as keyof GenerateProjectProposalOutput['proposedActionPlan'];
                const newActionPlan = { ...newProposal.proposedActionPlan };
                const newArray = [...(newActionPlan as any)[subField]];
                newArray.splice(index, 1);
                (newActionPlan as any)[subField] = newArray;
                return { ...prev, proposedActionPlan: newActionPlan };
            }
            const targetArray = (newProposal as any)[section];
            if (Array.isArray(targetArray)) {
                const newArray = [...targetArray];
                newArray.splice(index, 1);
                (newProposal as any)[section] = newArray;
            }
            return newProposal;
        });
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    if (!proposal || !originalIdea) {
        return <div className="container mx-auto py-8 text-center"><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Loading Proposal</AlertTitle><AlertDescription>Could not load proposal data.</AlertDescription></Alert><Button onClick={() => router.push('/project-ideas')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" />Back to Idea Hub</Button></div>;
    }
    const totalBudget = proposal.estimatedExpenses.reduce((acc, item) => acc + (parseFloat(item.cost) || 0), 0);
    const isOwner = !existingIdea || user?.id === existingIdea?.authorId;
    const isReviewMode = searchParams.get('mode') === 'review' && user?.role === 'admin';
    const isDraft = !existingIdea || existingIdea.status === 'draft';
    const canMemberEdit = isOwner && (isDraft || existingIdea?.status === 'needs_revision');
    
    const EditableList = ({ section, items, planSection }: { section: any, items: string[], planSection?: boolean }) => (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <Input value={item} onChange={(e) => planSection ? handleActionPlanListChange(section, e.target.value, index) : handleFieldChange(section, e.target.value, index)} />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(planSection ? `proposedActionPlan.${section}` : section, index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => handleAddItem(planSection ? `proposedActionPlan.${section}` : section)}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
        </div>
    );

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <Button variant="outline" size="sm" onClick={() => router.push(isReviewMode ? '/admin/project-ideas' : '/project-ideas')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Hub</Button>
                    <h1 className="text-3xl font-bold font-headline mt-2 text-primary">{originalIdea.projectName}</h1>
                    {isReviewMode && <Badge variant="secondary" className="mt-1">Submitted by: {existingIdea?.authorName}</Badge>}
                </div>
                 <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
                    <Button onClick={handleDownloadPdf} variant="outline" className="w-full sm:w-auto" disabled={isSubmitting || isEditing}>
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                     {canMemberEdit && (
                        <>
                            {isEditing ? (
                                <>
                                    <Button onClick={handleCancelEdit} variant="outline" className="w-full sm:w-auto"><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
                                    <Button onClick={handleSaveEdits} className="w-full sm:w-auto"><Save className="mr-2 h-4 w-4" />Save Changes</Button>
                                </>
                            ) : (
                                <Button onClick={handleEdit} variant="outline" className="w-full sm:w-auto" disabled={isSubmitting}><Edit className="mr-2 h-4 w-4" />Edit Proposal</Button>
                            )}
                             <Button onClick={handleSaveDraft} variant="secondary" className="w-full sm:w-auto" disabled={isSubmitting || isEditing}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SaveIcon className="mr-2 h-4 w-4" />} Save as Draft
                            </Button>
                            <Button onClick={handleSubmitForReview} className="w-full sm:w-auto" disabled={isSubmitting || isEditing}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit for Review
                            </Button>
                        </>
                    )}
                 </div>
            </div>
            
            {(existingIdea?.status === 'needs_revision' && adminFeedback) && (
                <Card className="border-yellow-500/50">
                    <CardHeader>
                        <CardTitle className="flex items-center text-yellow-600"><MessageSquare className="mr-2 h-5 w-5"/>Admin Feedback for Revision</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">{adminFeedback}</p>
                    </CardContent>
                </Card>
            )}
            
            <div ref={proposalContentRef} className="space-y-6 p-4 sm:p-6 border rounded-lg bg-card">
                {/* Adding a title inside the downloadable area for context */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold font-headline text-primary">{originalIdea.projectName}</h2>
                    <p className="text-muted-foreground">Project Proposal</p>
                    <Separator className="my-4"/>
                </div>

                <Card><CardHeader><CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Project Idea</CardTitle></CardHeader><CardContent>{isEditing ? (<Textarea value={proposal.projectIdea} onChange={(e) => handleFieldChange('projectIdea', e.target.value)} className="min-h-[100px]" />) : (<p className="text-muted-foreground whitespace-pre-wrap">{proposal.projectIdea}</p>)}</CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center"><Target className="mr-2 h-5 w-5 text-primary"/>Proposed Action Plan</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <div><h4 className="font-semibold text-md mb-2">Objective</h4>{isEditing ? (<Textarea value={proposal.proposedActionPlan.objective} onChange={(e) => handleActionPlanObjectiveChange(e.target.value)} />) : (<p className="text-sm text-muted-foreground pl-4 border-l-2 border-primary whitespace-pre-wrap">{proposal.proposedActionPlan.objective}</p>)}</div>
                        {(['preEventPlan', 'executionPlan', 'postEventPlan'] as const).map(planType => (<div key={planType}><h4 className="font-semibold text-md mb-2 capitalize">{planType.replace(/([A-Z])/g, ' $1').trim()}</h4>{isEditing ? (<EditableList section={planType} items={proposal.proposedActionPlan[planType]} planSection />) : (<ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">{(proposal.proposedActionPlan as any)[planType].map((item: string, index: number) => <li key={index}>{item}</li>)}</ul>)}</div>))}
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card><CardHeader><CardTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive/80"/>Implementation Challenges</CardTitle></CardHeader><CardContent>{isEditing ? (<EditableList section="implementationChallenges" items={proposal.implementationChallenges} />) : (<ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">{proposal.implementationChallenges.map((item, index) => <li key={index}>{item}</li>)}</ul>)}</CardContent></Card>
                    <Card><CardHeader><CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-green-600"/>Challenge Solutions</CardTitle></CardHeader><CardContent>{isEditing ? (<EditableList section="challengeSolutions" items={proposal.challengeSolutions} />) : (<ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">{proposal.challengeSolutions.map((item, index) => <li key={index}>{item}</li>)}</ul>)}</CardContent></Card>
                </div>
                <Card><CardHeader><CardTitle className="flex items-center"><Handshake className="mr-2 h-5 w-5 text-primary"/>Community Involvement</CardTitle></CardHeader><CardContent>{isEditing ? (<EditableList section="communityInvolvement" items={proposal.communityInvolvement} />) : (<ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">{proposal.communityInvolvement.map((item, index) => <li key={index}>{item}</li>)}</ul>)}</CardContent></Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center"><Megaphone className="mr-2 h-5 w-5 text-primary"/>PR Plan</CardTitle></CardHeader>
                    <CardContent>
                        {/* Desktop Table */}
                        <div className="hidden sm:block">
                            <Table><TableHeader><TableRow><TableHead>Activity</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead>{isEditing && <TableHead className="w-12"></TableHead>}</TableRow></TableHeader>
                                <TableBody>{proposal.prPlan.map((item, index) => (<TableRow key={index}><TableCell>{isEditing ? <Input value={item.activity} onChange={e => handleFieldChange('prPlan', e.target.value, index, 'activity')} /> : item.activity}</TableCell><TableCell>{isEditing ? <Input value={item.date} onChange={e => handleFieldChange('prPlan', e.target.value, index, 'date')} /> : item.date}</TableCell><TableCell>{isEditing ? <Input value={item.time} onChange={e => handleFieldChange('prPlan', e.target.value, index, 'time')} /> : item.time}</TableCell>{isEditing && <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem('prPlan', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>}</TableRow>))}</TableBody>
                            </Table>
                        </div>
                        {/* Mobile Cards */}
                        <div className="block sm:hidden space-y-3">
                            {proposal.prPlan.map((item, index) => (
                                 <Card key={index} className="bg-muted/50">
                                    <CardContent className="p-3 space-y-2">
                                        {isEditing ? (
                                            <>
                                                <Input value={item.activity} onChange={e => handleFieldChange('prPlan', e.target.value, index, 'activity')} placeholder="Activity"/>
                                                <div className="flex gap-2">
                                                    <Input value={item.date} onChange={e => handleFieldChange('prPlan', e.target.value, index, 'date')} placeholder="Date"/>
                                                    <Input value={item.time} onChange={e => handleFieldChange('prPlan', e.target.value, index, 'time')} placeholder="Time"/>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-semibold">{item.activity}</p>
                                                <p className="text-sm text-muted-foreground">{item.date} at {item.time}</p>
                                            </>
                                        )}
                                    </CardContent>
                                    {isEditing && (
                                        <CardFooter className="p-2 border-t justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveItem('prPlan', index)}><Trash2 className="mr-2 h-4 w-4 text-destructive"/>Remove</Button>
                                        </CardFooter>
                                    )}
                                </Card>
                            ))}
                        </div>
                       {isEditing && (<Button variant="outline" size="sm" className="mt-4" onClick={() => handleAddItem('prPlan')}><PlusCircle className="mr-2 h-4 w-4"/>Add PR Activity</Button>)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5 text-primary"/>Estimated Net Expenses (LKR)</CardTitle><CardDescription>Based on your estimate of: {originalIdea.budget}</CardDescription></CardHeader>
                    <CardContent>
                        {/* Desktop Table */}
                        <div className="hidden sm:block">
                            <Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Estimated Cost</TableHead>{isEditing && <TableHead className="w-12"></TableHead>}</TableRow></TableHeader>
                                <TableBody>
                                    {proposal.estimatedExpenses.map((item, index) => (<TableRow key={index}><TableCell>{isEditing ? <Input value={item.item} onChange={e => handleFieldChange('estimatedExpenses', e.target.value, index, 'item')} /> : item.item}</TableCell><TableCell className="text-right font-mono">{isEditing ? <Input className="text-right" value={item.cost} onChange={e => handleFieldChange('estimatedExpenses', e.target.value, index, 'cost')} /> : item.cost}</TableCell>{isEditing && <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem('estimatedExpenses', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>}</TableRow>))}
                                    <TableRow className="font-bold border-t-2"><TableCell>Total Estimated Cost</TableCell><TableCell className="text-right font-mono">{totalBudget.toFixed(2)}</TableCell>{isEditing && <TableCell></TableCell>}</TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        {/* Mobile Cards */}
                        <div className="block sm:hidden space-y-3">
                             {proposal.estimatedExpenses.map((item, index) => (
                                 <Card key={index} className="bg-muted/50">
                                    <CardContent className="p-3 space-y-2">
                                         {isEditing ? (
                                            <div className="flex gap-2">
                                                <Input value={item.item} onChange={e => handleFieldChange('estimatedExpenses', e.target.value, index, 'item')} placeholder="Item"/>
                                                <Input value={item.cost} onChange={e => handleFieldChange('estimatedExpenses', e.target.value, index, 'cost')} placeholder="Cost" className="text-right"/>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold">{item.item}</p>
                                                <p className="text-sm text-muted-foreground font-mono">{item.cost}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                    {isEditing && (
                                        <CardFooter className="p-2 border-t justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveItem('estimatedExpenses', index)}><Trash2 className="mr-2 h-4 w-4 text-destructive"/>Remove</Button>
                                        </CardFooter>
                                    )}
                                </Card>
                            ))}
                            <div className="flex justify-between items-center pt-3 border-t font-bold">
                                <p>Total Estimated Cost</p>
                                <p className="font-mono">{totalBudget.toFixed(2)}</p>
                            </div>
                        </div>
                        {isEditing && (<Button variant="outline" size="sm" className="mt-4" onClick={() => handleAddItem('estimatedExpenses')}><PlusCircle className="mr-2 h-4 w-4"/>Add Budget Item</Button>)}
                    </CardContent>
                </Card>
                <Card><CardHeader><CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Resource Personals</CardTitle></CardHeader>
                    <CardContent>
                        {isEditing ? (<EditableList section="resourcePersonals" items={proposal.resourcePersonals} />) : proposal.resourcePersonals.length > 0 ? (<ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">{proposal.resourcePersonals.map((item, index) => <li key={index}>{item}</li>)}</ul>) : (<p className="text-sm text-muted-foreground italic">No specific resource personnel listed.</p>)}
                    </CardContent>
                </Card>
            </div>

            {isReviewMode && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary"/>Admin Feedback</CardTitle>
                        <CardDescription>Provide comments for the member or approve the project.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            placeholder="e.g., 'Great idea! Please provide more details on the budget for refreshments.'..."
                            value={adminFeedback}
                            onChange={(e) => setAdminFeedback(e.target.value)}
                            className="min-h-[120px]"
                            disabled={isSubmitting}
                        />
                    </CardContent>
                    <CardFooter className="justify-end gap-2 flex-wrap">
                        <Button variant="destructive" onClick={() => handleAdminAction('declined')} disabled={isSubmitting}>
                            <XCircle className="mr-2 h-4 w-4" /> Decline
                        </Button>
                        <Button variant="outline" onClick={() => handleAdminAction('needs_revision')} disabled={isSubmitting || !adminFeedback}>
                            <Clock className="mr-2 h-4 w-4" /> Request Revision
                        </Button>
                        <Button onClick={() => handleAdminAction('approved')} disabled={isSubmitting}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}

export default function ViewProjectProposalPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
            <ViewProjectProposalContent />
        </Suspense>
    );
}

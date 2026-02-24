
// src/app/(authenticated)/admin/communication/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, CommunicationGroup } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Mail, Users, Send, Loader2, Sparkles, Search, Info, Edit, PlusCircle, Settings, Trash2, Paperclip, X, Bell, Terminal } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { generateCommunication, type GenerateCommunicationInput } from '@/ai/flows/generate-communication-flow';
import { getGroups, createGroup, updateGroup, deleteGroup } from '@/services/groupService';
import { getAllUsers } from '@/services/userService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE_MB = 2;
const MAX_TOTAL_SIZE_MB = 7;

const fileSchema = z.custom<File>(f => f instanceof File, "Expected a file.")
    .refine(file => file.size <= MAX_FILE_SIZE_MB * 1024 * 1024, `Each file must be ${MAX_FILE_SIZE_MB}MB or less.`);

const emailFormSchema = z.object({
  subject: z.string().min(3, { message: "Subject must be at least 3 characters." }),
  body: z.string().min(10, { message: "Email body must be at least 10 characters." }),
  recipientUserIds: z.array(z.string()).min(1, { message: "Please select at least one recipient." }),
  attachments: z.array(fileSchema).optional()
    .refine(files => {
        if (!files) return true;
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        return totalSize <= MAX_TOTAL_SIZE_MB * 1024 * 1024;
    }, `Total attachments size must not exceed ${MAX_TOTAL_SIZE_MB}MB.`),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;
type GroupFormState = { id?: string; name: string; memberIds: string[]; color?: string; };

const SIGNATURE_TEMPLATES = {
    'none': { label: "No Signature", value: "\n\nBest Regards," },
    'president': { label: "President's Signature", value: "\n\nBest Regards,\nLeo Menuka Wickramasinghe\nClub President\nLeo Club of Athugalpura" },
    'secretary': { label: "Secretary's Signature", value: "\n\nBest Regards,\nLeo Kavindya Gimhani\nClub Secretary\nLeo Club of Athugalpura" },
    'general': { label: "General Club Signature", value: "\n\nBest Regards,\nLeo Club of Athugalpura\nLEO District 306 D9" }
};

export default function CommunicationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [members, setMembers] = useState<User[]>([]);
  const [groups, setGroups] = useState<CommunicationGroup[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  
  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");
  
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<GroupFormState | null>(null);
  const [groupMemberSearchTerm, setGroupMemberSearchTerm] = useState('');
  const [groupToDelete, setGroupToDelete] = useState<CommunicationGroup | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { subject: "", body: "", recipientUserIds: [], attachments: [] },
  });
  
  const watchedAttachments = form.watch('attachments') || [];

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isSuperOrAdmin) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, isSuperOrAdmin]);

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
        const [fetchedGroups, fetchedUsers] = await Promise.all([
            getGroups(),
            getAllUsers(),
        ]);
        setGroups(fetchedGroups);
        const approvedMembers = fetchedUsers.filter(u => u.status === 'approved' && ['admin', 'member', 'super_admin'].includes(u.role)).sort((a,b) => (a.name || "").localeCompare(b.name || ""));
        setMembers(approvedMembers);
    } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: "Error", description: "Could not load members or groups.", variant: "destructive"});
    }
    setIsLoadingData(false);
  }, [toast]);
  
  useEffect(() => {
    if (user && isSuperOrAdmin) {
      fetchData();
    }
  }, [user, fetchData, isSuperOrAdmin]);

  const filteredMembers = useMemo(() => {
    return members.filter(member => 
        (member.name?.toLowerCase() || '').includes(recipientSearchTerm.toLowerCase()) ||
        (member.email?.toLowerCase() || '').includes(recipientSearchTerm.toLowerCase())
    );
  }, [members, recipientSearchTerm]);
  
  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const getTextColorForBackground = (hexColor: string): 'black' | 'white' => {
    if (!hexColor) return 'black';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
  };

  const handleGenerateContent = async () => {
    if (!aiTopic.trim()) {
        toast({ title: "Topic Required", description: "Please enter a topic for the AI to write about.", variant: "destructive"});
        return;
    }
    setIsGenerating(true);
    try {
        const input: GenerateCommunicationInput = { topic: aiTopic };
        const result = await generateCommunication(input);
        form.setValue("subject", result.subject, { shouldValidate: true });
        form.setValue("body", result.body, { shouldValidate: true });
        toast({ title: "Content Generated", description: "The email subject and body have been populated." });
    } catch (error) {
        console.error("Error generating AI content:", error);
        toast({ title: "AI Generation Failed", description: "Could not generate content. Please try again or check your API key.", variant: "destructive"});
    }
    setIsGenerating(false);
  }

  const handleSignatureChange = (signatureKey: keyof typeof SIGNATURE_TEMPLATES) => {
    const currentBody = form.getValues("body");
    const bodyWithoutSignature = Object.values(SIGNATURE_TEMPLATES).reduce(
      (body, sig) => body.replace(sig.value, ''),
      currentBody
    );
    const newBody = bodyWithoutSignature.trim() + (SIGNATURE_TEMPLATES[signatureKey].value || "");
    form.setValue("body", newBody, { shouldValidate: true });
  };
  
    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

  const onSubmit = async (data: EmailFormValues) => {
    setFormSubmitting(true);
    
    const recipients = data.recipientUserIds.map(userId => members.find(m => m.id === userId)).filter(Boolean) as User[];
    const recipientEmails = recipients.map(r => r.email).filter(Boolean);
    if(recipientEmails.length === 0) {
        toast({ title: "No valid recipients", description: "Selected members do not have valid email addresses.", variant: "destructive"});
        setFormSubmitting(false);
        return;
    }
    
    let attachmentsForApi: { filename: string, content: string, contentType: string }[] = [];
    if (data.attachments && data.attachments.length > 0) {
        try {
            attachmentsForApi = await Promise.all(data.attachments.map(async (file) => ({
                filename: file.name,
                content: (await fileToBase64(file)).split(',')[1],
                contentType: file.type
            })));
        } catch (error) {
            toast({ title: "Attachment Error", description: "Could not process attachments. Please try again.", variant: "destructive" });
            setFormSubmitting(false);
            return;
        }
    }


    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            to: recipientEmails.join(','), 
            subject: data.subject, 
            body: data.body,
            attachments: attachmentsForApi
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `API request failed with status ${response.status}`);
      }

      toast({ title: "Emails Sent", description: `Successfully sent email to ${recipients.length} member(s).` });
      form.reset();
      form.setValue("recipientUserIds", []);
      setAiTopic("");

    } catch (error: any) {
      console.error("Failed to send email batch:", error);
      toast({ title: "Email Send Error", description: `Failed to send emails: ${error.message}`, variant: "destructive", duration: 10000 });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const currentSelection = new Set(form.getValues("recipientUserIds"));
    const filteredIds = new Set(filteredMembers.map(m => m.id));

    if (checked) {
        filteredIds.forEach(id => currentSelection.add(id));
    } else {
        filteredIds.forEach(id => currentSelection.delete(id));
    }
    form.setValue("recipientUserIds", Array.from(currentSelection));
  };
  
  const handleSelectGroup = (memberIds: string[]) => {
    const currentSelection = new Set(form.getValues("recipientUserIds"));
    memberIds.forEach(id => currentSelection.add(id));
    form.setValue("recipientUserIds", Array.from(currentSelection), { shouldValidate: true });
    toast({ title: "Group Selected", description: `${memberIds.length} members added to recipients.` });
  };
  
  const watchedRecipients = form.watch("recipientUserIds");

  // Group Management Functions
  const handleOpenGroupForm = (group?: CommunicationGroup) => {
    if (group) {
        setSelectedGroupForEdit({ id: group.id, name: group.name, memberIds: group.memberIds, color: group.color || '#cccccc' });
    } else {
        setSelectedGroupForEdit({ name: '', memberIds: [], color: '#cccccc' });
    }
    setGroupMemberSearchTerm('');
    setIsGroupFormOpen(true);
  };
  
  const handleGroupFormSubmit = async () => {
    if (!selectedGroupForEdit || !selectedGroupForEdit.name.trim()) {
        toast({ title: "Group name is required.", variant: "destructive" });
        return;
    }
    setIsGroupSubmitting(true);
    try {
        if (selectedGroupForEdit.id) {
            await updateGroup(selectedGroupForEdit.id, { name: selectedGroupForEdit.name, memberIds: selectedGroupForEdit.memberIds, color: selectedGroupForEdit.color });
            toast({ title: "Group Updated" });
        } else {
            await createGroup(selectedGroupForEdit.name, selectedGroupForEdit.memberIds, selectedGroupForEdit.color);
            toast({ title: "Group Created" });
        }
        fetchData();
        setIsGroupFormOpen(false);
        setSelectedGroupForEdit(null);
    } catch (error: any) {
        toast({ title: "Error", description: `Could not save group: ${error.message}`, variant: "destructive"});
    }
    setIsGroupSubmitting(false);
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsGroupSubmitting(true);
    try {
        await deleteGroup(groupToDelete.id);
        toast({ title: "Group Deleted" });
        fetchData();
    } catch (error: any) {
         toast({ title: "Error", description: `Could not delete group: ${error.message}`, variant: "destructive"});
    }
    setIsGroupSubmitting(false);
    setIsDeleteAlertOpen(false);
    setGroupToDelete(null);
  };
  
  const filteredGroupMembers = useMemo(() => {
    return members.filter(member => 
        (member.name?.toLowerCase() || '').includes(groupMemberSearchTerm.toLowerCase()) ||
        (member.email?.toLowerCase() || '').includes(groupMemberSearchTerm.toLowerCase())
    );
  }, [members, groupMemberSearchTerm]);

  if (authLoading || isLoadingData || !user || !isSuperOrAdmin) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  const totalAttachmentSize = watchedAttachments.reduce((acc, file) => acc + file.size, 0);

  const testLocalNotification = () => {
    if (!("Notification" in window)) {
      toast({ title: "Not Supported", description: "This browser does not support desktop notifications.", variant: "destructive" });
      return;
    }

    if (Notification.permission === "granted") {
      new Notification("LeoPortal Test", {
        body: "Local notification is working correctly!",
        icon: "/icon-192x192.png"
      });
      toast({ title: "Success", description: "Local notification triggered." });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("LeoPortal Test", {
            body: "Local notification is working correctly!",
            icon: "/icon-192x192.png"
          });
        }
      });
    } else {
      toast({ title: "Permission Denied", description: "Notifications are blocked. Please enable them in your browser settings.", variant: "destructive" });
    }
  };
  
  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl sm:text-3xl font-bold font-headline">Send Communication</h1></div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle className="flex items-center text-xl"><Users className="mr-2 h-5 w-5 text-primary" /> Select Recipients</CardTitle>
                  <CardDescription className="text-sm">Choose who will receive this email.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (<Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />) : members.length > 0 ? (
                <>
                  <div className="mb-4">
                      <Label>Select by Group</Label>
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {groups.map(group => (
                           <Button 
                              key={group.id} 
                              type="button" 
                              size="sm" 
                              variant="secondary" 
                              onClick={() => handleSelectGroup(group.memberIds)}
                              style={{ 
                                  backgroundColor: group.color || 'hsl(var(--secondary))',
                                  color: getTextColorForBackground(group.color || '#ffffff'),
                                  borderColor: getTextColorForBackground(group.color || '#ffffff')
                              }}
                              className="bg-secondary/20 text-secondary-foreground hover:opacity-80"
                            >
                              {group.name} ({group.memberIds.length})
                            </Button>
                        ))}
                        <Dialog open={isGroupFormOpen} onOpenChange={setIsGroupFormOpen}>
                          <DialogTrigger asChild>
                             <Button type="button" variant="outline" size="sm" className="border-dashed" onClick={() => handleOpenGroupForm()}> <Settings className="mr-2 h-4 w-4"/>Manage Groups</Button>
                          </DialogTrigger>
                           <DialogContent className="sm:max-w-3xl">
                             <DialogHeader><DialogTitle>Manage Communication Groups</DialogTitle></DialogHeader>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                <div className="space-y-4">
                                  <h3 className="font-semibold">My Groups</h3>
                                  <ScrollArea className="h-72 border rounded-md p-2">
                                    {groups.length > 0 ? (
                                        <div className="space-y-2">
                                          {groups.map(group => (
                                            <div key={group.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                                              <div className="flex items-center gap-2">
                                                <div className="h-4 w-4 rounded-full" style={{backgroundColor: group.color || '#ccc'}}></div>
                                                <div>
                                                  <p className="font-medium">{group.name}</p>
                                                  <p className="text-xs text-muted-foreground">{group.memberIds.length} member(s)</p>
                                                </div>
                                              </div>
                                              <div className="flex items-center">
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenGroupForm(group)}><Edit className="h-4 w-4"/></Button>
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => {setGroupToDelete(group); setIsDeleteAlertOpen(true);}}><Trash2 className="h-4 w-4"/></Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                    ) : (<p className="text-center text-sm text-muted-foreground py-4">No groups created yet.</p>)}
                                  </ScrollArea>
                                </div>
                                <div className="space-y-4">
                                  <h3 className="font-semibold">{selectedGroupForEdit?.id ? `Editing: ${selectedGroupForEdit.name}` : 'Create New Group'}</h3>
                                  {selectedGroupForEdit && (
                                    <div className="space-y-4">
                                      <div className="flex items-end gap-2">
                                        <div className="flex-grow"><Label htmlFor="group-name">Group Name</Label><Input id="group-name" value={selectedGroupForEdit.name} onChange={(e) => setSelectedGroupForEdit({...selectedGroupForEdit, name: e.target.value})} placeholder="e.g., Executive Committee"/></div>
                                        <div><Label htmlFor="group-color">Color</Label><Input id="group-color" type="color" value={selectedGroupForEdit.color} onChange={(e) => setSelectedGroupForEdit({...selectedGroupForEdit, color: e.target.value})} className="h-10 p-1"/></div>
                                      </div>
                                      <div><Label>Members</Label><div className="relative mt-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search members..." value={groupMemberSearchTerm} onChange={(e) => setGroupMemberSearchTerm(e.target.value)} className="pl-10"/></div>
                                          <ScrollArea className="h-48 border rounded-md p-2 mt-2">
                                            {filteredGroupMembers.length > 0 ? (
                                              <div className="space-y-2">{filteredGroupMembers.map(member => (<div key={member.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted/30"><Checkbox id={`member-${member.id}`} checked={selectedGroupForEdit.memberIds.includes(member.id)} onCheckedChange={(checked) => { const newMemberIds = checked ? [...selectedGroupForEdit.memberIds, member.id] : selectedGroupForEdit.memberIds.filter(id => id !== member.id); setSelectedGroupForEdit({...selectedGroupForEdit, memberIds: newMemberIds});}}/><Avatar className="h-8 w-8"><AvatarImage src={member.photoUrl} alt={member.name} data-ai-hint="profile avatar" /><AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">{getInitials(member.name)}</AvatarFallback></Avatar><label htmlFor={`member-${member.id}`} className="text-sm font-medium leading-none cursor-pointer">{member.name}<p className="text-xs text-muted-foreground">{member.email}</p></label></div>))}</div>
                                            ) : (<p className="text-center text-sm text-muted-foreground py-4">No members found.</p>)}
                                          </ScrollArea><Badge variant="secondary" className="mt-2">Selected: {selectedGroupForEdit.memberIds.length}</Badge>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={() => setSelectedGroupForEdit({ name: '', memberIds: [], color: '#cccccc' })}>Clear</Button>
                                        <Button type="button" onClick={handleGroupFormSubmit} disabled={isGroupSubmitting || !selectedGroupForEdit?.name.trim()}>{isGroupSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (selectedGroupForEdit?.id ? 'Save Changes' : 'Create Group')}</Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="outline" disabled={isGroupSubmitting}>Close</Button></DialogClose>
                              </DialogFooter>
                           </DialogContent>
                        </Dialog>
                      </div>
                  </div>
                  

                  <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search recipients by name or email..." value={recipientSearchTerm} onChange={(e) => setRecipientSearchTerm(e.target.value)} className="pl-10"/></div>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0 mb-4 p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center space-x-2"><Checkbox id="select-all-members" onCheckedChange={(checked) => handleSelectAll(checked as boolean)} checked={filteredMembers.length > 0 && filteredMembers.every(m => watchedRecipients.includes(m.id))} disabled={filteredMembers.length === 0}/><Label htmlFor="select-all-members" className="font-medium text-sm cursor-pointer">Select All ({filteredMembers.length})</Label></div>
                    <span className="text-xs text-muted-foreground sm:ml-auto">(Total Selected: {watchedRecipients.length} / {members.length})</span>
                  </div>
                  <ScrollArea className="h-60 border rounded-md p-2 sm:p-4">
                    {filteredMembers.length > 0 ? (<FormField control={form.control} name="recipientUserIds" render={() => (<div className="space-y-2">{filteredMembers.map((member) => (<FormField key={member.id} control={form.control} name="recipientUserIds" render={({ field }) => (<FormItem key={member.id} className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded hover:bg-muted/30"><FormControl><Checkbox checked={field.value?.includes(member.id)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), member.id]) : field.onChange((field.value || []).filter((value) => value !== member.id)) }}/></FormControl><FormLabel className="font-normal text-sm cursor-pointer flex-1">{member.name} <span className="text-xs text-muted-foreground">({member.email})</span></FormLabel></FormItem>)}/>))}</div>)}/>
                    ) : (<p className="text-center text-sm text-muted-foreground py-4">No members match your search.</p>)}
                  </ScrollArea><FormMessage className="mt-2">{form.formState.errors.recipientUserIds?.message}</FormMessage>
                </>
              ) : (<p className="text-center text-muted-foreground py-4">No approved members found.</p>)}
            </CardContent>
          </Card>
          
          <Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center text-xl"><Sparkles className="mr-2 h-5 w-5 text-primary" /> AI Content Assistant</CardTitle></CardHeader><CardContent className="space-y-3"><Alert><Info className="h-4 w-4" /><AlertTitle>How to use the Topic field</AlertTitle><AlertDescription className="text-xs leading-relaxed"><ol className="list-decimal list-inside space-y-1 mt-1"><li>Be specific. Instead of "meeting," try "Monthly meeting reminder for August".</li><li>Include key details if you have them, like "charity drive on Saturday at the main hall".</li><li>The AI will automatically write in a professional and friendly tone suitable for the club.</li></ol></AlertDescription></Alert><div><Label htmlFor="ai-topic">Email Topic</Label><div className="flex items-center gap-2 mt-1"><Input id="ai-topic" placeholder="e.g., Beach cleanup event this weekend" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} disabled={isGenerating || formSubmitting}/><Button type="button" onClick={handleGenerateContent} disabled={isGenerating || formSubmitting}>{isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate</Button></div></div></CardContent></Card>
          <Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center text-xl"><Mail className="mr-2 h-5 w-5 text-primary" /> Compose Email</CardTitle><CardDescription className="text-sm">Write or edit the subject and body of your email.</CardDescription></CardHeader><CardContent className="space-y-4">
            <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="Important Update: Upcoming Event" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="body" render={({ field }) => (<FormItem><FormLabel>Body</FormLabel><FormControl><Textarea placeholder="Dear members, ..." className="resize-y min-h-[150px] sm:min-h-[200px]" {...field}/></FormControl><FormMessage /></FormItem>)}/>
            <FormItem><FormLabel className="flex items-center"><Edit className="mr-1.5 h-4 w-4 text-muted-foreground"/> Signature</FormLabel><Select onValueChange={(value) => handleSignatureChange(value as keyof typeof SIGNATURE_TEMPLATES)}><FormControl><SelectTrigger><SelectValue placeholder="Select a signature template" /></SelectTrigger></FormControl><SelectContent>{Object.entries(SIGNATURE_TEMPLATES).map(([key, template]) => (<SelectItem key={key} value={key}>{template.label}</SelectItem>))}</SelectContent></Select><FormDescription className="text-xs">Select a signature to append to your email body.</FormDescription></FormItem>
            
            <FormField
              control={form.control}
              name="attachments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Paperclip className="mr-1.5 h-4 w-4 text-muted-foreground" /> Attachments</FormLabel>
                  <FormControl>
                      <div>
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => {
                                const newFiles = Array.from(e.target.files || []);
                                const currentFiles = field.value || [];
                                field.onChange([...currentFiles, ...newFiles]);
                            }}
                        />
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={formSubmitting}>
                           <PlusCircle className="mr-2 h-4 w-4" /> Add Files
                        </Button>
                      </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                     Max file size: {MAX_FILE_SIZE_MB}MB. Total limit: {MAX_TOTAL_SIZE_MB}MB.
                  </FormDescription>
                  {watchedAttachments.length > 0 && (
                    <div className="space-y-2 pt-2">
                        {watchedAttachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 text-sm rounded-md border bg-muted/50">
                                <span className="truncate pr-2">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                    const newFiles = [...watchedAttachments];
                                    newFiles.splice(index, 1);
                                    field.onChange(newFiles);
                                }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                         <div className="text-xs font-medium text-muted-foreground pt-1">
                            Total size: {(totalAttachmentSize / 1024 / 1024).toFixed(2)}MB / {MAX_TOTAL_SIZE_MB}MB
                         </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent></Card>
          
          <div className="flex justify-end"><Button type="submit" className="w-full sm:w-auto" disabled={formSubmitting || isLoadingData || watchedRecipients.length === 0} size="lg">{formSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{formSubmitting ? "Sending..." : `Send Email to ${watchedRecipients.length} Member(s)`}</Button></div>
        </form>
      </Form>

      <Card className="shadow-lg border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Bell className="mr-2 h-5 w-5 text-primary" /> Test PWA Notifications
          </CardTitle>
          <CardDescription>Verify if push notifications are configured correctly on your device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-semibold flex items-center">
                Step 1: Test Browser Permission
              </h3>
              <p className="text-xs text-muted-foreground">Check if your browser can show basic notifications while the app is open.</p>
              <Button type="button" variant="outline" size="sm" onClick={testLocalNotification}>
                Trigger Local Test Notification
              </Button>
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-semibold flex items-center">
                Step 2: Test Background Push (Virtual)
              </h3>
              <p className="text-xs text-muted-foreground">Simulate a real background push notification using Chrome DevTools.</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="secondary" size="sm">
                    <Terminal className="mr-2 h-4 w-4" /> View DevTools Instructions
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Virtual Push Test Guide</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm leading-relaxed">
                    <ol className="list-decimal list-inside space-y-3">
                      <li>Open this PWA in Chrome on your desktop.</li>
                      <li>Open DevTools (press <strong>F12</strong> or <strong>Right-click &gt; Inspect</strong>).</li>
                      <li>Navigate to the <strong>Application</strong> tab.</li>
                      <li>Select <strong>Service Workers</strong> in the left sidebar.</li>
                      <li>Find <strong>firebase-messaging-sw.js</strong> in the list.</li>
                      <li>In the <strong>Push</strong> input box, paste this snippet:
                        <pre className="mt-2 p-2 bg-muted rounded-md overflow-x-auto text-[10px]">
                          {`{ "notification": { "title": "LEO Portal", "body": "It works! Push received.", "icon": "/icon-192x192.png" } }`}
                        </pre>
                      </li>
                      <li>Click the <strong>Push</strong> button in DevTools.</li>
                    </ol>
                    <Alert variant="default" className="bg-primary/5 border-primary/10">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        If successful, a notification will appear even if the tab is hidden. This confirms the Service Worker is correctly processing push events.
                      </AlertDescription>
                    </Alert>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
       <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the "{groupToDelete?.name}" group. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteGroup} className={cn(buttonVariants({ variant: "destructive" }))}>{isGroupSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

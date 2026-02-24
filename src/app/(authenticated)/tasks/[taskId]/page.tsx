
// src/app/(authenticated)/tasks/[taskId]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Task, User, Event, TaskComment, TaskChecklistItem } from '@/types';
import { getTask, updateTask, deleteTask, getTaskComments, addTaskComment } from '@/services/taskService';
import { getAllUsers } from '@/services/userService';
import { getEvents } from '@/services/eventService';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
import { Loader2, ArrowLeft, Calendar, User as UserIcon, Tag, Flag, CheckSquare, MessageSquare, Paperclip, Send, Trash2, Edit, X, PlusCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function TaskDetailsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const taskId = params.taskId as string;

    const [task, setTask] = useState<Task | null>(null);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allEvents, setAllEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    
    const [newComment, setNewComment] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editedChecklist, setEditedChecklist] = useState<TaskChecklistItem[]>([]);

    const fetchTaskDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            const [taskData, commentsData, usersData, eventsData] = await Promise.all([
                getTask(taskId),
                getTaskComments(taskId),
                getAllUsers(),
                getEvents()
            ]);

            if (!taskData) {
                toast({ title: "Error", description: "Task not found.", variant: "destructive" });
                router.push('/tasks');
                return;
            }
            setTask(taskData);
            setEditedChecklist(taskData.checklist || []);
            setComments(commentsData);
            setAllUsers(usersData);
            setAllEvents(eventsData);

        } catch (error) {
            console.error("Failed to fetch task details:", error);
            toast({ title: "Error", description: "Could not load task details.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [taskId, router, toast]);

    useEffect(() => {
        fetchTaskDetails();
    }, [fetchTaskDetails]);

    const assignees = useMemo(() => {
        return allUsers.filter(u => task?.assigneeIds.includes(u.id));
    }, [task, allUsers]);

    const handleCommentSubmit = async () => {
        if (!newComment.trim() || !user) return;
        setIsCommenting(true);
        try {
            await addTaskComment(taskId, {
                authorId: user.id,
                authorName: user.name,
                authorPhotoUrl: user.photoUrl,
                content: newComment,
            });
            setNewComment('');
            fetchTaskDetails(); // Re-fetch to get new comment
        } catch (error) {
             toast({ title: "Error", description: "Could not post comment.", variant: "destructive" });
        }
        setIsCommenting(false);
    };

    const handleDeleteTask = async () => {
        setIsDeleting(true);
        try {
            await deleteTask(taskId);
            toast({ title: "Task Deleted" });
            router.push('/tasks');
        } catch (error) {
            toast({ title: "Error", description: "Could not delete task.", variant: "destructive" });
            setIsDeleting(false);
        }
    };
    
    const handleToggleChecklistItem = async (itemId: string, completed: boolean) => {
        if (!task) return;
        const newChecklist = task.checklist.map(item =>
            item.id === itemId ? { ...item, completed } : item
        );
        try {
            await updateTask(taskId, { checklist: newChecklist });
            setTask(prev => prev ? { ...prev, checklist: newChecklist } : null);
        } catch (error) {
             toast({ title: "Error", description: "Could not update checklist.", variant: "destructive" });
        }
    };

    const handleUpdateChecklist = async () => {
        if(!task) return;
        try {
            await updateTask(taskId, { checklist: editedChecklist });
            setTask(prev => prev ? { ...prev, checklist: editedChecklist } : null);
            setIsEditing(false);
            toast({ title: "Checklist updated" });
        } catch (error) {
             toast({ title: "Error", description: "Could not save checklist changes.", variant: "destructive" });
        }
    };

    const checklistProgress = useMemo(() => {
        if (!task || !task.checklist || task.checklist.length === 0) return 0;
        const completed = task.checklist.filter(item => item.completed).length;
        return (completed / task.checklist.length) * 100;
    }, [task]);
    
    const getInitials = (name?: string) => {
      if (!name) return "??";
      const names = name.split(' ');
      if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (!task) {
        return <div className="text-center py-10">Task not found.</div>;
    }

    return (
        <div className="container mx-auto max-w-4xl py-8 space-y-6">
            <Button variant="outline" size="sm" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Board</Button>
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-2xl font-headline">{task.title}</CardTitle>
                        {user?.role !== 'member' && (
                            <Button variant="destructive" size="sm" onClick={() => setIsDeleteAlertOpen(true)}><Trash2 className="mr-2 h-4 w-4"/> Delete Task</Button>
                        )}
                    </div>
                    {task.eventName && <CardDescription>Part of project: <span className="font-semibold text-primary">{task.eventName}</span></CardDescription>}
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                        </div>
                        <Separator/>
                        {task.checklist && (
                             <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold flex items-center"><CheckSquare className="mr-2 h-5 w-5 text-primary"/> Checklist</h4>
                                    {user?.role !== 'member' && !isEditing && (<Button variant="ghost" size="sm" onClick={() => { setEditedChecklist(task.checklist); setIsEditing(true);}}><Edit className="mr-2 h-4 w-4"/>Edit</Button>)}
                                </div>
                                <Progress value={checklistProgress} className="h-2 mb-2" />
                                <div className="space-y-2">
                                    {isEditing ? (
                                        <>
                                            {editedChecklist.map((item, index) => (
                                                <div key={item.id} className="flex items-center gap-2">
                                                    <Input value={item.text} onChange={(e) => {
                                                        const newList = [...editedChecklist];
                                                        newList[index].text = e.target.value;
                                                        setEditedChecklist(newList);
                                                    }}/>
                                                     <Button variant="ghost" size="icon" onClick={() => setEditedChecklist(editedChecklist.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                </div>
                                            ))}
                                            <Button size="sm" variant="outline" onClick={() => setEditedChecklist([...editedChecklist, {id: `new_${Date.now()}`, text: '', completed: false}])}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button>
                                            <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}><X className="mr-2 h-4 w-4"/>Cancel</Button><Button size="sm" onClick={handleUpdateChecklist}><Edit className="mr-2 h-4 w-4"/>Save Checklist</Button></div>
                                        </>
                                    ) : (
                                        task.checklist.map(item => (
                                            <div key={item.id} className="flex items-center gap-2">
                                                <Checkbox id={item.id} checked={item.completed} onCheckedChange={(checked) => handleToggleChecklistItem(item.id, !!checked)} />
                                                <label htmlFor={item.id} className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.text}</label>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                        
                    </div>
                    <div className="space-y-4">
                        <InfoItem icon={Tag} label="Status" value={<Badge className="capitalize">{task.status.replace('_', ' ')}</Badge>} />
                        <InfoItem icon={Flag} label="Priority" value={<Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="capitalize">{task.priority}</Badge>} />
                        {task.dueDate && <InfoItem icon={Calendar} label="Due Date" value={format(parseISO(task.dueDate), 'MMM dd, yyyy')} />}
                        <div>
                            <h4 className="text-sm font-semibold flex items-center mb-2"><UserIcon className="mr-2 h-4 w-4"/> Assignees</h4>
                            <div className="flex flex-wrap gap-2">
                                {assignees.map(a => <Avatar key={a.id} className="h-8 w-8"><AvatarImage src={a.photoUrl} alt={a.name}/><AvatarFallback>{getInitials(a.name)}</AvatarFallback></Avatar>)}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary"/> Comments</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {comments.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                            <Avatar className="h-9 w-9"><AvatarImage src={comment.authorPhotoUrl} /><AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback></Avatar>
                            <div>
                                <div className="flex items-baseline gap-2"><p className="font-semibold text-sm">{comment.authorName}</p><p className="text-xs text-muted-foreground">{format(parseISO(comment.createdAt), 'MMM d, p')}</p></div>
                                <p className="text-sm bg-muted p-2 rounded-md">{comment.content}</p>
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-3 pt-4">
                         <Avatar className="h-9 w-9"><AvatarImage src={user?.photoUrl} /><AvatarFallback>{getInitials(user?.name)}</AvatarFallback></Avatar>
                         <div className="flex-grow space-y-2">
                            <Textarea placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} disabled={isCommenting}/>
                            <Button size="sm" onClick={handleCommentSubmit} disabled={!newComment.trim() || isCommenting}>{isCommenting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>} Post</Button>
                         </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the task "{task.title}". This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTask} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                           {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div>
        <h4 className="text-sm font-semibold flex items-center mb-1"><Icon className="mr-2 h-4 w-4"/> {label}</h4>
        <div className="text-sm text-muted-foreground pl-6">{value}</div>
    </div>
);

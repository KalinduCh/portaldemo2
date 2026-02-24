// src/components/tasks/task-card.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import type { Task, User, Event } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Flag, Calendar, MessageSquare, CheckSquare, Paperclip, GripVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TaskCardProps {
    task: Task;
    users: User[];
    events: Event[];
}

export function TaskCard({ task, users, events }: TaskCardProps) {
    const assignees = users.filter(u => task.assigneeIds.includes(u.id));
    const event = events.find(e => e.id === task.eventId);
    
    const checklistProgress = task.checklist && task.checklist.length > 0 
        ? (task.checklist.filter(item => item.completed).length / task.checklist.length) * 100 
        : 0;

    const getInitials = (name?: string) => {
      if (!name) return "??";
      const names = name.split(' ');
      if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    };

    return (
        <Link href={`/tasks/${task.id}`}>
            <Card className="mb-3 hover:shadow-lg transition-shadow cursor-grab group active:cursor-grabbing">
                <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                        <p className="font-semibold text-md group-hover:text-primary">{task.title}</p>
                         <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </div>
                    {event && <Badge variant="secondary" className="text-xs mt-1">{event.name}</Badge>}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                        <div className="flex items-center gap-2">
                           {task.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/> {format(parseISO(task.dueDate), 'MMM d')}</span>}
                           {task.checklist && task.checklist.length > 0 && <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3"/> {Math.round(checklistProgress)}%</span>}
                        </div>
                         <div className="flex items-center gap-1">
                            {assignees.slice(0, 3).map(a => (
                                <TooltipProvider key={a.id} delayDuration={100}>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={a.photoUrl} alt={a.name}/>
                                                <AvatarFallback className="text-xs">{getInitials(a.name)}</AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent><p>{a.name}</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
                            {assignees.length > 3 && <span className="text-xs font-bold">+{assignees.length - 3}</span>}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

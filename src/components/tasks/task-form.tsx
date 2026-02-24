
// src/components/tasks/task-form.tsx
"use client";

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CalendarIcon, Loader2, Check } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus, User, Event } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const taskFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.date().optional(),
  assigneeIds: z.array(z.string()).min(1, "At least one assignee is required."),
  eventId: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  task?: Task | null;
  users: User[];
  events: Event[];
  onSubmit: (data: TaskFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TaskForm({ task, users, events, onSubmit, onCancel, isLoading }: TaskFormProps) {
    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskFormSchema),
        defaultValues: {
            title: task?.title || "",
            description: task?.description || "",
            priority: task?.priority || 'medium',
            dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
            assigneeIds: task?.assigneeIds || [],
            eventId: task?.eventId || undefined,
        },
    });

    const approvedMembers = users.filter(u => u.status === 'approved');

    const handleFormSubmit = async (values: TaskFormValues) => {
        const submissionValues = { ...values };
        if (submissionValues.eventId === 'standalone') {
            submissionValues.eventId = undefined;
        }
        await onSubmit(submissionValues);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="priority" render={({ field }) => (
                        <FormItem><FormLabel>Priority *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="dueDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl><Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button></FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                            </Popover>
                        <FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField
                    control={form.control}
                    name="eventId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Link to Event/Project (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select an event..."/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="standalone">Standalone Task</SelectItem>
                                    {events.map(event => <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="assigneeIds"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Assignees *</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                            {field.value.length > 0 ? `${field.value.length} selected` : "Select members..."}
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search members..." />
                                        <CommandList>
                                            <CommandEmpty>No members found.</CommandEmpty>
                                            <CommandGroup>
                                                {approvedMembers.map(member => (
                                                    <CommandItem
                                                        key={member.id}
                                                        onSelect={() => {
                                                            const selected = field.value.includes(member.id)
                                                                ? field.value.filter(id => id !== member.id)
                                                                : [...field.value, member.id];
                                                            field.onChange(selected);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", field.value.includes(member.id) ? "opacity-100" : "opacity-0")} />
                                                        {member.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} {task ? "Save Changes" : "Create Task"}</Button>
                </div>
            </form>
        </Form>
    );
}

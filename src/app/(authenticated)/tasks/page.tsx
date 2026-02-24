// src/app/(authenticated)/tasks/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Task, TaskStatus, TaskPriority, User, Event } from '@/types';
import { getTasks, updateTaskStatus } from '@/services/taskService';
import { getAllUsers } from '@/services/userService';
import { getEvents } from '@/services/eventService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Filter, ListChecks } from 'lucide-react';
import { TaskCard } from '@/components/tasks/task-card';
import { TaskForm, type TaskFormValues } from '@/components/tasks/task-form';
import { createTask } from '@/services/taskService';
import { cn } from '@/lib/utils';
import { produce } from 'immer';

const ItemTypes = {
    TASK: 'task',
};

const columns: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'In Review',
    done: 'Done',
};

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  users: User[];
  events: Event[];
  onDropTask: (taskId: string, newStatus: TaskStatus) => void;
}

const TaskColumn: React.FC<TaskColumnProps> = ({ status, tasks, users, events, onDropTask }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.TASK,
        drop: (item: { id: string }) => {
            onDropTask(item.id, status);
        },
        collect: monitor => ({
            isOver: !!monitor.isOver(),
        }),
    }));

    return (
        <Card
            ref={drop}
            className={cn("min-h-[200px] transition-colors", isOver ? 'bg-muted/50' : 'bg-card')}
        >
            <CardHeader>
                <CardTitle>{columns[status]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {tasks.map((task) => (
                    <DraggableTaskCard key={task.id} task={task} users={users} events={events} />
                ))}
                {tasks.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No tasks in this column.</p>}
            </CardContent>
        </Card>
    );
};

interface DraggableTaskCardProps {
    task: Task;
    users: User[];
    events: Event[];
}

const DraggableTaskCard: React.FC<DraggableTaskCardProps> = ({ task, users, events }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.TASK,
        item: { id: task.id },
        collect: monitor => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
            <TaskCard task={task} users={users} events={events} />
        </div>
    );
};

export default function TasksPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allEvents, setAllEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    const [filter, setFilter] = useState<'all' | 'my_tasks'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [eventFilter, setEventFilter] = useState<string>('all');
    
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedTasks, fetchedUsers, fetchedEvents] = await Promise.all([
                getTasks(),
                getAllUsers(),
                getEvents()
            ]);
            setTasks(fetchedTasks);
            setAllUsers(fetchedUsers);
            setAllEvents(fetchedEvents);
        } catch (error) {
            console.error("Failed to fetch tasks data:", error);
            toast({ title: "Error", description: "Could not load tasks.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [toast]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
        // Optimistic update
        setTasks(prevTasks =>
            produce(prevTasks, draft => {
                const task = draft.find(t => t.id === taskId);
                if (task) {
                    task.status = newStatus;
                }
            })
        );
        
        // Update in backend
        updateTaskStatus(taskId, newStatus)
            .then(() => {
                toast({ title: "Task Updated", description: "Task status changed successfully." });
            })
            .catch(error => {
                console.error("Failed to update task status:", error);
                toast({ title: "Update Failed", description: "Could not update task status.", variant: "destructive" });
                // Revert UI on failure
                fetchData();
            });
    }, [toast, fetchData]);


    const filteredTasks = useMemo(() => {
        let filtered = tasks;

        if (filter === 'my_tasks' && user) {
            filtered = filtered.filter(task => task.assigneeIds.includes(user.id));
        }

        if (searchTerm) {
            filtered = filtered.filter(task => task.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        
        if (eventFilter !== 'all') {
            if (eventFilter === 'standalone') {
                 filtered = filtered.filter(task => !task.eventId);
            } else {
                 filtered = filtered.filter(task => task.eventId === eventFilter);
            }
        }

        return filtered;
    }, [tasks, filter, user, searchTerm, eventFilter]);
    
    const handleCreateTask = async (data: TaskFormValues) => {
        if (!user) return;
        try {
            await createTask({ ...data, createdBy: user.id });
            toast({ title: "Task Created", description: "New task has been added." });
            setIsFormOpen(false);
            fetchData();
        } catch (error) {
            console.error("Failed to create task:", error);
            toast({ title: "Error", description: "Could not create task.", variant: "destructive" });
        }
    };
    
    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold font-headline flex items-center">
                    <ListChecks className="mr-3 h-8 w-8 text-primary" />
                    Task Management
                </h1>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />Create Task</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create a New Task</DialogTitle>
                        </DialogHeader>
                        <TaskForm
                            onSubmit={handleCreateTask}
                            users={allUsers}
                            events={allEvents}
                            onCancel={() => setIsFormOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                     <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                             <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5 text-primary"/>Filters</CardTitle>
                             <CardDescription>Filter tasks to narrow down your view.</CardDescription>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-end gap-2 w-full md:w-auto">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="search-task">Search</Label>
                                <Input id="search-task" placeholder="Search by task title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="filter-user">View</Label>
                                <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
                                    <SelectTrigger id="filter-user"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Tasks</SelectItem>
                                        <SelectItem value="my_tasks">My Tasks</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="filter-event">Event/Project</Label>
                                <Select value={eventFilter} onValueChange={setEventFilter}>
                                    <SelectTrigger id="filter-event"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Events</SelectItem>
                                        <SelectItem value="standalone">Standalone Tasks</SelectItem>
                                        {allEvents.map(event => (
                                            <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {isLoading ? (
                <div className="flex justify-center items-center h-96">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {(Object.keys(columns) as TaskStatus[]).map(status => (
                        <TaskColumn
                            key={status}
                            status={status}
                            tasks={filteredTasks
                                .filter(task => task.status === status)
                                .sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1))
                            }
                            users={allUsers}
                            events={allEvents}
                            onDropTask={handleUpdateTaskStatus}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

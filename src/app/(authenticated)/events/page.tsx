
// src/app/(authenticated)/events/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Event, EventType } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, Edit, Eye, CalendarDays, Loader2, MapPin, Trash2, QrCode, Download } from "lucide-react";
import { format, parseISO, isPast, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getEvents, deleteEvent as deleteEventService } from '@/services/eventService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import QRCode from "react-qr-code";
import html2canvas from 'html2canvas';

const eventTypeColors: Record<EventType, string> = {
  club_project: 'bg-teal-500',
  district_project: 'bg-blue-500',
  joint_project: 'bg-purple-500',
  official_visit: 'bg-amber-500',
  deadline: 'bg-red-500',
  other: 'bg-slate-500',
};

export default function EventManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [qrCodeEvent, setQrCodeEvent] = useState<Event | null>(null);
  const qrCodePrintRef = useRef<HTMLDivElement>(null);
  
  const handleDownloadQrCode = () => {
    if (!qrCodePrintRef.current || !qrCodeEvent) return;

    html2canvas(qrCodePrintRef.current, { backgroundColor: null }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `QR_Code_${qrCodeEvent.name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };


  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isSuperOrAdmin) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, isSuperOrAdmin]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedEvents = await getEvents();
      setEvents(fetchedEvents);
    } catch (error: any) {
      console.error("Failed to fetch events:", error);
      toast({ title: "Error", description: `Could not load events: ${error.message}`, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (user && isSuperOrAdmin) {
      fetchEvents();
    }
  }, [user, fetchEvents, isSuperOrAdmin]);
  
  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
    setIsDeleteAlertOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!eventToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteEventService(eventToDelete.id);
      toast({ title: "Event Deleted", description: `"${eventToDelete.name}" has been removed.` });
      fetchEvents();
    } catch (error: any) {
      toast({ title: "Error", description: `Could not delete event: ${error.message}`, variant: "destructive" });
    }
    setIsSubmitting(false);
    setIsDeleteAlertOpen(false);
    setEventToDelete(null);
  };

  const { upcomingEvents, pastEvents } = React.useMemo(() => {
    const upcoming: Event[] = [];
    const past: Event[] = [];

    events.forEach(event => {
      if (!event.startDate || !isValid(parseISO(event.startDate))) {
        return;
      }
      
      const startDate = parseISO(event.startDate);
      const endDate = event.endDate && isValid(parseISO(event.endDate))
          ? parseISO(event.endDate)
          : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

      if (isPast(endDate)) {
        past.push(event);
      } else {
        upcoming.push(event);
      }
    });

    return {
      upcomingEvents: upcoming.sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()),
      pastEvents: past.sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())
    };
  }, [events]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperOrAdmin) return null;
  
  const renderEventList = (eventList: Event[], listType: 'upcoming' | 'past') => (
    eventList.length > 0 ? (
      <div className="space-y-4">
        {eventList.map(event => (
          <EventListItem 
            key={event.id} 
            event={event} 
            onEdit={() => router.push(`/events/${event.id}`)}
            onDelete={() => handleDeleteClick(event)} 
            onViewSummary={() => router.push(`/admin/event-summary/${event.id}`)}
            onShowQrCode={() => setQrCodeEvent(event)}
          />
        ))}
      </div>
    ) : (
      <div className="text-center py-16 text-muted-foreground">
        <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold">No {listType} events</h3>
        <p className="mt-1 text-sm">{listType === 'upcoming' ? 'Create a new event to get started.' : 'There are no past events to show.'}</p>
      </div>
    )
  );

  const getEventUrl = (eventId: string) => {
    return `https://leoportal.netlify.app/login?eventId=${eventId}`;
  };

  return (
    <>
      <div className="container mx-auto py-4 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline">Event Management</h1>
          <Button onClick={() => router.push('/events/new')} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Event
          </Button>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-6">
                {renderEventList(upcomingEvents, 'upcoming')}
            </TabsContent>
            <TabsContent value="past" className="mt-6">
                {renderEventList(pastEvents, 'past')}
            </TabsContent>
        </Tabs>
      </div>
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event "{eventToDelete?.name}" and all its associated attendance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={cn(buttonVariants({ variant: "destructive" }))}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={!!qrCodeEvent} onOpenChange={(isOpen) => !isOpen && setQrCodeEvent(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Attendance QR Code for: {qrCodeEvent?.name}</DialogTitle>
            </DialogHeader>
            <div className="p-4 flex flex-col items-center justify-center">
                <div ref={qrCodePrintRef} className="bg-white p-6 rounded-lg text-center">
                    <h3 className="text-xl font-bold text-black mb-2">{qrCodeEvent?.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">Scan to mark attendance</p>
                    {qrCodeEvent && <QRCode value={getEventUrl(qrCodeEvent.id)} size={256} />}
                     <p className="text-xs text-gray-500 mt-4">LEO Portal</p>
                </div>
                <div className="flex items-center gap-2 mt-6">
                    <Button onClick={handleDownloadQrCode} variant="outline"><Download className="mr-2 h-4 w-4" /> Download</Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface EventListItemProps {
  event: Event;
  onEdit: () => void;
  onDelete: () => void;
  onViewSummary: () => void;
  onShowQrCode: () => void;
}

const EventListItem = ({ event, onEdit, onDelete, onViewSummary, onShowQrCode }: EventListItemProps) => {
    let formattedDate = { day: 'N/A', month: 'N/A' };
    if(event.startDate && isValid(parseISO(event.startDate))) {
        const dateObj = parseISO(event.startDate);
        formattedDate = {
            day: format(dateObj, 'dd'),
            month: format(dateObj, 'MMM')
        };
    }
  
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow group">
        <div className="flex">
            <div className="flex flex-col items-center justify-center p-4 border-r w-24 bg-muted/30">
                <span className="text-3xl font-bold text-primary">{formattedDate.day}</span>
                <span className="text-sm font-semibold text-muted-foreground uppercase">{formattedDate.month}</span>
            </div>
            <div className="flex-grow">
                 <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-primary group-hover:underline text-lg pr-2">{event.name}</h3>
                        <Badge variant="outline" className={cn("capitalize text-xs border-transparent", eventTypeColors[event.eventType || 'other'], 'text-white')}>
                            {event.eventType?.replace(/_/g, ' ') || 'Other'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                    <p className="text-sm text-muted-foreground flex items-center">
                        <CalendarDays className="mr-2 h-4 w-4"/>
                        {event.startDate && isValid(parseISO(event.startDate)) ? format(parseISO(event.startDate), 'p') : 'Time not set'}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center">
                        <MapPin className="mr-2 h-4 w-4"/>
                        {event.location || "No location specified"}
                    </p>
                </CardContent>
            </div>
        </div>
        <CardFooter className="flex justify-end gap-2 border-t pt-3 pb-3 px-4 bg-muted/20">
            <Button variant="outline" size="sm" onClick={onShowQrCode}>
                <QrCode className="mr-1.5 h-3.5 w-3.5" /> QR Code
            </Button>
            <Button variant="outline" size="sm" onClick={onViewSummary}>
                <Eye className="mr-1.5 h-3.5 w-3.5" /> Summary
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
        </CardFooter>
    </Card>
  );
};

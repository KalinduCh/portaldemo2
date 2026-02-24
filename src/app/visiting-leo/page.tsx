
// src/app/visiting-leo/page.tsx
"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Event } from '@/types';
import { getEvents, getEvent } from '@/services/eventService';
import { VisitorAttendanceForm, type VisitorAttendanceFormValues } from '@/components/events/visitor-attendance-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CalendarDays, MapPin, CheckCircle, AlertTriangle, Clock, Navigation } from 'lucide-react';
import { format, parseISO, isPast, isFuture, isValid, isWithinInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { markVisitorAttendance } from '@/services/attendanceService';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentPosition, calculateDistanceInMeters, MAX_ATTENDANCE_DISTANCE_METERS } from '@/lib/geolocation';
import { Badge } from '@/components/ui/badge';

function VisitingLeoContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const logoUrl = "https://i.imgur.com/aRktweQ.png";

  const eventIdFromUrl = searchParams.get('eventId');

  const fetchEventsData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (eventIdFromUrl) {
        const singleEvent = await getEvent(eventIdFromUrl);
        if (singleEvent) {
          setSelectedEvent(singleEvent);
          setIsFormOpen(true);
        } else {
          toast({ title: "Event Not Found", description: "The event from the QR code could not be found.", variant: "destructive" });
        }
      } else {
        const allEvents = await getEvents();
        const activeEvents = allEvents.filter(event => {
          if (!event.startDate || !isValid(parseISO(event.startDate))) {
              return false;
          }
          const startDate = parseISO(event.startDate);
          if (event.endDate && isValid(parseISO(event.endDate))) {
              const endDate = parseISO(event.endDate);
              return !isPast(endDate);
          }
          const oneDayAfterStart = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
          return !isPast(oneDayAfterStart);
        }).sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
        setEvents(activeEvents);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
      toast({ title: "Error", description: "Could not load events data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast, eventIdFromUrl]);

  useEffect(() => {
    fetchEventsData();
  }, [fetchEventsData]);

  const handleOpenForm = (event: Event) => {
    setSelectedEvent(event);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: VisitorAttendanceFormValues) => {
    if (!selectedEvent || !selectedEvent.id) {
      toast({ title: "Error", description: "No event selected or event ID is missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    let userLatitude: number | undefined = undefined;
    let userLongitude: number | undefined = undefined;
    const isGeoRestrictionActive = typeof selectedEvent.latitude === 'number' && typeof selectedEvent.longitude === 'number';

    try {
      if (isGeoRestrictionActive && selectedEvent.latitude && selectedEvent.longitude) { 
        toast({ title: "Verifying Location...", description: "Please wait while we check your location.", duration: 4000 });
        const position = await getCurrentPosition(); 
        userLatitude = position.latitude;
        userLongitude = position.longitude;
        
        const distance = calculateDistanceInMeters(
          position.latitude,
          position.longitude,
          selectedEvent.latitude, 
          selectedEvent.longitude
        );

        if (distance > MAX_ATTENDANCE_DISTANCE_METERS) {
          toast({
            title: "Too Far",
            description: `You must be within ${MAX_ATTENDANCE_DISTANCE_METERS}m of the event. You are ~${Math.round(distance)}m away.`,
            variant: "destructive",
            duration: 7000,
          });
          setIsSubmitting(false);
          return;
        }
        toast({ title: "Location Verified", description: `You are within the allowed radius (${Math.round(distance)}m). Submitting...`, duration: 3000 });
      }

      const result = await markVisitorAttendance(selectedEvent.id, data, userLatitude, userLongitude);

      if (result.status === 'success') {
        toast({ title: "Attendance Marked!", description: `Thank you, ${data.name}, for marking your attendance for ${selectedEvent.name}.` });
        setIsFormOpen(false);
        setSelectedEvent(null);
      } else {
        toast({ title: "Submission Error", description: result.message || "Could not mark attendance.", variant: "destructive" });
      }

    } catch (error: any) {
      console.error("Error during visitor attendance submission process:", error);
      let description = "Could not mark attendance.";
      const errorMessage = error.message || "An unknown error occurred.";

      if (errorMessage.includes("Geolocation is not supported")) {
        description = "Geolocation is not supported by your browser.";
      } else if (errorMessage.includes("User denied the request")) {
        description = "Location permission denied. Please enable location services to mark attendance.";
      } else if (errorMessage.includes("Location information is unavailable") || errorMessage.includes("timed out")) {
        description = "Could not determine your location. Please try again.";
      } else {
        description = `Could not mark attendance: ${errorMessage}`;
      }
      toast({ title: "Submission Error", description, variant: "destructive", duration: 10000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4 text-primary">
            <Image 
                src={logoUrl} 
                alt="LEO Portal Logo" 
                width={40} 
                height={40} 
                className="h-10 w-10 rounded-md"
                data-ai-hint="club logo"
            />
            <h1 className="text-3xl font-bold font-headline">LEO Portal</h1>
          </Link>
          <h2 className="text-2xl font-semibold text-foreground">Visiting Leo Attendance</h2>
          <p className="text-muted-foreground">Welcome! Please select an event to mark your attendance.</p>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : events.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-4">
              {events.map(event => {
                let formattedEventDate = "Date unavailable";
                if (event.startDate && isValid(parseISO(event.startDate))) {
                    const eventStartDateObj = parseISO(event.startDate);
                    formattedEventDate = format(eventStartDateObj, "MMM d, yyyy, h:mm a");
                    if (event.endDate && isValid(parseISO(event.endDate))) {
                        const eventEndDateObj = parseISO(event.endDate);
                        if (eventEndDateObj.toDateString() !== eventStartDateObj.toDateString()) {
                          formattedEventDate = `${format(eventStartDateObj, "MMM d, h:mm a")} - ${format(eventEndDateObj, "MMM d, h:mm a")}`;
                        } else {
                          formattedEventDate = `${format(eventStartDateObj, "MMM d, yyyy, h:mm a")} - ${format(eventEndDateObj, "h:mm a")}`;
                        }
                    }
                }

                const now = new Date();
                const startDate = parseISO(event.startDate);
                const endDate = event.endDate && isValid(parseISO(event.endDate)) ? parseISO(event.endDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

                let eventStatus: 'Ongoing' | 'Upcoming' = 'Upcoming';
                if (isWithinInterval(now, { start: startDate, end: endDate })) {
                    eventStatus = 'Ongoing';
                }

                const isButtonDisabled = eventStatus !== 'Ongoing';

                return (
                <Card key={event.id} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="font-headline text-xl text-primary pr-2">{event.name}</CardTitle>
                        <Badge variant={eventStatus === 'Ongoing' ? 'default' : 'secondary'} className={eventStatus === 'Ongoing' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}>
                            {eventStatus}
                        </Badge>
                    </div>
                    <CardDescription className="flex items-center text-sm pt-1">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {formattedEventDate}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start text-sm">
                      <MapPin className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{event.location}</span>
                    </div>
                    {typeof event.latitude === 'number' && typeof event.longitude === 'number' && (
                        <div className="flex items-start text-xs text-green-600 mt-2">
                            <Navigation className="mr-2 h-3 w-3 mt-0.5 shrink-0" />
                            <span>Geo-restricted attendance enabled.</span>
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{event.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={() => handleOpenForm(event)} disabled={isButtonDisabled}>
                      {isButtonDisabled ? <Clock className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      {isButtonDisabled ? "Event Not Started" : "Mark My Attendance"}
                    </Button>
                  </CardFooter>
                </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle className="flex items-center justify-center">
                <AlertTriangle className="mr-2 h-6 w-6 text-destructive" /> No Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">There are no upcoming or ongoing events scheduled at this moment. Please check back later.</p>
              <Button asChild variant="link" className="mt-4">
                <Link href="/login">Return to Login</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {selectedEvent && (
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) {
                setSelectedEvent(null);
                // If the page was loaded via a URL parameter, redirect to the main page on close
                if (eventIdFromUrl) {
                    router.push('/visiting-leo');
                }
            }
            setIsFormOpen(open);
          }}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-headline text-xl">Mark Attendance for: {selectedEvent.name}</DialogTitle>
                <DialogDescription>
                  Please provide your details. Fields marked with * are required.
                </DialogDescription>
              </DialogHeader>
              <VisitorAttendanceForm
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsFormOpen(false);
                  setSelectedEvent(null);
                  if (eventIdFromUrl) router.push('/visiting-leo');
                }}
                isLoading={isSubmitting}
                eventDate={selectedEvent.startDate && isValid(parseISO(selectedEvent.startDate)) ? format(parseISO(selectedEvent.startDate), "MMMM d, yyyy, h:mm a") : "Date not available"}
              />
            </DialogContent>
          </Dialog>
        )}
        <footer className="mt-8 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} LEO Portal. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default function VisitingLeoPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background py-8 px-4 flex justify-center items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
            <VisitingLeoContent />
        </Suspense>
    );
}

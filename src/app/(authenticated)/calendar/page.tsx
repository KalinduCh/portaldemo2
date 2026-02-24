
// src/app/(authenticated)/calendar/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import iCalendarPlugin from '@fullcalendar/icalendar';
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction';
import { getEvents } from '@/services/eventService';
import type { Event as MyEvent } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon, MapPin, Info, Clock, Navigation, CalendarPlus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid, isWithinInterval, isPast, getMonth, getYear, formatISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';


const eventTypeColors: Record<MyEvent['eventType'] & string, { backgroundColor: string; borderColor: string; }> = {
  club_project: { backgroundColor: '#10B981', borderColor: '#059669' },
  district_project: { backgroundColor: '#3B82F6', borderColor: '#2563EB' },
  joint_project: { backgroundColor: '#8B5CF6', borderColor: '#7C3AED' },
  official_visit: { backgroundColor: '#F59E0B', borderColor: '#D97706' },
  deadline: { backgroundColor: '#EF4444', borderColor: '#DC2626' },
  other: { backgroundColor: '#6B7280', borderColor: '#4B5563' },
};

export default function CalendarPage() {
  const [clubEvents, setClubEvents] = useState<MyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [monthlyEvents, setMonthlyEvents] = useState<MyEvent[]>([]);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  const [selectedEvent, setSelectedEvent] = useState<MyEvent | null>(null);
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetEvents, setSheetEvents] = useState<MyEvent[]>([]);
  const [sheetDate, setSheetDate] = useState<Date | null>(null);


  const fetchCalendarEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const allEvents = await getEvents();
      setClubEvents(allEvents);
      updateMonthlyEvents(new Date(), allEvents);
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
      toast({ title: "Error", description: "Could not load calendar data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);
  
  const updateMonthlyEvents = (date: Date, allEvents: MyEvent[]) => {
      const month = getMonth(date);
      const year = getYear(date);
      const filtered = allEvents.filter(e => {
        if (!e.startDate) return false;
        const eventDate = parseISO(e.startDate);
        return getMonth(eventDate) === month && getYear(eventDate) === year;
      }).sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
      setMonthlyEvents(filtered);
  };


  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const allEventSources = useMemo(() => {
    const calendarEvents = clubEvents.map((event: MyEvent) => {
        const color = event.eventType ? eventTypeColors[event.eventType] : eventTypeColors.other;
        return {
          title: event.name,
          start: event.startDate ? parseISO(event.startDate) : new Date(),
          end: event.endDate ? parseISO(event.endDate) : undefined,
          extendedProps: { ...event },
          ...color
        };
      });

      const holidaySource = {
        url: 'https://ics.calendarlabs.com/517/c62b9b29/Sri_Lanka_Holidays.ics',
        format: 'ics',
        color: '#FFEBEE', // light pink background
        borderColor: '#E57373',
        textColor: '#C62828',
      };
      
      return [calendarEvents, holidaySource];

  }, [clubEvents]);

  const handleEventClick = (clickInfo: any) => {
    if (clickInfo.event.extendedProps.id) { // This is one of our events
      setSelectedEvent(clickInfo.event.extendedProps as MyEvent);
    } else { // This is a holiday
      setSelectedEvent({
        id: clickInfo.event.title, // Use title as a pseudo-id
        name: clickInfo.event.title,
        startDate: clickInfo.event.startStr,
        description: 'Public Holiday in Sri Lanka',
        location: '',
        reminderSent: false,
        eventType: 'other' // Treat as 'other' for display purposes
      });
    }
    setSheetOpen(true);
  };
  
  const handleDateClick = (arg: DateClickArg) => {
      const clickedDate = arg.date;
      const eventsOnDate = allEventSources[0].filter((e: any) => {
          const eventStart = new Date(e.start);
          const eventEnd = e.end ? new Date(e.end) : eventStart;
          return isWithinInterval(clickedDate, { start: eventStart, end: eventEnd });
      }).map((e: any) => e.extendedProps as MyEvent);

      if (eventsOnDate.length === 1) {
          setSelectedEvent(eventsOnDate[0]);
      } else {
          setSelectedEvent(null);
      }

      setSheetEvents(eventsOnDate);
      setSheetDate(clickedDate);
      setSheetOpen(true);
  };

  const handleDatesSet = (dateInfo: any) => {
      const newDate = dateInfo.view.currentStart;
      setCurrentCalendarDate(newDate);
      updateMonthlyEvents(newDate, clubEvents);
  };

  const handleEventDidMount = (info: any) => {
    const { event, el } = info;
    if (event.backgroundColor) {
        el.style.backgroundColor = event.backgroundColor;
    }
    if (event.borderColor) {
        el.style.borderColor = event.borderColor;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Year Plan Calendar</h1>
        <p className="text-muted-foreground">Visualize all club, district, and multiple projects throughout the year.</p>
      </div>
      
       <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
          {Object.entries(eventTypeColors).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.backgroundColor }} />
              <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
            </div>
          ))}
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FFEBEE]" />
              <span className="text-sm capitalize">Public Holiday</span>
            </div>
        </div>

      <Card className="shadow-lg">
        <CardContent className="p-2 sm:p-4 md:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-96 w-full">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="fc-theme">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, iCalendarPlugin]}
                initialView={isMobile ? 'dayGridMonth' : 'dayGridMonth'}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,listWeek',
                }}
                eventSources={allEventSources}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                datesSet={handleDatesSet}
                eventDidMount={handleEventDidMount}
                height="auto"
                dayMaxEvents={2}
                navLinks={true}
                buttonText={{
                    today: 'Today',
                    month: 'Month',
                    week: 'Week',
                    list: 'List',
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Events for {format(currentCalendarDate, 'MMMM yyyy')}</CardTitle>
          <CardDescription>A list of all events scheduled for this month.</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyEvents.length > 0 ? (
            <div className="space-y-4">
              {monthlyEvents.map(event => {
                const now = new Date();
                const startDate = parseISO(event.startDate);
                const endDate = event.endDate ? parseISO(event.endDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
                
                let status: 'Ongoing' | 'Upcoming' | 'Past' = 'Upcoming';
                let statusClass = 'bg-green-100 text-green-800 border-green-200';
                
                if (isPast(endDate)) {
                    status = 'Past';
                    statusClass = 'bg-gray-100 text-gray-800 border-gray-200';
                } else if (isWithinInterval(now, { start: startDate, end: endDate })) {
                    status = 'Ongoing';
                    statusClass = 'bg-blue-100 text-blue-800 border-blue-200';
                }
                
                const eventColor = event.eventType ? eventTypeColors[event.eventType].backgroundColor : eventTypeColors.other.backgroundColor;

                return (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-grow">
                        <div className="w-2 h-10 rounded-full" style={{ backgroundColor: eventColor }}></div>
                        <div className="flex-grow">
                          <p className="font-semibold text-primary">{event.name}</p>
                          <p className="text-sm text-muted-foreground">{format(startDate, 'MMM d, yyyy, p')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">
                       <Badge variant="outline" className={cn("capitalize", statusClass)}>{status}</Badge>
                       <Button variant="ghost" size="sm" onClick={() => { setSelectedEvent(event); setSheetOpen(true); }}>View</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No events scheduled for this month.</p>
          )}
        </CardContent>
      </Card>
      
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full max-w-md sm:w-[400px]">
            <SheetHeader>
                <SheetTitle>
                    {selectedEvent && selectedEvent.extendedProps?.id 
                        ? 'Event Details' 
                        : selectedEvent ? 'Holiday Information' : `Events for ${sheetDate ? format(sheetDate, 'MMMM d, yyyy') : ''}`
                    }
                </SheetTitle>
                <SheetDescription>
                    {selectedEvent 
                        ? 'Details for the selected event.'
                        : 'All events scheduled for this day.'
                    }
                </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
                 {selectedEvent ? (
                    <EventDetails event={selectedEvent} />
                 ) : sheetEvents.length > 0 ? (
                    sheetEvents.map(event => <EventDetails key={event.id} event={event}/>)
                 ) : <p className="text-muted-foreground text-sm">No club events scheduled for this day.</p>}
            </div>
        </SheetContent>
      </Sheet>

      <style jsx global>{`
        .fc-theme {
            --fc-button-bg-color: hsl(var(--primary));
            --fc-button-border-color: hsl(var(--primary));
            --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
            --fc-button-hover-border-color: hsl(var(--primary) / 0.9);
            --fc-button-active-bg-color: hsl(var(--accent));
            --fc-button-active-border-color: hsl(var(--accent));
            --fc-today-bg-color: hsl(var(--accent) / 0.1);
        }
        .fc-theme a.fc-event {
            cursor: pointer;
        }
        .fc .fc-daygrid-event-dot,
        .fc .fc-list-event-dot {
          border-color: var(--fc-event-border-color, transparent) !important;
        }
        .fc-toolbar.fc-header-toolbar {
            flex-direction: column;
            gap: 1rem;
            align-items: center;
        }
        @media (min-width: 768px) {
            .fc-toolbar.fc-header-toolbar {
                flex-direction: row;
                gap: 0;
            }
        }
      `}</style>
    </div>
  );
}


function EventDetails({ event }: { event: MyEvent }) {
  const isHoliday = !event.id;

  const handleAddToCalendar = () => {
    const formatGoogleCalendarDate = (date: Date): string => {
        return formatISO(date).replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDate = parseISO(event.startDate);
    const endDate = event.endDate ? parseISO(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const googleCalendarUrl = new URL("https://www.google.com/calendar/render");
    googleCalendarUrl.searchParams.append("action", "TEMPLATE");
    googleCalendarUrl.searchParams.append("text", event.name);
    googleCalendarUrl.searchParams.append("dates", `${formatGoogleCalendarDate(startDate)}/${formatGoogleCalendarDate(endDate)}`);
    googleCalendarUrl.searchParams.append("details", event.description);
    if (event.location) {
        googleCalendarUrl.searchParams.append("location", event.location);
    }
    window.open(googleCalendarUrl.toString(), "_blank");
  };

  let formattedDate = "Date unavailable";
  if (event?.startDate && isValid(parseISO(event.startDate))) {
      const startDate = parseISO(event.startDate);
      formattedDate = format(startDate, "MMM d, yyyy");
      if(event.endDate) {
          formattedDate += ` at ${format(startDate, "h:mm a")}`;
      }
      if (event.endDate && isValid(parseISO(event.endDate))) {
          const endDate = parseISO(event.endDate);
          if (endDate.toDateString() !== startDate.toDateString()) {
              formattedDate = `${format(startDate, "MMM d, h:mm a")} - ${format(endDate, "MMM d, h:mm a")}`;
          } else {
              if(!event.endDate) formattedDate = format(startDate, "MMM d, yyyy"); // All day event
              else formattedDate = `${format(startDate, "MMM d, yyyy, h:mm a")} - ${format(endDate, "h:mm a")}`;
          }
      }
  }

  return (
    <div className='border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0'>
      <h3 className="text-xl font-headline text-primary font-semibold">{event.name}</h3>
      <div className="pt-2">
        <Badge style={{ backgroundColor: isHoliday ? '#FFEBEE' : eventTypeColors[event.eventType || 'other'].backgroundColor, color: isHoliday ? '#C62828' : '#fff', borderColor: isHoliday ? '#E57373' : eventTypeColors[event.eventType || 'other'].borderColor }} className={cn("text-white capitalize")}>
            {isHoliday ? 'Public Holiday' : event.eventType?.replace(/_/g, ' ') || 'Other'}
        </Badge>
      </div>
      <div className="space-y-3 mt-3">
        <div className="flex items-center text-sm">
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{formattedDate}</span>
        </div>
        {event.location && event.eventType !== 'deadline' && !isHoliday && (
            <div className="flex items-center text-sm">
                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{event.location}</span>
            </div>
        )}
        {typeof event.latitude === 'number' && typeof event.longitude === 'number' && (
            <div className="flex items-start text-xs text-green-600">
                <Navigation className="mr-2 h-3 w-3 mt-0.5 shrink-0" />
                <span>Geo-restricted attendance enabled.</span>
            </div>
        )}
        <div className="flex items-start text-sm">
            <Info className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
        </div>
      </div>
      {!isHoliday && (
        <Button onClick={handleAddToCalendar} variant="outline" className="w-full mt-4">
            <CalendarPlus className="mr-2 h-4 w-4"/>
            Add to Google Calendar
        </Button>
      )}
    </div>
  );
}

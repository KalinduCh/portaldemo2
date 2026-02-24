
// src/app/(authenticated)/dashboard/admin-dashboard.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User, Event, AttendanceRecord, BadgeId } from '@/types';
import { getEvents } from '@/services/eventService';
import { getAllAttendanceRecords } from '@/services/attendanceService';
import { getAllUsers } from '@/services/userService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CalendarDays, Activity, PlusCircle, Eye, Award, Filter, Loader2, ExternalLink, List } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { format, parseISO, getYear, getMonth, isPast, isValid, isFuture, isWithinInterval } from 'date-fns';
import { calculateBadgeIds, BADGE_DEFINITIONS } from '@/services/badgeService';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AdminDashboardProps {
  user: User;
}

interface MemberStat {
  userId: string;
  name: string;
  email: string;
  attendanceCount: number;
  badges: BadgeId[];
  photoUrl?: string;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const router = useRouter();
  const [totalMembers, setTotalMembers] = useState(0);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); 

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [fetchedUsers, fetchedEvents, fetchedAttendance] = await Promise.all([
        getAllUsers(),
        getEvents(),
        getAllAttendanceRecords()
      ]);

      setAllUsers(fetchedUsers);
      setTotalMembers(fetchedUsers.filter(u => u.status === 'approved' && (u.role === 'member' || u.role === 'admin')).length);
      setAllEvents(fetchedEvents);
      setAllAttendance(fetchedAttendance);

    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming: Event[] = [];
    const past: Event[] = [];

    allEvents.forEach(event => {
      if (!event.startDate || !isValid(parseISO(event.startDate))) {
        return;
      }
      
      const startDate = parseISO(event.startDate);
      // If end date is present and valid, use it. Otherwise, assume event lasts 24 hours.
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
      upcomingEvents: upcoming.sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()),
      pastEvents: past.sort((a,b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())
    };
  }, [allEvents]);


  const memberStats = useMemo(() => {
    const stats: Record<string, { count: number; user: User | undefined }> = {};

    allAttendance.forEach(record => {
      if (!record.timestamp || !isValid(parseISO(record.timestamp))) return;
      const recordDate = parseISO(record.timestamp);
      const recordYear = getYear(recordDate);
      const recordMonth = getMonth(recordDate); 

      const yearMatch = selectedYear === 'all' || recordYear === parseInt(selectedYear);
      const monthMatch = selectedMonth === 'all' || recordMonth === parseInt(selectedMonth);

      if (yearMatch && monthMatch && record.userId) { 
        if (!stats[record.userId]) {
          stats[record.userId] = { count: 0, user: allUsers.find(u => u.id === record.userId) };
        }
        if (stats[record.userId].user && ['member', 'admin'].includes(stats[record.userId].user?.role) && stats[record.userId].user?.status === 'approved') { 
            stats[record.userId].count += 1;
        }
      }
    });
    
    const calculatedStats: MemberStat[] = Object.entries(stats)
      .filter(([userId, data]) => data.user && ['member', 'admin'].includes(data.user.role) && data.user.status === 'approved' && data.count > 0) 
      .map(([userId, data]) => ({
        userId,
        name: data.user!.name || 'Unknown User', 
        email: data.user!.email || 'N/A',      
        attendanceCount: data.count,
        photoUrl: data.user!.photoUrl,
        badges: [], // Placeholder, will be calculated next
      }))
      .sort((a, b) => b.attendanceCount - a.attendanceCount);
    
    const topVolunteerCount = calculatedStats.length > 0 ? calculatedStats[0].attendanceCount : 0;

    return calculatedStats.map(stat => {
        const user = allUsers.find(u => u.id === stat.userId);
        const userAttendance = allAttendance.filter(a => a.userId === stat.userId);
        if (!user) {
            return { ...stat, badges: [] };
        }
        
        const isTopVolunteer = topVolunteerCount > 0 && stat.attendanceCount === topVolunteerCount;
        const badges = calculateBadgeIds(user, userAttendance, isTopVolunteer);
        
        return { ...stat, badges };
    });
  }, [allAttendance, allUsers, selectedYear, selectedMonth]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allAttendance.forEach(record => {
      if (record.timestamp && isValid(parseISO(record.timestamp))) {
        years.add(getYear(parseISO(record.timestamp)).toString());
      }
    });
    allEvents.forEach(event => { 
      if (event.startDate && isValid(parseISO(event.startDate))) {
        years.add(getYear(parseISO(event.startDate)).toString());
      }
    });
    if (!years.has(new Date().getFullYear().toString())) {
        years.add(new Date().getFullYear().toString());
    }
    return Array.from(years).sort((a,b) => parseInt(b) - parseInt(a));
  }, [allAttendance, allEvents]);

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' }, { value: '1', label: 'February' },
    { value: '2', label: 'March' }, { value: '3', label: 'April' },
    { value: '4', label: 'May' }, { value: '5', label: 'June' },
    { value: '6', label: 'July' }, { value: '7', label: 'August' },
    { value: '8', label: 'September' }, { value: '9', label: 'October' },
    { value: '10', label: 'November' }, { value: '11', label: 'December' },
  ];

  const handleOpenEventSummaryPage = (eventId: string) => {
    router.push(`/admin/event-summary/${eventId}`);
  };

  if (isLoading && !allUsers.length) { 
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  const getRankColor = (index: number) => {
    switch(index) {
        case 0: return 'bg-yellow-100/50 hover:bg-yellow-100/70 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20';
        case 1: return 'bg-slate-100/50 hover:bg-slate-100/70 dark:bg-slate-500/10 dark:hover:bg-slate-500/20';
        case 2: return 'bg-orange-100/50 hover:bg-orange-100/70 dark:bg-orange-500/10 dark:hover:bg-orange-500/20';
        default: return '';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-1 font-headline text-primary">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage events, members, and view club statistics.</p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Total Members</CardTitle>
            <Users className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMembers}</div>
            <Link href="/members" className="text-xs text-primary hover:underline">
              Manage members
            </Link>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Upcoming Events</CardTitle>
            <CalendarDays className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{upcomingEvents.length}</div>
            <Link href="/events" className="text-xs text-primary hover:underline">
              Manage events
            </Link>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Overall Attendance</CardTitle>
            <Activity className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{allAttendance.length}</div>
            <p className="text-xs text-muted-foreground">Total records logged</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="font-headline text-lg sm:text-xl flex items-center">
                <Award className="mr-2 h-5 sm:h-6 w-5 sm:w-6 text-accent" /> Member Participation
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">View member attendance records, filtered by period.</CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-end sm:gap-2 w-full sm:w-auto">
              <div className="col-span-2 flex items-center gap-2 sm:hidden mb-1">
                 <Filter className="h-4 w-4 text-primary" />
                 <span className="font-medium text-xs">Filter by:</span>
              </div>
              <div className="flex-1 sm:flex-none sm:min-w-[150px]">
                <Label htmlFor="filter-month" className="text-[10px] sm:text-xs font-medium text-muted-foreground">Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id="filter-month" className="w-full bg-background mt-0.5 h-8 sm:h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={m.value} className="text-xs sm:text-sm">{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 sm:flex-none sm:min-w-[100px]">
                <Label htmlFor="filter-year" className="text-[10px] sm:text-xs font-medium text-muted-foreground">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger id="filter-year" className="w-full bg-background mt-0.5 h-8 sm:h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs sm:text-sm">All Years</SelectItem>
                    {availableYears.map(y => <SelectItem key={y} value={y} className="text-xs sm:text-sm">{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : memberStats.length > 0 ? (
            <TooltipProvider>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Rank</TableHead>
                      <TableHead>Member Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Attendance Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberStats.slice(0, 10).map((stat, index) => (
                      <TableRow key={stat.userId} className={cn(getRankColor(index))}>
                        <TableCell className="font-medium">
                            <Badge variant={index < 3 ? "default" : "secondary"} className={index < 3 ? "bg-primary/80 hover:bg-primary/90" : ""}>
                                {index + 1}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-semibold flex items-center gap-2">
                            {stat.name}
                            <div className="flex items-center gap-1.5">
                                {stat.badges.map(badgeId => {
                                    const badge = BADGE_DEFINITIONS[badgeId];
                                    if(!badge) return null;
                                    const Icon = badge.icon;
                                    return (
                                        <Tooltip key={badgeId}>
                                            <TooltipTrigger>
                                                <Icon className="h-4 w-4 text-yellow-500" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="font-semibold">{badge.name}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )
                                })}
                            </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs sm:text-sm">{stat.email}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-lg px-3 py-1 border-accent text-accent">
                            {stat.attendanceCount}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {memberStats.slice(0, 10).map((stat, index) => (
                  <Card key={stat.userId} className={cn("shadow-sm", getRankColor(index))}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <Avatar className="h-12 w-12">
                            <AvatarImage src={stat.photoUrl} alt={stat.name} data-ai-hint="profile avatar" />
                            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                {getInitials(stat.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-primary truncate flex items-center gap-2">
                                {index + 1}. {stat.name}
                                <div className="flex items-center gap-1.5">
                                    {stat.badges.map(badgeId => {
                                        const badge = BADGE_DEFINITIONS[badgeId];
                                        if(!badge) return null;
                                        const Icon = badge.icon;
                                        return (
                                            <Tooltip key={badgeId}>
                                                <TooltipTrigger>
                                                    <Icon className="h-4 w-4 text-yellow-500" />
                                                </TooltipTrigger>
                                                <TooltipContent><p>{badge.name}</p></TooltipContent>
                                            </Tooltip>
                                        )
                                    })}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{stat.email}</p>
                          </div>
                      </div>
                      <Badge variant="outline" className="text-md px-2.5 py-1 border-accent text-accent flex-shrink-0">
                        {stat.attendanceCount}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TooltipProvider>
          ) : (
            <p className="text-center text-muted-foreground py-8">No attendance data for the selected period, or no members found.</p>
          )}
        </CardContent>
         <CardFooter className="text-center justify-center border-t pt-4">
            <Link href="/admin/reports">
                <Button variant="link">View Full Report</Button>
            </Link>
        </CardFooter>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="font-headline flex items-center text-lg">
                <List className="mr-2 h-5 w-5 text-accent" /> Event History
              </CardTitle>
              <Link href="/events" className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" /> Manage Events
                </Button>
              </Link>
            </div>
            <CardDescription>A look at recently concluded club activities.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && pastEvents.length === 0 ? (
                 <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : pastEvents.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pastEvents.slice(0, 10).map(event => ( 
                  <div key={event.id} className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                        <p 
                            className="font-semibold text-primary hover:underline cursor-pointer flex-grow pr-2"
                            onClick={() => handleOpenEventSummaryPage(event.id)}
                        >
                            {event.name}
                        </p>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 shrink-0"
                            onClick={() => handleOpenEventSummaryPage(event.id)}
                            aria-label="View event summary"
                        >
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.startDate && isValid(parseISO(event.startDate)) ? format(parseISO(event.startDate), "MMM d, yyyy 'at' h:mm a") : "Date not set"} - {event.location}
                    </p>
                    <p className="text-sm mt-1 text-muted-foreground">{event.description.substring(0,100)}{event.description.length > 100 ? "..." : ""}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No past events to display.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="font-headline flex items-center text-lg">
                <Users className="mr-2 h-5 w-5 text-accent" /> Quick Member Access
              </CardTitle>
               <Link href="/members" className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Eye className="mr-2 h-4 w-4" /> View All Members
                </Button>
              </Link>
            </div>
             <CardDescription>Recently added or active members.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && allUsers.filter(u => u.role === 'member').length === 0 ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : allUsers.filter(u => u.role === 'member' && u.status === 'approved').slice(0,5).length > 0 ? ( 
                allUsers.filter(u => u.role === 'member' && u.status === 'approved').slice(0,5).map(member => (
                    <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 border-b last:border-b-0">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                ))
             ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No members to display.</p>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

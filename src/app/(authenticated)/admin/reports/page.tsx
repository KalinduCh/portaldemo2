// src/app/(authenticated)/admin/reports/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, Event, AttendanceRecord, BadgeId, Transaction } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, Users, Calendar, BarChart, ExternalLink, Award, Users2, HandCoins, PieChart as PieChartIcon, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getAllUsers } from '@/services/userService';
import { getEvents } from '@/services/eventService';
import { getAllAttendanceRecords } from '@/services/attendanceService';
import { getTransactions } from '@/services/financeService';
import { format, parseISO, isValid, getYear, getMonth } from 'date-fns';
import Papa from 'papaparse';
import { calculateBadgeIds, BADGE_DEFINITIONS } from '@/services/badgeService';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/label';
import { cn } from '@/lib/utils';

const PIE_CHART_COLORS = ["#2563eb", "#14b8a6", "#ef4444", "#f97316", "#8b5cf6", "#3b82f6", "#06b6d4", "#ec4899", "#84cc16"];

const months = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' }, { value: '1', label: 'February' },
    { value: '2', label: 'March' }, { value: '3', label: 'April' },
    { value: '4', label: 'May' }, { value: '5', label: 'June' },
    { value: '6', label: 'July' }, { value: '7', label: 'August' },
    { value: '8', label: 'September' }, { value: '9', label: 'October' },
    { value: '10', label: 'November' }, { value: '11', label: 'December' },
];

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [financeYear, setFinanceYear] = useState<string>("all");
  const [financeMonth, setFinanceMonth] = useState<string>("all");

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  React.useEffect(() => {
    if (!authLoading && !isSuperOrAdmin) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, isSuperOrAdmin]);

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [users, events, attendance, transactions] = await Promise.all([
        getAllUsers(),
        getEvents(),
        getAllAttendanceRecords(),
        getTransactions()
      ]);
      setAllUsers(users);
      setAllEvents(events);
      setAllAttendance(attendance);
      setAllTransactions(transactions);
    } catch (error) {
      console.error("Failed to fetch data for reports page:", error);
      toast({ title: "Error", description: "Could not load data for reports.", variant: "destructive" });
    }
    setIsLoadingData(false);
  }, [toast]);

  useEffect(() => {
    if (user && isSuperOrAdmin) {
      fetchData();
    }
  }, [user, fetchData, isSuperOrAdmin]);

  const availableFinanceYears = useMemo(() => {
    const years = new Set<string>();
    allTransactions.forEach(t => years.add(getYear(parseISO(t.date)).toString()));
    years.add(new Date().getFullYear().toString());
    const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
    return ['all', ...sortedYears];
  }, [allTransactions]);

  const filteredFinanceTransactions = useMemo(() => {
    return allTransactions.filter(t => {
        const tDate = parseISO(t.date);
        const yearMatch = financeYear === 'all' || getYear(tDate).toString() === financeYear;
        const monthMatch = financeMonth === "all" || getMonth(tDate).toString() === financeMonth;
        return yearMatch && monthMatch;
    });
  }, [allTransactions, financeYear, financeMonth]);

  const { incomePieData, expensePieData, totalIncome, totalExpense } = useMemo(() => {
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    let tIncome = 0;
    let tExpense = 0;

    filteredFinanceTransactions.forEach(t => {
      if (t.type === 'income') {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
        tIncome += t.amount;
      } else {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
        tExpense += t.amount;
      }
    });

    const incomeData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));
    const expenseData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
    
    return { 
        incomePieData: incomeData.sort((a, b) => b.value - a.value), 
        expensePieData: expenseData.sort((a, b) => b.value - a.value),
        totalIncome: tIncome,
        totalExpense: tExpense
    };
  }, [filteredFinanceTransactions]);

  const lifetimeBalance = useMemo(() => {
    return allTransactions.reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [allTransactions]);

  const memberLeaderboard = useMemo(() => {
    const stats: Record<string, { count: number; user: User | undefined }> = {};
    
    allUsers.forEach(u => {
      if (u.status === 'approved' && (u.role === 'member' || u.role === 'admin')) {
        stats[u.id] = { count: 0, user: u };
      }
    });

    allAttendance.forEach(record => {
      if (record.userId && stats[record.userId]) {
        stats[record.userId].count++;
      }
    });

    const calculatedStats = Object.values(stats)
      .filter(data => data.count > 0 && data.user)
      .map(data => ({
        userId: data.user!.id,
        name: data.user!.name || 'Unknown User',
        email: data.user!.email || 'N/A',
        attendanceCount: data.count,
        photoUrl: data.user!.photoUrl,
      }))
      .sort((a, b) => b.attendanceCount - a.attendanceCount);

    const topVolunteerCount = calculatedStats.length > 0 ? calculatedStats[0].attendanceCount : 0;
    
    return calculatedStats.map(stat => {
        const user = allUsers.find(u => u.id === stat.userId);
        if (!user) return { ...stat, badges: [] };
        const userAttendance = allAttendance.filter(a => a.userId === stat.userId);
        const isTopVolunteer = topVolunteerCount > 0 && stat.attendanceCount === topVolunteerCount;
        const badges = calculateBadgeIds(user, userAttendance, isTopVolunteer);
        return { ...stat, badges };
    });
  }, [allAttendance, allUsers]);

  const eventReportsData = useMemo(() => {
    if (!allEvents.length) return [];
    return [...allEvents].sort((a, b) => {
        const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
        const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
        return dateB - dateA;
    });
  }, [allEvents]);

  const handleExport = async (type: 'members' | 'events' | 'attendance' | 'transactions') => {
    setIsExporting(type);
    toast({ title: "Generating Report...", description: `Preparing ${type} data.` });
    try {
      let data;
      let fileName;

      if (type === 'members') {
        data = allUsers.map(member => ({
          ID: member.id, Name: member.name, Email: member.email, Role: member.role, Status: member.status,
          Designation: member.designation, NIC: member.nic, DateOfBirth: member.dateOfBirth, Gender: member.gender, MobileNumber: member.mobileNumber
        }));
        fileName = `leo-portal_members_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'events') {
        data = allEvents.map(event => ({
          ID: event.id, Name: event.name,
          StartDate: event.startDate ? format(parseISO(event.startDate), 'yyyy-MM-dd HH:mm:ss') : '',
          EndDate: event.endDate ? format(parseISO(event.endDate), 'yyyy-MM-dd HH:mm:ss') : '',
          Location: event.location, Description: event.description
        }));
        fileName = `leo-portal_events_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'transactions') {
        data = allTransactions.map(t => ({
          ID: t.id, Type: t.type, Date: t.date, Amount: t.amount, Category: t.category, Source: t.source, Notes: t.notes
        }));
        fileName = `leo-portal_all_transactions.csv`;
      } else {
        const eventMap = new Map(allEvents.map(e => [e.id, e.name]));
        data = allAttendance.map(record => ({
          RecordID: record.id,
          EventName: eventMap.get(record.eventId) || 'Unknown Event',
          UserID: record.userId,
          Timestamp: record.timestamp ? format(parseISO(record.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
          Status: record.status,
          AttendanceType: record.attendanceType,
          VisitorName: record.visitorName,
          VisitorDesignation: record.visitorDesignation,
          VisitorClub: record.visitorClub
        }));
        fileName = `leo-portal_attendance_log.csv`;
      }

      const csv = Papa.unparse(data);
      downloadCsv(csv, fileName);
      toast({ title: "Success", description: "CSV file has been downloaded." });
    } catch (error) {
      console.error(`Failed to export ${type}:`, error);
      toast({ title: "Error", description: `Could not export data.`, variant: "destructive" });
    }
    setIsExporting(null);
  };

  const downloadCsv = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  if (authLoading || isLoadingData || !user || !isSuperOrAdmin) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline text-primary">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">Generate insights and export data for club records.</p>
      </div>

      <Tabs defaultValue="member-reports" className="w-full">
        <div className="overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            <TabsList className="flex w-max md:grid md:w-full md:grid-cols-4 h-auto bg-muted/50 p-1 mb-2 md:mb-6">
                <TabsTrigger value="member-reports" className="py-2 px-3 md:py-2.5"><Users2 className="mr-2 h-4 w-4"/>Members</TabsTrigger>
                <TabsTrigger value="event-reports" className="py-2 px-3 md:py-2.5"><Calendar className="mr-2 h-4 w-4"/>Events</TabsTrigger>
                <TabsTrigger value="financial-reports" className="py-2 px-3 md:py-2.5"><HandCoins className="mr-2 h-4 w-4"/>Financials</TabsTrigger>
                <TabsTrigger value="data-exports" className="py-2 px-3 md:py-2.5"><Download className="mr-2 h-4 w-4"/>Exports</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="member-reports" className="space-y-6">
          <Card className="shadow-md border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-primary"><Award className="mr-2 h-5 w-5"/>Attendance Leaderboard</CardTitle>
              <CardDescription>Members and Admins ranked by participation count.</CardDescription>
            </CardHeader>
            <CardContent>
              {memberLeaderboard.length > 0 ? (
                <TooltipProvider>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader><TableRow><TableHead className="w-[80px]">Rank</TableHead><TableHead>Member</TableHead><TableHead className="text-right">Events Attended</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {memberLeaderboard.slice(0, 20).map((stat, index) => (
                          <TableRow key={stat.userId} className="hover:bg-primary/5 transition-colors">
                            <TableCell><Badge variant={index < 3 ? "default" : "secondary"} className={index < 3 ? "bg-primary/80" : ""}>{index + 1}</Badge></TableCell>
                            <TableCell className="font-semibold flex items-center gap-3">
                                <Avatar className="h-8 w-8"><AvatarImage src={stat.photoUrl} alt={stat.name} data-ai-hint="profile avatar" /><AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{getInitials(stat.name)}</AvatarFallback></Avatar>
                                {stat.name}
                                <div className="flex items-center gap-1">
                                    {stat.badges.map(badgeId => {
                                        const badge = BADGE_DEFINITIONS[badgeId];
                                        if(!badge) return null;
                                        const Icon = badge.icon;
                                        return (
                                            <Tooltip key={badgeId}><TooltipTrigger><Icon className="h-3.5 w-3.5 text-yellow-500" /></TooltipTrigger><TooltipContent><p className="text-xs">{badge.name}</p></TooltipContent></Tooltip>
                                        )
                                    })}
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-primary">{stat.attendanceCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="block md:hidden space-y-3">
                    {memberLeaderboard.slice(0, 15).map((stat, index) => (
                      <div key={stat.userId} className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm hover:bg-primary/5 transition-colors">
                          <div className="flex items-center gap-3">
                              <Badge variant={index < 3 ? "default" : "secondary"} className="h-6 w-6 flex items-center justify-center p-0 rounded-full">{index + 1}</Badge>
                              <div>
                                <p className="font-semibold text-sm">{stat.name}</p>
                                <p className="text-[10px] text-muted-foreground">{stat.email}</p>
                              </div>
                          </div>
                          <Badge variant="outline" className="text-primary font-mono">{stat.attendanceCount}</Badge>
                      </div>
                    ))}
                  </div>
                </TooltipProvider>
              ) : (
                <p className="text-center text-muted-foreground py-12 italic">No participation records found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="event-reports">
            <Card className="shadow-md border-t-4 border-t-primary">
                <CardHeader>
                <CardTitle className="flex items-center text-lg text-primary"><BarChart className="mr-2 h-5 w-5"/>Past Events Ledger</CardTitle>
                <CardDescription>Historical list of all club activities. Click to view detailed participant summaries.</CardDescription>
                </CardHeader>
                <CardContent>
                {eventReportsData.length > 0 ? (
                    <div className="max-h-[600px] overflow-y-auto pr-2">
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader><TableRow><TableHead>Event Name</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {eventReportsData.map((ev) => (<TableRow key={ev.id} className="hover:bg-primary/5 transition-colors"><TableCell className="font-medium text-sm">{ev.name}</TableCell><TableCell className="text-xs">{ev.startDate && isValid(parseISO(ev.startDate)) ? format(parseISO(ev.startDate), 'MMM dd, yyyy') : 'N/A'}</TableCell><TableCell className="text-xs text-muted-foreground">{ev.location}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => router.push(`/admin/event-summary/${ev.id}`)} className="hover:bg-primary/10 hover:text-primary">Summary <ExternalLink className="ml-1.5 h-3 w-3" /></Button></TableCell></TableRow>))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="block md:hidden space-y-3">
                        {eventReportsData.map((ev) => (<Card key={ev.id} className="shadow-sm hover:shadow-md transition-shadow"><CardHeader className="p-3 pb-1"><CardTitle className="text-sm font-semibold text-primary">{ev.name}</CardTitle></CardHeader><CardContent className="p-3 pt-0 pb-2"><p className="text-[10px] text-muted-foreground">{ev.startDate && isValid(parseISO(ev.startDate)) ? format(parseISO(ev.startDate), 'PPP') : 'N/A'}</p><p className="text-[10px] truncate">{ev.location}</p></CardContent><CardFooter className="p-2 border-t"><Button variant="ghost" className="w-full h-7 text-[10px] hover:bg-primary/10 hover:text-primary" onClick={() => router.push(`/admin/event-summary/${ev.id}`)}>View Summary</Button></CardFooter></Card>))}
                      </div>
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-12 italic">No events found in history.</p>
                )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="financial-reports" className="space-y-6">
          <Card className="shadow-md border-t-4 border-t-primary">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <CardTitle className="flex items-center text-lg text-primary"><HandCoins className="mr-2 h-5 w-5"/>Financial Summary Report</CardTitle>
                    <CardDescription>Filtered breakdown of income and expenses by category.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-[160px]">
                        <Select value={financeYear} onValueChange={setFinanceYear}>
                            <SelectTrigger className="h-9 text-xs bg-primary/5 border-primary/20 text-primary"><SelectValue placeholder="Year"/></SelectTrigger>
                            <SelectContent>
                                {availableFinanceYears.map(y => (
                                    <SelectItem key={y} value={y}>
                                        {y === 'all' ? 'All Balances' : y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[140px]">
                        <Select value={financeMonth} onValueChange={setFinanceMonth}>
                            <SelectTrigger className="h-9 text-xs bg-primary/5 border-primary/20 text-primary"><SelectValue placeholder="Month"/></SelectTrigger>
                            <SelectContent>
                                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                    <div className="bg-green-50 dark:bg-green-950/20 p-3 sm:p-4 rounded-lg border border-green-100 dark:border-green-900/50">
                        <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider mb-1">Total Income ({financeYear === 'all' ? 'Lifetime' : financeYear})</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-700 dark:text-green-300">LKR {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 p-3 sm:p-4 rounded-lg border border-red-100 dark:border-red-900/50">
                        <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wider mb-1">Total Expense ({financeYear === 'all' ? 'Lifetime' : financeYear})</p>
                        <p className="text-lg sm:text-2xl font-bold text-red-700 dark:text-red-300">LKR {totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className={cn("p-3 sm:p-4 rounded-lg border", lifetimeBalance >= 0 ? "bg-primary/5 border-primary/20" : "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50")}>
                        <p className={cn("text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-1", lifetimeBalance >= 0 ? "text-primary" : "text-red-600 dark:text-red-400")}>Net Balance (Total of all years)</p>
                        <p className={cn("text-lg sm:text-2xl font-bold", lifetimeBalance >= 0 ? "text-primary" : "text-red-700 dark:text-red-300")}>LKR {lifetimeBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold flex items-center text-green-600"><TrendingUp className="mr-2 h-4 w-4"/>Income by Category</h3>
                        {incomePieData.length > 0 ? (
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={incomePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                                            {incomePieData.map((_, index) => (<Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />))}
                                        </Pie>
                                        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (<p className="text-center text-muted-foreground py-12 text-xs italic">No income data for this selection.</p>)}
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold flex items-center text-red-600"><TrendingDown className="mr-2 h-4 w-4"/>Expense by Category</h3>
                        {expensePieData.length > 0 ? (
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={expensePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                                            {expensePieData.map((_, index) => (<Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />))}
                                        </Pie>
                                        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (<p className="text-center text-muted-foreground py-12 text-xs italic">No expense data for this selection.</p>)}
                    </div>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-exports">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ExportCard title="Members" icon={Users} type="members" isExporting={isExporting === 'members'} onExport={() => handleExport('members')} />
            <ExportCard title="Events" icon={Calendar} type="events" isExporting={isExporting === 'events'} onExport={() => handleExport('events')} />
            <ExportCard title="Attendance" icon={BarChart} type="attendance" isExporting={isExporting === 'attendance'} onExport={() => handleExport('attendance')} />
            <ExportCard title="Finance" icon={HandCoins} type="transactions" isExporting={isExporting === 'transactions'} onExport={() => handleExport('transactions')} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExportCard({ title, icon: Icon, type, isExporting, onExport }: any) {
    return (
        <Card className="hover:shadow-lg transition-all duration-300 group border-t-2 hover:border-t-primary">
            <CardHeader className="pb-3">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription className="text-xs">Download full {title.toLowerCase()} CSV dataset.</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button variant="outline" size="sm" onClick={onExport} disabled={isExporting} className="w-full hover:bg-primary hover:text-white">
                    {isExporting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Download className="mr-2 h-3 w-3" />}
                    {isExporting ? 'Exporting...' : 'Download CSV'}
                </Button>
            </CardFooter>
        </Card>
    );
}
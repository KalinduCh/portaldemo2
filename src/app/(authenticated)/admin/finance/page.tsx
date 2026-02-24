// src/app/(authenticated)/admin/finance/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Transaction, User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Edit, Trash2, Loader2, TrendingUp, TrendingDown, DollarSign, BarChart, Calendar, HandCoins, FileDown, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '@/services/financeService';
import { format, parseISO, getYear, getMonth, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { cn } from '@/lib/utils';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FinanceFormValues } from '@/components/finance/finance-form';

const FinanceForm = dynamic(() => import('@/components/finance/finance-form').then(mod => mod.FinanceForm), {
    ssr: false,
    loading: () => <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
});

const chartConfig = {
  income: { label: "Income", color: "#15803d" }, // Dark Green-700
  expenses: { label: "Expenses", color: "#b91c1c" }, // Dark Red-700
} satisfies ChartConfig;

export default function FinancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isSuperOrAdmin) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, isSuperOrAdmin]);
  
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedTransactions = await getTransactions();
      setTransactions(fetchedTransactions);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not load transactions: ${error.message}`, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (user && isSuperOrAdmin) {
      fetchTransactions();
    }
  }, [user, fetchTransactions, isSuperOrAdmin]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(t => years.add(getYear(parseISO(t.date)).toString()));
    years.add(new Date().getFullYear().toString());
    const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
    return ['all', ...sortedYears];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedYear === 'all') return transactions;
    return transactions.filter(t => getYear(parseISO(t.date)).toString() === selectedYear);
  }, [transactions, selectedYear]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredTransactions, currentPage]);
  
  const totalPages = useMemo(() => Math.ceil(filteredTransactions.length / rowsPerPage), [filteredTransactions.length]);

  const financialSummary = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
        if(t.type === 'income') acc.income += t.amount;
        else acc.expenses += t.amount;
        return acc;
    }, { income: 0, expenses: 0 });
  }, [filteredTransactions]);

  const lifetimeBalance = useMemo(() => {
    return transactions.reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [transactions]);

  const chartData = useMemo(() => {
    if (selectedYear === 'all') {
        const yearGroups: Record<string, { income: number, expenses: number }> = {};
        transactions.forEach(t => {
            const y = getYear(parseISO(t.date)).toString();
            if (!yearGroups[y]) yearGroups[y] = { income: 0, expenses: 0 };
            if (t.type === 'income') yearGroups[y].income += t.amount;
            else yearGroups[y].expenses += t.amount;
        });
        return Object.entries(yearGroups)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => a.name.localeCompare(b.name));
    } else {
        const yearInt = parseInt(selectedYear);
        const startDate = startOfYear(new Date(yearInt, 0, 1));
        const endDate = endOfYear(new Date(yearInt, 0, 1));
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        
        const data = months.map(month => ({
            name: format(month, 'MMM'),
            income: 0,
            expenses: 0
        }));

        transactions.forEach(t => {
            const transactionDate = parseISO(t.date);
            if(getYear(transactionDate) === yearInt) {
                const monthIndex = getMonth(transactionDate);
                if(t.type === 'income') data[monthIndex].income += t.amount;
                else data[monthIndex].expenses += t.amount;
            }
        });
        return data;
    }
  }, [transactions, selectedYear]);

  const handleOpenForm = (transaction?: Transaction) => {
    setSelectedTransaction(transaction || null);
    setIsFormOpen(true);
  };
  
  const handleDeleteTransaction = async (transactionId: string) => {
    if (confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      setIsSubmitting(true);
      try {
        await deleteTransaction(transactionId);
        toast({ title: "Transaction Deleted" });
        fetchTransactions();
      } catch (error: any) {
        toast({ title: "Error", description: `Could not delete transaction: ${error.message}`, variant: "destructive" });
      }
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (data: FinanceFormValues) => {
    setIsSubmitting(true);
    try {
      const transactionData = { ...data, amount: parseFloat(data.amount) };
      if (selectedTransaction) {
        await updateTransaction(selectedTransaction.id, transactionData);
        toast({ title: "Transaction Updated" });
      } else {
        await addTransaction(transactionData);
        toast({ title: "Transaction Added" });
      }
      fetchTransactions();
      setIsFormOpen(false);
      setSelectedTransaction(null);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not save transaction: ${error.message}`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleExportCSV = () => {
    const dataToExport = filteredTransactions.map(t => ({
        Date: format(parseISO(t.date), 'yyyy-MM-dd'),
        Type: t.type,
        Category: t.category,
        'Source/Description': t.source,
        Amount: t.amount,
        Notes: t.notes
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leo-club-finance-${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Date", "Type", "Category", "Source/Description", "Amount (LKR)"];
    const tableRows: any[][] = [];

    filteredTransactions.forEach(t => {
        const transactionData = [
            format(parseISO(t.date), 'MMM dd, yyyy'),
            t.type,
            t.category,
            t.source,
            t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        ];
        tableRows.push(transactionData);
    });

    doc.setFontSize(18);
    doc.text(`Leo Club Financial Report - ${selectedYear === 'all' ? 'Lifetime' : selectedYear}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`Generated on ${format(new Date(), 'PPP')}`, 14, 22);
    
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
    });
    
    doc.save(`leo-club-finance-${selectedYear}.pdf`);
  };

  if (authLoading || isLoading || !user || !isSuperOrAdmin) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline">Finance Dashboard</h1>
            <p className="text-muted-foreground">Manage and track club income and expenses across years.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Label htmlFor="year-select" className="sr-only">Select Period</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="year-select" className="w-[180px] bg-primary/5 border-primary/20 text-primary font-medium">
                        <Calendar className="mr-2 h-4 w-4 opacity-70" />
                        <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(y => (
                            <SelectItem key={y} value={y}>
                                {y === 'all' ? 'All Balances' : y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto shadow-sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Entry
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>{selectedTransaction ? "Edit" : "Add"} Transaction</DialogTitle>
                    </DialogHeader>
                    <FinanceForm
                    transaction={selectedTransaction}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsFormOpen(false)}
                    isLoading={isSubmitting}
                    />
                </DialogContent>
            </Dialog>
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Income ({selectedYear === 'all' ? 'All Time' : selectedYear})</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-600">LKR {financialSummary.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Revenue</p>
            </CardContent>
        </Card>
         <Card className="border-l-4 border-l-red-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expenses ({selectedYear === 'all' ? 'All Time' : selectedYear})</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-red-600">LKR {financialSummary.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Costs</p>
            </CardContent>
        </Card>
        <Card className={cn("border-l-4 shadow-md bg-primary/5", lifetimeBalance >= 0 ? "border-l-primary" : "border-l-destructive")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", lifetimeBalance >= 0 ? "text-primary" : "text-destructive")}>
                    LKR {lifetimeBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total of all years</p>
            </CardContent>
        </Card>
         <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                <HandCoins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 <div className="text-2xl font-bold">{filteredTransactions.length}</div>
                <p className="text-xs text-muted-foreground">Transactions in selection</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3 shadow-md">
             <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg text-primary"><BarChart className="mr-2 h-5 w-5"/>{selectedYear === 'all' ? 'Year-over-Year Overview' : `Monthly Breakdown - ${selectedYear}`}</CardTitle>
             </CardHeader>
            <CardContent className="p-2 sm:p-6">
                <ChartContainer config={chartConfig} className="h-[250px] md:h-[300px] w-full">
                    <ResponsiveContainer>
                        <RechartsBarChart accessibilityLayer data={chartData}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} fontSize={12} />
                            <YAxis tickFormatter={(value) => `${Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : value}`} fontSize={12} width={40}/>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
         <Card className="md:col-span-2 shadow-md">
             <CardHeader>
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
                <CardDescription>Latest 5 absolute entries.</CardDescription>
             </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px]">
                    <div className="space-y-4 pr-3">
                        {transactions.slice(0, 5).map((t) => (
                            <div key={t.id} className="flex items-center border-b pb-3 last:border-0 last:pb-0 hover:bg-muted/30 transition-colors rounded-sm px-1">
                                <div className={cn("p-2 rounded-full mr-3", t.type === 'income' ? 'bg-green-50' : 'bg-red-50')}>
                                    {t.type === 'income' ? <TrendingUp className="h-4 w-4 text-green-600"/> : <TrendingDown className="h-4 w-4 text-red-600" />}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-sm text-primary leading-tight">{t.category}</p>
                                    <p className="text-xs text-muted-foreground truncate">{t.source}</p>
                                </div>
                                <div className={cn("font-bold text-sm ml-2 shrink-0 text-right", t.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                                    {t.type === 'income' ? '+' : '-'}LKR {t.amount.toLocaleString()}
                                </div>
                            </div>
                        ))}
                        {transactions.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground italic text-sm">No transactions found.</div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>

       <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle className="text-xl text-primary">Transaction Ledger - {selectedYear === 'all' ? 'All Balances' : selectedYear}</CardTitle>
                <CardDescription>Full history of financial records for the selected period.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button onClick={handleExportCSV} variant="outline" size="sm" className="flex-1 sm:flex-none hover:bg-primary/5 hover:text-primary"><FileText className="mr-2 h-4 w-4" /> CSV</Button>
                <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="flex-1 sm:flex-none hover:bg-primary/5 hover:text-primary"><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
            </div>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (LKR)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="text-xs whitespace-nowrap">{format(parseISO(t.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === 'income' ? 'secondary' : 'destructive'} className={cn("capitalize px-2 py-0 h-5", t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                          {t.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-xs">{t.category}</TableCell>
                      <TableCell className="text-muted-foreground text-xs truncate max-w-[200px]">{t.source}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => handleOpenForm(t)}>
                                <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTransaction(t.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
          <div className="md:hidden space-y-3">
              {paginatedTransactions.map((t) => (
                  <Card key={t.id} className={cn("shadow-sm border-l-4 hover:shadow-md transition-shadow", t.type === 'income' ? 'border-l-green-500' : 'border-l-red-500')}>
                      <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
                          <p className="text-[10px] text-muted-foreground font-medium">{format(parseISO(t.date), 'MMM dd, yyyy')}</p>
                          <Badge variant="outline" className="text-[9px] uppercase h-4 px-1">{t.category}</Badge>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                          <p className="text-xs font-semibold text-primary truncate mb-1">{t.source}</p>
                          <p className={cn("text-base font-bold font-mono", t.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                              {t.type === 'income' ? '+' : '-'} LKR {t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                      </CardContent>
                      <CardFooter className="p-2 border-t flex justify-end gap-2 bg-muted/10">
                          <Button variant="ghost" size="sm" className="h-8 text-xs hover:bg-primary/10" onClick={() => handleOpenForm(t)}>
                              <Edit className="mr-1 h-3 w-3"/> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTransaction(t.id)}>
                              <Trash2 className="mr-1 h-3 w-3"/> Delete
                          </Button>
                      </CardFooter>
                  </Card>
              ))}
          </div>
          {filteredTransactions.length === 0 && !isLoading && (
            <div className="text-center py-16 text-muted-foreground">
                <HandCoins className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No financial records found for the selected period.</p>
                <Button variant="link" className="mt-2" onClick={() => handleOpenForm()}>Record your first transaction</Button>
            </div>
          )}
        </CardContent>
        {totalPages > 1 && (
            <CardFooter className="border-t pt-4">
                <div className="flex items-center justify-between w-full">
                    <p className="text-xs text-muted-foreground">Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredTransactions.length)} of {filteredTransactions.length} entries</p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 hover:bg-primary/5" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="h-8 hover:bg-primary/5" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
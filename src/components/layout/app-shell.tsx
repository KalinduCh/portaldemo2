
// src/components/layout/app-shell.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserDropdown } from "./user-dropdown";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserCircle, Mail, Phone, Settings, LifeBuoy } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth();
  const logoUrl = "https://i.imgur.com/aRktweQ.png";

  const president = { name: 'Demo President', email: 'president@democlub.org', phone: '+1234567890' };
  const support = { name: 'Demo IT Support', email: 'support@democlub.org', phone: '+1234567890' };

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border shadow-md">
        <SidebarRail />
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary hover:text-accent transition-colors">
            <Image 
              src={logoUrl} 
              alt="LEO Portal Logo" 
              width={32} 
              height={32} 
              className="h-8 w-8 rounded-sm"
              data-ai-hint="club logo"
            />
            <span className="text-xl font-bold font-headline group-data-[collapsible=icon]:hidden">LEO Portal</span>
          </Link>
        </SidebarHeader>
        <Separator className="my-0" />
        <SidebarContent className="p-2">
          <SidebarNav />
        </SidebarContent>
        <Separator className="my-0" />
        <SidebarFooter className="p-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full group-data-[collapsible=icon]:hidden">
                <LifeBuoy className="mr-2 h-4 w-4"/>
                Need help?
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Help & Support</DialogTitle>
                <DialogDescription>
                  If you have any questions or need assistance, please contact one of the administrators below.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-2">
                <div>
                  <h4 className="font-semibold text-primary mb-2">Club President</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span>{president.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${president.email}`} className="hover:underline">{president.email}</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${president.phone.replace(/\s/g, '')}`} className="hover:underline">{president.phone}</a>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-primary mb-2">IT Support</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span>{support.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${support.email}`} className="hover:underline">{support.email}</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${support.phone.replace(/\s/g, '')}`} className="hover:underline">{support.phone}</a>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {user && (
             <p className="text-xs text-muted-foreground mt-2 group-data-[collapsible=icon]:hidden">Logged in as {user.role}</p>
          )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg font-semibold font-headline hidden md:block">Welcome to Demo Leo Club...</h1>
          </div>
          <UserDropdown />
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} LEO Portal. All rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}

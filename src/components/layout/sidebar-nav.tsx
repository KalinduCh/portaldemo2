
// src/components/layout/sidebar-nav.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { LayoutDashboard, CalendarDays, Users, FileText, Mail, Lightbulb, HandCoins, Settings, Trophy, BarChart, Calendar, ListChecks } from "lucide-react"; 
import type { AdminPermission } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: AdminPermission; // Add permission key
}

const memberNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/project-ideas", label: "Project Ideas", icon: Lightbulb },
  { href: "/tasks", label: "My Tasks", icon: ListChecks },
];

const adminNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/members", label: "Members", icon: Users, permission: 'members' },
  { href: "/events", label: "Events", icon: CalendarDays, permission: 'events' },
  { href: "/admin/finance", label: "Finance", icon: HandCoins, permission: 'finance' },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy, permission: 'leaderboard' },
  { href: "/admin/communication", label: "Communication", icon: Mail, permission: 'communication' },
  { href: "/admin/project-ideas", label: "Idea Review", icon: Lightbulb, permission: 'project_ideas' },
  { href: "/admin/reports", label: "Reports", icon: BarChart, permission: 'reports' },
];

const superAdminNavItems: NavItem[] = [
    // super admin has all admin items plus settings
    ...adminNavItems,
    { href: "/admin/settings", label: "Settings", icon: Settings },
];


export function SidebarNav() {
  const pathname = usePathname();
  const { user, adminViewMode } = useAuth();
  
  if (!user) return null;

  let itemsToShow: NavItem[];

  if (user.role === 'super_admin') {
      itemsToShow = superAdminNavItems;
  } else if (user.role === 'admin' && adminViewMode === 'admin_view') {
      // Filter admin items based on user's permissions
      itemsToShow = adminNavItems.filter(item => {
          // If an item doesn't require a specific permission, always show it (e.g., Dashboard).
          if (!item.permission) {
              return true;
          }
          // Otherwise, strictly check if the user has that specific permission set to true.
          // If permissions are not defined or the specific permission is false/undefined, deny access.
          return user.permissions?.[item.permission] === true;
      });
  } else {
      itemsToShow = memberNavItems;
  }

  return (
    <SidebarMenu>
      {itemsToShow.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
            tooltip={{ children: item.label, className: "font-sans" }}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

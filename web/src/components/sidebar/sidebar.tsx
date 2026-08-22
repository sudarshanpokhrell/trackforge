'use client';

import { Inbox, Ticket, Home, Folder, Server, Laptop } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { NavCollapsible } from './nav-collapsible';
import { NavFooter } from './nav-footer';
import { NavMain } from './nav-main';
import type { User, NavItem, ProjectItem } from './types';

interface AppSidebarData {
  user: User;
  navMain: NavItem[];
  navCollapsible: {
    projects: ProjectItem[];
  };
}

export const sidebarData: AppSidebarData = {
  user: {
    name: 'ephraim',
    email: 'ephraim@blocks.so',
    avatar: '/avatar-01.png',
  },
  navMain: [
    {
      id: 'home',
      title: 'Home',
      url: '/',
      icon: Home,
    },
    {
      id: 'inbox',
      title: 'Inbox',
      url: '/inbox',
      icon: Inbox,
      isActive: true,
    },
    {
      id: 'issues',
      title: 'Issues',
      url: '/issues',
      icon: Ticket,
    },
  ],
  navCollapsible: {
    projects: [
      {
        id: 'trackforge-ui',
        title: 'TrackForge UI',
        icon: Laptop,
        color: 'bg-green-400 dark:bg-green-300',
      },
      {
        id: 'backend-api',
        title: 'Backend API',
        icon: Server,
        color: 'bg-blue-400 dark:bg-blue-300',
      },
    ],
  },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs">
            TF
          </div>
          <span>Trackforge</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarData.navMain} />
        <NavCollapsible projects={sidebarData.navCollapsible.projects} />
      </SidebarContent>
      <NavFooter />
    </Sidebar>
  );
}
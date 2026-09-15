'use client';

import { Inbox, Ticket,   Server, Laptop, Users } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { NavCollapsible } from './nav-collapsible';
import { NavFooter } from './nav-footer';
import { NavMain } from './nav-main';
import { useUser } from '@/hooks/use-auth';
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
      id: 'inbox',
      title: 'Inbox',
      url: '/inbox',
      icon: Inbox,
      isActive: true,
    },
    {
      id: 'issues',
      title: 'My Issues',
      url: '/issues',
      icon: Ticket,
    },
    {
      id: 'members',
      title: 'Members',
      url: '/members',
      icon: Users,
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

// Nav items only admins and the superadmin can open.
const ADMIN_NAV_IDS = new Set(['members']);

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useUser();
  const navMain = sidebarData.navMain.filter(
    (item) => user?.role !== 'member' || !ADMIN_NAV_IDS.has(item.id)
  );

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
        <NavMain items={navMain} />
        <NavCollapsible projects={sidebarData.navCollapsible.projects} />
      </SidebarContent>
      <NavFooter />
    </Sidebar>
  );
}
'use client';

import { InboxIcon, TaskDaily01Icon, UserMultipleIcon } from '@hugeicons/core-free-icons';
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { NavCollapsible } from './nav-collapsible';
import { NavFooter } from './nav-footer';
import { NavMain } from './nav-main';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/use-auth';
import { projectsQuery } from '@/hooks/use-projects';
import type { User, NavItem } from './types';

interface AppSidebarData {
  user: User;
  navMain: NavItem[];
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
      icon: InboxIcon,
      isActive: true,
    },
    {
      id: 'issues',
      title: 'My Issues',
      url: '/issues',
      icon: TaskDaily01Icon,
    },
    {
      id: 'members',
      title: 'Members',
      url: '/members',
      icon: UserMultipleIcon,
    },
  ],
};

const ADMIN_NAV_IDS = new Set(['members']);

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useUser();
  const { data: projects } = useQuery(projectsQuery);

  const navMain = sidebarData.navMain.filter(
    (item) => user?.role !== 'member' || !ADMIN_NAV_IDS.has(item.id)
  );

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b px-5 py-4">
        <div className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.2px]">
          <img src="/logo.svg" alt="" className="size-6" />
          <span>TrackForge</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavCollapsible
          projects={projects ?? []}
          canCreate={user?.role !== 'member'}
        />
      </SidebarContent>
      <NavFooter />
    </Sidebar>
  );
}
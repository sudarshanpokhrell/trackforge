import { Link, useRouterState } from '@tanstack/react-router';
import { Logout01Icon, UserCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useLogout, useUser } from '@/hooks/use-auth';
import { ModeToggle } from '../mode-toggle';

export function NavFooter() {
  const user = useUser();
  const logout = useLogout();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <SidebarFooter className="p-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <ModeToggle />
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === '/profile'}
            render={<Link to="/profile" />}
            tooltip="Profile"
          >
            <HugeiconsIcon icon={UserCircleIcon} />
            <span className="truncate">{user?.name ?? 'Profile'}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            tooltip="Log out"
          >
            <HugeiconsIcon icon={Logout01Icon} />
            <span>Log out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

import { Link, useRouterState } from '@tanstack/react-router';
import { LogOut, UserCircle2 } from 'lucide-react';
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
            <UserCircle2 />
            <span className="truncate">{user?.name ?? 'Profile'}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            tooltip="Log out"
          >
            <LogOut />
            <span>Log out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

import { LogOut } from 'lucide-react';
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useLogout, useUser } from '@/hooks/auth';
import { ModeToggle } from '../mode-toggle';

export function NavFooter() {
  const user = useUser();
  const logout = useLogout();

  return (
    <SidebarFooter className="p-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <ModeToggle />
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            tooltip="Log out"
          >
            <LogOut />
            <span className="truncate">{user?.name ?? 'Log out'}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

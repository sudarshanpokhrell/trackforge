import { LogOut } from 'lucide-react';
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/providers/auth-provider';
import { ModeToggle } from '../mode-toggle';

export function NavFooter() {
  const { user, logout } = useAuth();

  return (
    <SidebarFooter className="p-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <ModeToggle />
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={logout} tooltip="Log out">
            <LogOut />
            <span className="truncate">{user?.name ?? 'Log out'}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

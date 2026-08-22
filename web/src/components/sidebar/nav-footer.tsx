
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ModeToggle } from '../mode-toggle';

export function NavFooter() {
  return (
    <SidebarFooter className="p-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <ModeToggle />
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

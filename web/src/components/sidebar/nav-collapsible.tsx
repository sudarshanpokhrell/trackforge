'use client';
import { ChevronDown, FolderKanban, LayoutDashboard, Ticket } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import type { Project } from '@/types/projects';

interface NavCollapsibleProps {
  projects: Project[];
}

export function NavCollapsible({ projects }: NavCollapsibleProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="space-y-0">
      
        <Collapsible className="group/collapsible" defaultOpen>
          <SidebarGroup>
            <SidebarGroupLabel
              className="text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              render={<CollapsibleTrigger />}
            >
              Projects
              <ChevronDown className="ml-auto transition-transform group-data-open/collapsible:rotate-180" />
            </SidebarGroupLabel>
            <CollapsibleContent>
            {projects && projects.length > 0 && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {projects.map((item) => {
                    const homeHref = `/projects/${item.id}`;
                    const issuesHref = `/projects/${item.id}/issues`;
                    const projectId = String(item.id);
                    const isProjectActive =
                      pathname === homeHref || pathname.startsWith(`${homeHref}/`);
                    return (
                      <Collapsible key={item.id} className="group/project" defaultOpen={isProjectActive}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            isActive={isProjectActive}
                            render={<CollapsibleTrigger />}
                          >
                            <FolderKanban />
                            <span className="truncate">{item.name}</span>
                          </SidebarMenuButton>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  isActive={pathname === homeHref}
                                  render={<Link to="/projects/$projectId" params={{ projectId }} />}
                                >
                                  <LayoutDashboard />
                                  <span>Overview</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  isActive={pathname === issuesHref}
                                  render={<Link to="/projects/$projectId/issues" params={{ projectId }} />}
                                >
                                  <Ticket />
                                  <span>Issues</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
             )}
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
     
    </div>
  );
}

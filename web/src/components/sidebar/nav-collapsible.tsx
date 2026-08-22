'use client';
import { ChevronDown, Home, LayoutDashboard, Ticket } from 'lucide-react';
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
import type { ProjectItem } from './types';

interface NavCollapsibleProps {
  projects: ProjectItem[];
}

export function NavCollapsible({ projects }: NavCollapsibleProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="space-y-0">
      {projects && projects.length > 0 && (
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
              <SidebarGroupContent>
                <SidebarMenu>
                  {projects.map((item) => {
                    const homeHref = `/projects/${item.id}/`;
                    const issuesHref = `/projects/${item.id}/issues`;
                    const isProjectActive = pathname.startsWith(`/projects/${item.id}`);
                    const Icon = item.icon
                    return (
                      <Collapsible key={item.id} className="group/project" defaultOpen={isProjectActive}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            isActive={isProjectActive}
                            render={<CollapsibleTrigger />}
                          >
                            <div className={`h-4 w-4 shrink-0 rounded `} >
                              <Icon />
                            </div>
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  isActive={pathname === homeHref}
                                  render={<Link to={homeHref as any} />}
                                >
                                  <LayoutDashboard />
                                  <span>Overview</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  isActive={pathname === issuesHref}
                                  render={<Link to={issuesHref as any} />}
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
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      )}
    </div>
  );
}

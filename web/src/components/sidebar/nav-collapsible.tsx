'use client';
import { ChevronDown, FolderKanban, LayoutDashboard, Plus, Ticket } from 'lucide-react';
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
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import type { Project } from '@/types/projects';

interface NavCollapsibleProps {
  projects: Project[];
  /** Only admins and the superadmin can create projects. */
  canCreate?: boolean;
}

export function NavCollapsible({ projects, canCreate }: NavCollapsibleProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="space-y-0">

        <Collapsible className="group/collapsible" defaultOpen>
          <SidebarGroup>
            <div className="flex items-center gap-1 pr-2">
              <SidebarGroupLabel
                className="flex-1 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                render={<CollapsibleTrigger />}
              >
                Projects
                <ChevronDown className="ml-auto transition-transform group-data-open/collapsible:rotate-180" />
              </SidebarGroupLabel>
              {canCreate && (
                <CreateProjectDialog
                  trigger={
                    <button
                      aria-label="New project"
                      className="rounded p-1 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    />
                  }
                >
                  <Plus className="size-4" />
                </CreateProjectDialog>
              )}
            </div>
            <CollapsibleContent>
            {projects.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-sidebar-foreground/60">
                {canCreate
                  ? 'No projects yet.'
                  : "You're not in any projects yet."}
              </p>
            )}
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

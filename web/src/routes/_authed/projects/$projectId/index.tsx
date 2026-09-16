import { EmojiPicker } from '@/components/emoji-picker'
import { InlineText } from '@/components/inline-text'
import { AddMemberDialog } from '@/components/projects/add-member-dialog'
import { ProjectDates } from '@/components/projects/project-dates'
import { ProjectIcon } from '@/components/projects/project-icon'
import { ProjectNotFound } from '@/components/projects/project-not-found'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { projectQuery, useUpdateProject } from '@/hooks/use-projects'
import { getErrorMessage, isApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ProjectDetails } from '@/types/projects'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authed/projects/$projectId/')({
    component: ProjectHome,
})

function ProjectHome() {
    const { projectId } = Route.useParams()
    const id = Number(projectId)

    const { data: project, isPending, error } = useQuery({
        ...projectQuery(id),
        enabled: Number.isInteger(id) && id > 0,
    })
    const updateProject = useUpdateProject(id)

    if (!Number.isInteger(id) || id <= 0) return <ProjectNotFound />

    if (isPending) return <ProjectSkeleton />

    if (error) {
        return isApiError(error, 404) ? (
            <ProjectNotFound />
        ) : (
            <div className="mx-auto max-w-5xl px-6 py-16 text-center">
                <h1 className="text-lg font-medium">Something went wrong</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {getErrorMessage(error)}
                </p>
            </div>
        )
    }

    const canManage = project.my_access.can_manage

    return (
        <div className="mx-auto flex h-full max-w-5xl flex-col gap-10 px-6 py-8">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                    {canManage ? (
                        <EmojiPicker
                            aria-label="Change project icon"
                            value={project.emoji}
                            onChange={(emoji) =>
                                updateProject
                                    .mutateAsync({ emoji })
                                    .catch((e) => toast.error(getErrorMessage(e)))
                            }
                            trigger={
                                <button className="-ml-1.5 flex size-12 cursor-pointer items-center justify-center self-start rounded-xl transition-colors hover:bg-muted/60 data-popup-open:bg-muted/60" />
                            }
                        >
                            <ProjectIcon emoji={project.emoji} className="size-8 text-3xl text-ink-subtle" />
                        </EmojiPicker>
                    ) : (
                        <div className="-ml-1.5 flex size-12 items-center justify-center">
                            <ProjectIcon emoji={project.emoji} className="size-8 text-3xl text-ink-subtle" />
                        </div>
                    )}
                    <h1 className="text-2xl font-semibold text-foreground">
                        {canManage ? (
                            <InlineText
                                aria-label="Project name"
                                value={project.name}
                                placeholder="Project name"
                                required
                                maxLength={255}
                                onSave={(name) => updateProject.mutateAsync({ name })}
                            />
                        ) : (
                            project.name
                        )}
                    </h1>
                </div>
                {canManage ? (
                    <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                        <InlineText
                            aria-label="Project description"
                            value={project.description}
                            placeholder="Add a description…"
                            multiline
                            maxLength={2000}
                            onSave={(description) => updateProject.mutateAsync({ description })}
                        />
                    </p>
                ) : (
                    project.description && (
                        <p className="max-w-2xl text-[15px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {project.description}
                        </p>
                    )
                )}
                <ProjectDates project={project} canManage={canManage} />
            </div>

            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
                <div className="flex flex-col gap-8 md:col-span-2"></div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2">
                        <h2 className="text-sm font-medium text-foreground">
                            Members
                            {project.members.length > 0 && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                    {project.members.length}
                                </span>
                            )}
                        </h2>
                        {canManage && <AddMemberDialog projectId={id} members={project.members} />}
                    </div>
                    <MemberList project={project} />
                </div>
            </div>
        </div>
    )
}

function MemberList({ project }: { project: ProjectDetails }) {
    if (project.members.length === 0) {
        return (
            <p className="text-[14px] text-muted-foreground">
                No members yet.
                {project.my_access.can_manage && ' Add the people who work on this project.'}
            </p>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            {project.members.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3 text-[14px]">
                    <div
                        className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px] font-medium text-ink-muted ring-1 ring-hairline-strong',
                            !member.is_active && 'opacity-50'
                        )}
                    >
                        {member.name.toUpperCase()[0]}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                            className={cn(
                                'truncate text-foreground/90',
                                !member.is_active && 'text-muted-foreground line-through'
                            )}
                            title={member.email}
                        >
                            {member.name}
                        </span>
                        {!member.is_active && (
                            <Badge variant="destructive" className="shrink-0">
                                Deactivated
                            </Badge>
                        )}
                        {member.role === 'admin' && (
                            <Badge variant="secondary" className="shrink-0">
                                Admin
                            </Badge>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function ProjectSkeleton() {
    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-8">
            <div className="flex flex-col gap-3">
                <Skeleton className="size-12 rounded-xl" />
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-full max-w-2xl" />
                <Skeleton className="h-5 w-72" />
            </div>
            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
                <div className="md:col-span-2" />
                <div className="flex flex-col gap-3">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                </div>
            </div>
        </div>
    )
}

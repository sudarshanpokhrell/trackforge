import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { UserCircle2, Calendar, Link as LinkIcon, FileText, Plus } from 'lucide-react'
import { AssigneePopover } from '@/components/issues/popovers'
import { MOCK_ASSIGNEES } from '@/components/issues/types'
import { sidebarData } from '@/components/sidebar/sidebar'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/projects/$projectId/')({
    component: ProjectHome,
})

function ProjectHome() {
    const { projectId } = Route.useParams()
    const project = sidebarData.navCollapsible.projects.find(p => p.id === projectId)
    const ProjectIcon = project?.icon

    const [lead, setLead] = useState<string | undefined>('alice')
    const [targetDate] = useState('Oct 24, 2026')
    const [updates, setUpdates] = useState([
        { id: 1, author: 'alice', date: '2 days ago', content: 'We just wrapped up the initial design phase. Moving into implementation now.' }
    ])
    const [newUpdate, setNewUpdate] = useState('')

    const leadUser = MOCK_ASSIGNEES.find(a => a.id === lead)

    const handleAddUpdate = () => {
        if (!newUpdate.trim()) return
        setUpdates([{
            id: Date.now(),
            author: 'bob',
            date: 'Just now',
            content: newUpdate
        }, ...updates])
        setNewUpdate('')
    }

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto py-8 px-6 gap-10">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                    {ProjectIcon && (
                        <div className={cn("size-12 rounded-xl flex items-center justify-center  ")}>
                            <ProjectIcon className="size-8 text-muted-foreground" />
                        </div>
                    )}
                    <h1 className="text-3xl font-semibold capitalize tracking-tight text-foreground">{project?.title || projectId.replace('-', ' ')}</h1>
                </div>
                <p className="text-muted-foreground text-[15px] max-w-2xl leading-relaxed">
                    This project focuses on the core implementation details, UI improvements, and new feature integrations.
                    Track progress, manage issues, and stay updated with the latest changes below.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Main Content (2/3) */}
                <div className="md:col-span-2 flex flex-col gap-8">
                    {/* Updates Section */}
                    <div className="flex flex-col gap-5">
                        <h2 className="text-sm font-medium border-b border-border/40 pb-2 text-foreground">Project Updates</h2>

                        <div className="flex flex-col gap-3 bg-muted/20 p-4 rounded-lg border border-border/40">
                            <textarea
                                value={newUpdate}
                                onChange={(e) => setNewUpdate(e.target.value)}
                                placeholder="What's new in this project?"
                                className="w-full min-h-[90px] resize-none rounded-md bg-transparent px-3 py-2 text-[14px] placeholder:text-muted-foreground/60 focus-visible:outline-none"
                            />
                            <div className="flex justify-end pt-2 border-t border-border/40">
                                <button
                                    onClick={handleAddUpdate}
                                    disabled={!newUpdate.trim()}
                                    className="inline-flex items-center justify-center rounded text-xs font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4"
                                >
                                    Post Update
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 mt-4">
                            {updates.map(update => {
                                const author = MOCK_ASSIGNEES.find(a => a.id === update.author)
                                return (
                                    <div key={update.id} className="flex gap-4">
                                        <div className={cn('size-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-1', author?.color || 'bg-muted text-muted-foreground')}>
                                            {author ? author.initials.slice(0, 1) : '?'}
                                        </div>
                                        <div className="flex flex-col gap-1.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[14px] font-medium text-foreground">{author?.name || 'Unknown'}</span>
                                                <span className="text-xs text-muted-foreground/60">{update.date}</span>
                                            </div>
                                            <div className="text-[14px] text-foreground/80 leading-relaxed">
                                                {update.content}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Sidebar (1/3) */}
                <div className="flex flex-col gap-8">
                    {/* Details */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-sm font-medium border-b border-border/40 pb-2 text-foreground">Details</h2>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4 text-[14px]">
                                <span className="w-24 text-muted-foreground flex items-center gap-2">
                                    <UserCircle2 className="size-4" />
                                    Lead
                                </span>
                                <AssigneePopover current={lead} onChange={setLead}>
                                    <div className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 -ml-2 rounded cursor-pointer transition-colors outline-none">
                                        {leadUser ? (
                                            <>
                                                <div className={cn('size-5 rounded-full flex items-center justify-center text-[9px] font-bold', leadUser.color)}>
                                                    {leadUser.initials.slice(0, 1)}
                                                </div>
                                                <span>{leadUser.name}</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="size-5 rounded-full border border-dashed border-border/80 flex items-center justify-center">
                                                    <UserCircle2 className="size-3.5 text-muted-foreground/40" />
                                                </div>
                                                <span className="text-muted-foreground">Unassigned</span>
                                            </>
                                        )}
                                    </div>
                                </AssigneePopover>
                            </div>

                            <div className="flex items-center gap-4 text-[14px]">
                                <span className="w-24 text-muted-foreground flex items-center gap-2">
                                    <Calendar className="size-4" />
                                    Target
                                </span>
                                <div className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 -ml-2 rounded cursor-pointer transition-colors">
                                    <span className="text-foreground">{targetDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Members */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                            <h2 className="text-sm font-medium text-foreground">Members</h2>
                            <button className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted/50">
                                <Plus className="size-3.5" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            {MOCK_ASSIGNEES.map(member => (
                                <div key={member.id} className="flex items-center gap-3 text-[14px]">
                                    <div className={cn('size-6 rounded-full flex items-center justify-center text-[10px] font-bold', member.color)}>
                                        {member.initials}
                                    </div>
                                    <span className="text-foreground/90">{member.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resources */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                            <h2 className="text-sm font-medium text-foreground">Resources</h2>
                            <button className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted/50">
                                <Plus className="size-3.5" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <a href="#" className="flex items-center gap-2.5 text-[14px] hover:underline text-foreground/80 group">
                                <FileText className="size-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                Project Brief
                            </a>
                            <a href="#" className="flex items-center gap-2.5 text-[14px] hover:underline text-foreground/80 group">
                                <LinkIcon className="size-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                Figma Designs
                            </a>
                            <a href="#" className="flex items-center gap-2.5 text-[14px] hover:underline text-foreground/80 group">
                                <LinkIcon className="size-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                API Documentation
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

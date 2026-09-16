import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/hooks/use-auth"
import {
    projectCommentsQuery,
    useCreateProjectComment,
    useDeleteProjectComment,
    useUpdateProjectComment,
} from "@/hooks/use-projects"
import { getErrorMessage } from "@/lib/api"
import type { ProjectComment } from "@/types/projects"
import { useQuery } from "@tanstack/react-query"
import { format, formatDistanceToNow } from "date-fns"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function CommentForm({ projectId }: { projectId: number }) {
    const [content, setContent] = useState('')
    const createComment = useCreateProjectComment(projectId)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) return

        try {
            await createComment.mutateAsync(content.trim())
            setContent('')
        } catch (e) {
            toast.error(getErrorMessage(e))
        }
    }

    return (
        <form className="flex flex-col gap-2" onSubmit={onSubmit}>
            <Textarea
                aria-label="Comment"
                placeholder="Leave a comment…"
                maxLength={2000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-26 resize-none rounded-xl px-3.5 py-3 focus-visible:ring-0"
            />
            <div className="flex justify-end">
                <Button
                    type="submit"
                    size="sm"
                    disabled={!content.trim() || createComment.isPending}
                >
                    {createComment.isPending && <Loader2 className="animate-spin" />}
                    Submit
                </Button>
            </div>
        </form>
    )
}

export function CommentList({ projectId, canManage }: { projectId: number; canManage: boolean }) {
    const { data: comments, isPending, error } = useQuery(projectCommentsQuery(projectId))

    if (isPending) {
        return (
            <div className="flex flex-col gap-6">
                {[0, 1].map((i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="size-6 rounded-full" />
                        <div className="flex flex-1 flex-col gap-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-full max-w-md" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (error) {
        return <p className="text-[14px] text-destructive">{getErrorMessage(error)}</p>
    }

    if (comments.length === 0) {
        return <p className="text-[14px] text-muted-foreground">No comments yet.</p>
    }

    return (
        <div className="flex flex-col gap-6">
            {comments.map((comment) => (
                <CommentItem
                    key={comment.id}
                    projectId={projectId}
                    comment={comment}
                    canManage={canManage}
                />
            ))}
        </div>
    )
}

function CommentItem({
    projectId,
    comment,
    canManage,
}: {
    projectId: number
    comment: ProjectComment
    canManage: boolean
}) {
    const user = useUser()
    const [editing, setEditing] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    const isAuthor = user?.id === comment.created_by
    const canEdit = isAuthor
    const canDelete = isAuthor || canManage

    const name = comment.creator?.name ?? 'Unknown user'
    const createdAt = new Date(comment.created_at)
    const edited = comment.updated_at !== comment.created_at

    return (
        <div className="group flex gap-3 text-[14px]">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px] font-medium text-ink-muted ring-1 ring-hairline-strong">
                {name.toUpperCase()[0]}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline gap-2">
                    <span className="truncate font-medium text-foreground" title={comment.creator?.email}>
                        {name}
                    </span>
                    <time
                        dateTime={comment.created_at}
                        title={format(createdAt, 'd MMM yyyy, HH:mm')}
                        className="shrink-0 text-xs text-muted-foreground"
                    >
                        {formatDistanceToNow(createdAt, { addSuffix: true })}
                    </time>
                    {edited && <span className="shrink-0 text-xs text-muted-foreground">(edited)</span>}
                    {(canEdit || canDelete) && !editing && (
                        <div className="ml-auto flex items-center gap-0.5 self-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 bg-surface-2 rounded-full px-1.5 py-0.5">
                            {canEdit && (
                                <button
                                    type="button"
                                    aria-label="Edit comment"
                                    title="Edit"
                                    onClick={() => setEditing(true)}
                                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                                >
                                    <Pencil className="size-3.5" />
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    type="button"
                                    aria-label="Delete comment"
                                    title="Delete"
                                    onClick={() => setConfirmingDelete(true)}
                                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <Trash2 className="size-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
                {editing ? (
                    <CommentEditor
                        projectId={projectId}
                        comment={comment}
                        onDone={() => setEditing(false)}
                    />
                ) : (
                    <p className="leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground/90">
                        {comment.content}
                    </p>
                )}
            </div>
            {canDelete && (
                <DeleteCommentDialog
                    projectId={projectId}
                    commentId={comment.id}
                    open={confirmingDelete}
                    onOpenChange={setConfirmingDelete}
                />
            )}
        </div>
    )
}

function CommentEditor({
    projectId,
    comment,
    onDone,
}: {
    projectId: number
    comment: ProjectComment
    onDone: () => void
}) {
    const [content, setContent] = useState(comment.content)
    const updateComment = useUpdateProjectComment(projectId)
    const trimmed = content.trim()

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!trimmed) return
        if (trimmed === comment.content) return onDone()

        try {
            await updateComment.mutateAsync({ commentId: comment.id, content: trimmed })
            onDone()
        } catch (e) {
            toast.error(getErrorMessage(e))
        }
    }

    return (
        <form className="mt-1 flex flex-col gap-2" onSubmit={onSubmit}>
            <Textarea
                autoFocus
                aria-label="Edit comment"
                maxLength={2000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') onDone()
                }}
                className="min-h-20 resize-none rounded-xl px-3.5 py-3 focus-visible:ring-0"
            />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onDone}>
                    Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!trimmed || updateComment.isPending}>
                    {updateComment.isPending && <Loader2 className="animate-spin" />}
                    Save
                </Button>
            </div>
        </form>
    )
}

function DeleteCommentDialog({
    projectId,
    commentId,
    open,
    onOpenChange,
}: {
    projectId: number
    commentId: number
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const deleteComment = useDeleteProjectComment(projectId)

    const onDelete = async () => {
        try {
            await deleteComment.mutateAsync(commentId)
            onOpenChange(false)
        } catch (e) {
            toast.error(getErrorMessage(e))
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="gap-4 p-4 sm:max-w-xs">
                <DialogTitle className="text-sm">Delete this comment?</DialogTitle>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={onDelete}
                        disabled={deleteComment.isPending}
                    >
                        {deleteComment.isPending && <Loader2 className="animate-spin" />}
                        Delete
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

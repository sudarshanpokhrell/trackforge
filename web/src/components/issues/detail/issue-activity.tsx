import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import { format, formatDistanceToNow } from "date-fns"
import {
  CircleDot,
  Loader2,
  Pencil,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { DeleteDialog } from "@/components/delete-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TabBar, type TabBarItem } from "@/components/ui/tab-bar"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/hooks/use-auth"
import {
  issueActivitiesQuery,
  issueCommentsQuery,
  useCreateIssueComment,
  useDeleteIssueComment,
  useUpdateIssueComment,
} from "@/hooks/use-issues"
import { getErrorMessage } from "@/lib/api"
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Issue,
  type IssueActivity,
  type IssueComment,
  type IssuePriority,
  type IssueStatus,
} from "@/types/issues"
import type { ProjectDetails } from "@/types/projects"
import { LabelDot } from "@/components/labels/label-chip"
import { PriorityIcon, StatusIcon } from "../icons"
import { UserAvatar } from "./user-avatar"

type Tab = "comments" | "activity"

/** Comments and the change history under separate tabs, each newest first. */
export function IssueDiscussion({ issue, project }: { issue: Issue; project?: ProjectDetails }) {
  const [tab, setTab] = useState<Tab>("comments")
  const activities = useQuery(issueActivitiesQuery(issue.id))
  const comments = useQuery(issueCommentsQuery(issue.id))

  const tabs: TabBarItem<Tab>[] = [
    { value: "comments", label: <TabLabel text="Comments" count={comments.data?.length} /> },
    { value: "activity", label: <TabLabel text="Activity" count={activities.data?.length} /> },
  ]

  return (
    <section className="flex flex-col gap-5">
      <TabBar aria-label="Issue discussion" tabs={tabs} value={tab} onValueChange={setTab} />

      {tab === "comments" ? (
        <CommentsPanel
          issueId={issue.id}
          query={comments}
          canManage={project?.my_access.can_manage ?? false}
        />
      ) : (
        <ActivityPanel query={activities} project={project} />
      )}
    </section>
  )
}

function TabLabel({ text, count }: { text: string; count?: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {text}
      {count !== undefined && count > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
      )}
    </span>
  )
}

function CommentsPanel({
  issueId,
  query,
  canManage,
}: {
  issueId: number
  query: UseQueryResult<IssueComment[]>
  canManage: boolean
}) {
  return (
    <div className="flex flex-col gap-5">
      <CommentComposer issueId={issueId} />

      {query.isPending ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : query.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(query.error)}</p>
      ) : query.data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        // The server already returns comments newest first.
        <ol className="flex flex-col gap-3">
          {query.data.map((comment) => (
            <CommentItem key={comment.id} issueId={issueId} comment={comment} canManage={canManage} />
          ))}
        </ol>
      )}
    </div>
  )
}

function ActivityPanel({
  query,
  project,
}: {
  query: UseQueryResult<IssueActivity[]>
  project?: ProjectDetails
}) {
  const memberName = (userId: string) =>
    project?.members.find((m) => m.user_id === userId)?.name ?? "someone"

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-5 w-64" />
      </div>
    )
  }

  if (query.error) {
    return <p className="text-sm text-destructive">{getErrorMessage(query.error)}</p>
  }

  // The server returns the trail oldest first; the newest change matters most.
  const newestFirst = [...query.data].reverse()

  return (
    <ol className="flex flex-col gap-4">
      {newestFirst.map((activity) => (
        <ActivityLine key={activity.id} activity={activity} memberName={memberName} />
      ))}
    </ol>
  )
}

function ActivityLine({
  activity,
  memberName,
}: {
  activity: IssueActivity
  memberName: (userId: string) => string
}) {
  const actor = activity.actor?.name ?? "Someone"
  const { icon, text } = describe(activity, memberName)

  return (
    <li className="flex items-center gap-3 pl-0.5 text-[13px] text-muted-foreground">
      <span className="flex size-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{actor}</span> {text}
        <span className="mx-1.5">·</span>
        <TimeAgo at={activity.created_at} />
      </span>
    </li>
  )
}

/** Turns an activity's type and payload into a sentence and an icon. */
function describe(
  activity: IssueActivity,
  memberName: (userId: string) => string
): { icon: React.ReactNode; text: React.ReactNode } {
  const p = activity.payload
  const muted = <CircleDot className="size-3.5" />

  switch (activity.type) {
    case "created":
      return { icon: muted, text: "created the issue" }
    case "title_changed":
      return {
        icon: <Pencil className="size-3.5" />,
        text: (
          <>
            changed the title to <span className="text-foreground">{String(p.to ?? "")}</span>
          </>
        ),
      }
    case "description_changed":
      return { icon: <Pencil className="size-3.5" />, text: "updated the description" }
    case "status_changed": {
      const to = p.to as IssueStatus
      return {
        icon: <StatusIcon status={to} className="size-3.5" />,
        text: (
          <>
            changed status from {STATUS_LABELS[p.from as IssueStatus] ?? String(p.from)} to{" "}
            <span className="text-foreground">{STATUS_LABELS[to] ?? String(to)}</span>
          </>
        ),
      }
    }
    case "priority_changed": {
      const to = p.to as IssuePriority
      return {
        icon: <PriorityIcon priority={to} className="size-3.5" />,
        text: (
          <>
            set priority to <span className="text-foreground">{PRIORITY_LABELS[to] ?? String(to)}</span>
          </>
        ),
      }
    }
    case "assignee_changed": {
      const name = memberName(String(p.user_id))
      return {
        icon: <UserRound className="size-3.5" />,
        text: (
          <>
            {p.action === "unassigned" ? "unassigned" : "assigned"}{" "}
            <span className="text-foreground">{name}</span>
          </>
        ),
      }
    }
    case "label_added":
    case "label_removed":
      return {
        icon: <Tag className="size-3.5" />,
        text: (
          <>
            {activity.type === "label_added" ? "added label" : "removed label"}{" "}
            <span className="inline-flex items-center gap-1 text-foreground">
              <LabelDot color={String(p.color ?? "#64748b")} />
              {String(p.name ?? "")}
            </span>
          </>
        ),
      }
    default:
      return { icon: muted, text: "updated the issue" }
  }
}

function CommentItem({
  issueId,
  comment,
  canManage,
}: {
  issueId: number
  comment: IssueComment
  canManage: boolean
}) {
  const user = useUser()
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const deleteComment = useDeleteIssueComment(issueId)

  // The server lets only the author edit, and the author or a project admin delete.
  const isAuthor = user?.id === comment.author_id
  const canDelete = isAuthor || canManage
  const name = comment.author?.name ?? "Unknown user"
  const edited = comment.updated_at !== comment.created_at

  const onDelete = async () => {
    try {
      await deleteComment.mutateAsync(comment.id)
      setConfirmingDelete(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <li className="group flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-[13px]">
        <UserAvatar name={name} />
        <span className="font-medium text-foreground">{name}</span>
        <span className="text-muted-foreground">
          <TimeAgo at={comment.created_at} />
          {edited && " (edited)"}
        </span>
        {(isAuthor || canDelete) && !editing && (
          <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            {isAuthor && (
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
        <CommentEditor issueId={issueId} comment={comment} onDone={() => setEditing(false)} />
      ) : (
        <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground/90">
          {comment.content}
        </p>
      )}

      <DeleteDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this comment?"
        onConfirm={onDelete}
        pending={deleteComment.isPending}
      />
    </li>
  )
}

function CommentEditor({
  issueId,
  comment,
  onDone,
}: {
  issueId: number
  comment: IssueComment
  onDone: () => void
}) {
  const [content, setContent] = useState(comment.content)
  const updateComment = useUpdateIssueComment(issueId)
  const trimmed = content.trim()

  const onSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
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
    <form className="flex flex-col gap-2" onSubmit={onSubmit}>
      <Textarea
        autoFocus
        aria-label="Edit comment"
        maxLength={2000}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone()
        }}
        className="min-h-20 resize-none rounded-lg focus-visible:ring-0"
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

function CommentComposer({ issueId }: { issueId: number }) {
  const [content, setContent] = useState("")
  const createComment = useCreateIssueComment(issueId)

  const onSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      await createComment.mutateAsync(content.trim())
      setContent("")
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
        className="min-h-24 resize-none rounded-xl px-3.5 py-3 focus-visible:ring-0"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!content.trim() || createComment.isPending}>
          {createComment.isPending && <Loader2 className="animate-spin" />}
          Comment
        </Button>
      </div>
    </form>
  )
}

function TimeAgo({ at }: { at: string }) {
  const date = new Date(at)
  return (
    <time dateTime={at} title={format(date, "d MMM yyyy, HH:mm")}>
      {formatDistanceToNow(date, { addSuffix: true })}
    </time>
  )
}

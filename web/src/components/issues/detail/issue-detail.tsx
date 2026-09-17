import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  ArrowExpandDiagonal01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { toast } from "sonner"
import { DeleteDialog } from "@/components/delete-dialog"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { InlineText } from "@/components/inline-text"
import { ProjectIcon } from "@/components/projects/project-icon"
import { Skeleton } from "@/components/ui/skeleton"
import { issueQuery, useDeleteIssue, useUpdateIssue } from "@/hooks/use-issues"
import { projectQuery } from "@/hooks/use-projects"
import { getErrorMessage, isApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Issue } from "@/types/issues"
import { IssueDiscussion } from "./issue-activity"
import { IssueProperties } from "./issue-properties"

type Variant = "page" | "peek"

type IssueDetailProps = {
  issueId: number
  /** "page" is the full route; "peek" is the side panel over the issue list. */
  variant: Variant
  /** Peek only: closes the panel. */
  onClose?: () => void
  /** Called after the issue is deleted, to leave the now-empty view. */
  onDeleted: (issue: Issue) => void
}

export function IssueDetail({ issueId, variant, onClose, onDeleted }: IssueDetailProps) {
  const valid = Number.isInteger(issueId) && issueId > 0
  const { data: issue, isPending, error } = useQuery({ ...issueQuery(issueId), enabled: valid })

  if (!valid || (error && isApiError(error, 404))) {
    return (
      <Message variant={variant} onClose={onClose} title="Issue not found">
        It may have been deleted, or you may not have access to it.
      </Message>
    )
  }

  if (error) {
    return (
      <Message variant={variant} onClose={onClose} title="Something went wrong">
        {getErrorMessage(error)}
      </Message>
    )
  }

  if (isPending) return <DetailSkeleton variant={variant} />

  // Keyed so moving to another issue starts its editors from that issue.
  return (
    <IssueView key={issue.id} issue={issue} variant={variant} onClose={onClose} onDeleted={onDeleted} />
  )
}

function IssueView({
  issue,
  variant,
  onClose,
  onDeleted,
}: {
  issue: Issue
  variant: Variant
  onClose?: () => void
  onDeleted: (issue: Issue) => void
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const { data: project } = useQuery(projectQuery(issue.project_id))
  const updateIssue = useUpdateIssue(issue)
  const deleteIssue = useDeleteIssue(issue.project_id)
  const peek = variant === "peek"

  const onDelete = async () => {
    try {
      await deleteIssue.mutateAsync(issue.id)
      toast.success("Issue deleted.")
      setConfirmingDelete(false)
      onDeleted(issue)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const body = (
    <>
      <h1 className={cn("font-semibold text-foreground", peek ? "text-xl" : "text-2xl")}>
        <InlineText
          aria-label="Issue title"
          value={issue.title}
          placeholder="Issue title"
          required
          maxLength={500}
          onSave={(title) => updateIssue.mutateAsync({ title })}
        />
      </h1>

      {/* In the peek, and on narrow pages, the fields sit under the title. */}
      <div className={cn("rounded-xl border border-border p-3", !peek && "lg:hidden")}>
        <IssueProperties issue={issue} project={project} />
      </div>

      <RichTextEditor
        aria-label="Issue description"
        placeholder="Add a description…"
        value={issue.description ?? ""}
        onCommit={(description) =>
          updateIssue.mutate({ description }, { onError: (e) => toast.error(getErrorMessage(e)) })
        }
        className="min-h-24 text-[15px] leading-relaxed text-foreground"
      />

      <div className="border-t border-border" />

      <IssueDiscussion issue={issue} project={project} />
    </>
  )

  return (
    <div className={cn("flex flex-col", peek && "h-full min-h-0")}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 lg:px-6">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          <Link
            to="/projects/$projectId"
            params={{ projectId: String(issue.project_id) }}
            className="flex shrink-0 items-center gap-1.5 rounded px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ProjectIcon emoji={project?.emoji} className="size-4 text-sm" />
            {project?.name ?? "Project"}
          </Link>
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 shrink-0 text-muted-foreground/60" />
          <Link
            to="/projects/$projectId/issues"
            params={{ projectId: String(issue.project_id) }}
            className="shrink-0 rounded px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Issues
          </Link>
          {!peek && (
            <>
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 shrink-0 text-muted-foreground/60" />
              <span className="truncate px-1 text-foreground">{issue.title}</span>
            </>
          )}
        </nav>

        <HeaderButton label="Delete issue" onClick={() => setConfirmingDelete(true)} destructive>
          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
        </HeaderButton>
        {peek && (
          <>
            <Link
              to="/issues/$issueId"
              params={{ issueId: String(issue.id) }}
              aria-label="Open as full page"
              title="Open as full page"
              className={headerButton}
            >
              <HugeiconsIcon icon={ArrowExpandDiagonal01Icon} className="size-4" />
            </Link>
            <HeaderButton label="Close" onClick={onClose}>
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
            </HeaderButton>
          </>
        )}
      </header>

      {peek ? (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">{body}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 lg:px-10">
            {body}
          </main>
          <div className="hidden border-l border-border px-5 py-8 lg:block">
            <div className="sticky top-8">
              <IssueProperties issue={issue} project={project} />
            </div>
          </div>
        </div>
      )}

      <DeleteDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete “${issue.title}”?`}
        description="Its comments and activity go with it. This cannot be undone."
        onConfirm={onDelete}
        pending={deleteIssue.isPending}
      />
    </div>
  )
}

const headerButton =
  "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"

function HeaderButton({
  label,
  onClick,
  destructive = false,
  children,
}: {
  label: string
  onClick?: () => void
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        headerButton,
        destructive && "hover:bg-destructive/10 hover:text-destructive"
      )}
    >
      {children}
    </button>
  )
}

function Message({
  variant,
  onClose,
  title,
  children,
}: {
  variant: Variant
  onClose?: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      {variant === "peek" && (
        <header className="flex h-12 items-center justify-end border-b border-border px-4">
          <HeaderButton label="Close" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </HeaderButton>
        </header>
      )}
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-lg font-medium">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

function DetailSkeleton({ variant }: { variant: Variant }) {
  return (
    <div className="flex flex-col">
      <div className="h-12 border-b border-border" />
      <div
        className={cn(
          "flex flex-col gap-4 px-6 py-8",
          variant === "page" && "mx-auto w-full max-w-3xl lg:px-10"
        )}
      >
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

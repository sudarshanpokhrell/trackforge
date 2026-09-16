import { useAddIssueLabel, useRemoveIssueLabel } from '@/hooks/use-labels'
import { getErrorMessage } from '@/lib/api'
import type { Issue, LabelSummary } from '@/types/issues'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { LabelChip } from './label-chip'
import { LabelPicker } from './label-picker'

/** An issue's labels, with a picker that applies or removes them one at a time. */
export function IssueLabels({ issue, compact }: { issue: Issue; compact?: boolean }) {
  const addLabel = useAddIssueLabel(issue)
  const removeLabel = useRemoveIssueLabel(issue)

  const onToggle = (label: LabelSummary, checked: boolean) => {
    const mutation = checked ? addLabel : removeLabel
    mutation.mutate(label.id, { onError: (e) => toast.error(getErrorMessage(e)) })
  }

  const shown = compact ? issue.labels.slice(0, 2) : issue.labels
  const hidden = issue.labels.length - shown.length

  return (
    <LabelPicker
      projectId={issue.project_id}
      selected={issue.labels.map((l) => l.id)}
      onToggle={onToggle}
      className="flex min-w-0 cursor-pointer flex-wrap items-center gap-1 rounded p-0.5 outline-none transition-colors hover:bg-muted"
    >
      {shown.map((label) => (
        <LabelChip key={label.id} label={label} />
      ))}
      {hidden > 0 && <span className="text-xs text-muted-foreground">+{hidden}</span>}
      {issue.labels.length === 0 &&
        (compact ? (
          <span className="flex size-5 items-center justify-center text-muted-foreground/40 opacity-0 group-hover/row:opacity-100">
            <Plus className="size-3.5" />
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Add labels</span>
        ))}
    </LabelPicker>
  )
}

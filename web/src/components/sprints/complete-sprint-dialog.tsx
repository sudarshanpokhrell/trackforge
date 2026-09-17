import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCompleteCycle } from "@/hooks/use-cycles"
import { getErrorMessage } from "@/lib/api"
import type { Cycle } from "@/types/cycles"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { openIssueCount } from "./sprint-status"

const NO_SPRINT = "none"

type CompleteSprintDialogProps = {
  projectId: number
  sprint: Cycle
  /** The project's sprints; the open ones other than this are move targets. */
  sprints: Cycle[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CompleteSprintDialog({ open, onOpenChange, ...props }: CompleteSprintDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-md">
        <CompleteForm onDone={() => onOpenChange(false)} {...props} />
      </DialogContent>
    </Dialog>
  )
}

function CompleteForm({
  projectId,
  sprint,
  sprints,
  onDone,
}: Omit<CompleteSprintDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const targets = sprints
    .filter((s) => s.id !== sprint.id && s.status !== "completed")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  // The next sprint to start is the usual home for unfinished work.
  const [target, setTarget] = useState<string>(
    String(targets.find((s) => s.start_date > sprint.start_date)?.id ?? NO_SPRINT)
  )
  const completeSprint = useCompleteCycle(projectId)
  const open = openIssueCount(sprint)

  const onComplete = async () => {
    try {
      const { moved_issue_count } = await completeSprint.mutateAsync({
        cycleId: sprint.id,
        moveTo: target === NO_SPRINT ? null : Number(target),
      })
      toast.success(
        moved_issue_count > 0
          ? `${sprint.name} completed. ${moved_issue_count} open ${moved_issue_count === 1 ? "issue" : "issues"} moved.`
          : `${sprint.name} completed.`
      )
      onDone()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const label = (value: string | null) =>
    value === NO_SPRINT ? "No sprint" : (targets.find((s) => String(s.id) === value)?.name ?? "No sprint")

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <DialogTitle className="text-sm">Complete {sprint.name}?</DialogTitle>
          <DialogDescription className="text-sm">
            {open === 0
              ? "Every issue in it is done or cancelled."
              : `${open} ${open === 1 ? "issue isn't" : "issues aren't"} done or cancelled yet.`}{" "}
            A completed sprint can't be edited.
          </DialogDescription>
        </div>

        {open > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Move open issues to</span>
            <Select value={target} onValueChange={(v) => v && setTarget(v)}>
              <SelectTrigger className="w-full data-[size=default]:h-9">
                <SelectValue>{label}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {targets.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value={NO_SPRINT}>No sprint</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onComplete} disabled={completeSprint.isPending}>
          {completeSprint.isPending && <Loader2 className="animate-spin" />}
          Complete sprint
        </Button>
      </div>
    </div>
  )
}

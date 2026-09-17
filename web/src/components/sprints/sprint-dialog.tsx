import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { useCreateCycle, useUpdateCycle } from "@/hooks/use-cycles"
import { getErrorMessage } from "@/lib/api"
import { fromApiDate, toApiDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { Cycle } from "@/types/cycles"
import { addDays, format, isAfter } from "date-fns"
import { CalendarRange, Loader2 } from "lucide-react"
import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"

type SprintDialogProps = {
  projectId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The project's sprints, to suggest dates and grey out days already taken. */
  sprints: Cycle[]
  /** Given to edit that sprint; left out to create one. */
  sprint?: Cycle
}

export function SprintDialog({ open, onOpenChange, ...props }: SprintDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-md">
        {/* Mounted only while open, so each opening starts from fresh values. */}
        <SprintForm onDone={() => onOpenChange(false)} {...props} />
      </DialogContent>
    </Dialog>
  )
}

function SprintForm({
  projectId,
  sprints,
  sprint,
  onDone,
}: Omit<SprintDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const editing = sprint !== undefined
  const [name, setName] = useState(sprint?.name ?? `Sprint ${sprints.length + 1}`)
  const [description, setDescription] = useState(sprint?.description ?? "")
  const [range, setRange] = useState<DateRange | undefined>(() =>
    sprint
      ? { from: fromApiDate(sprint.start_date), to: fromApiDate(sprint.end_date) }
      : suggestRange(sprints)
  )
  const [error, setError] = useState("")

  const createSprint = useCreateCycle(projectId)
  const updateSprint = useUpdateCycle(projectId)
  const pending = createSprint.isPending || updateSprint.isPending
  const canSubmit = name.trim() !== "" && range?.from && range?.to && !pending

  // Days other sprints already cover; the server rejects overlaps anyway.
  const taken = sprints
    .filter((s) => s.id !== sprint?.id)
    .map((s) => ({ from: fromApiDate(s.start_date)!, to: fromApiDate(s.end_date)! }))

  const onSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit || !range?.from || !range.to) return

    const input = {
      name: name.trim(),
      description: description.trim(),
      start_date: toApiDate(range.from),
      end_date: toApiDate(range.to),
    }

    try {
      if (editing) {
        await updateSprint.mutateAsync({ cycleId: sprint.id, ...input })
        toast.success("Sprint updated.")
      } else {
        await createSprint.mutateAsync(input)
        toast.success(`${input.name} created.`)
      }
      onDone()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  return (
    <form className="flex flex-col" onSubmit={onSubmit}>
      <div className="flex flex-col gap-4 p-5">
        <DialogTitle className="text-sm">{editing ? "Edit sprint" : "New sprint"}</DialogTitle>

        <Input
          autoFocus
          aria-label="Sprint name"
          placeholder="Sprint name"
          maxLength={100}
          className="h-9"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <DateRangeField value={range} onChange={setRange} taken={taken} />

        <Textarea
          aria-label="Sprint goal"
          placeholder="Sprint goal (optional)"
          maxLength={2000}
          className="min-h-20 resize-none"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {pending && <Loader2 className="animate-spin" />}
          {editing ? "Save" : "Create sprint"}
        </Button>
      </div>
    </form>
  )
}

function DateRangeField({
  value,
  onChange,
  taken,
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  taken: { from: Date; to: Date }[]
}) {
  const [open, setOpen] = useState(false)
  const complete = value?.from && value?.to

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm transition-colors hover:border-hairline-strong data-popup-open:border-hairline-strong",
              !complete && "text-muted-foreground"
            )}
          />
        }
      >
        <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
        {complete
          ? `${format(value.from!, "d MMM yyyy")} – ${format(value.to!, "d MMM yyyy")}`
          : "Pick start and end dates"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={value?.from}
          selected={value}
          disabled={taken}
          excludeDisabled
          onSelect={(next) => {
            onChange(next)
            // Close once both ends are chosen, not on the first click.
            if (next?.from && next?.to && next.from.getTime() !== next.to.getTime()) setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/** Two weeks starting the day after the latest sprint ends, or today. */
function suggestRange(sprints: Cycle[]): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const latestEnd = sprints
    .map((s) => fromApiDate(s.end_date)!)
    .reduce<Date | undefined>((latest, d) => (!latest || isAfter(d, latest) ? d : latest), undefined)

  const from = latestEnd && isAfter(addDays(latestEnd, 1), today) ? addDays(latestEnd, 1) : today
  return { from, to: addDays(from, 13) }
}

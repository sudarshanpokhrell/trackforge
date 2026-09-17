import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCreateCycle, useUpdateCycle } from "@/hooks/use-cycles"
import { getErrorMessage } from "@/lib/api"
import { fromApiDate, toApiDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { Cycle } from "@/types/cycles"
import { addDays, format, isAfter } from "date-fns"
import { CalendarRange, Loader2, XIcon } from "lucide-react"
import { useRef, useState } from "react"
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

type Span = { from: Date; to: Date }

export function SprintDialog({ open, onOpenChange, ...props }: SprintDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(560px,calc(100dvh-4rem))] flex-col gap-0 p-0 sm:max-w-2xl"
      >
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
      : suggestSpan(sprints)
  )
  const [error, setError] = useState("")

  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const createSprint = useCreateCycle(projectId)
  const updateSprint = useUpdateCycle(projectId)
  const pending = createSprint.isPending || updateSprint.isPending
  const canSubmit = name.trim() !== "" && range?.from && range?.to && !pending

  // Days other sprints already cover; the server rejects overlaps anyway.
  const taken: Span[] = sprints
    .filter((s) => s.id !== sprint?.id)
    .map((s) => ({ from: fromApiDate(s.start_date)!, to: fromApiDate(s.end_date)! }))

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
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
    <form
      noValidate
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void onSubmit(e)
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex items-center justify-between px-5 pt-4">
        <DialogTitle className="text-sm font-normal text-muted-foreground">
          {editing ? "Edit sprint" : "New sprint"}
        </DialogTitle>
        <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" />}>
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogClose>
      </div>

      <div className="flex flex-col gap-3 px-6 pt-3">
        <input
          autoFocus
          aria-label="Sprint name"
          placeholder="Sprint name"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            // Enter moves on to the goal rather than submitting.
            if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
              e.preventDefault()
              descriptionRef.current?.focus()
            }
          }}
          className="bg-transparent text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
        />

        <div className="flex flex-wrap gap-2 pt-1">
          <DateRangeChip value={range} onChange={setRange} taken={taken} />
        </div>
      </div>

      <div className="mx-6 mt-5 border-t border-border" />

      <textarea
        ref={descriptionRef}
        aria-label="Sprint goal"
        placeholder="What should this sprint achieve?"
        maxLength={2000}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="min-h-0 flex-1 resize-none bg-transparent px-6 py-5 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
      />

      <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
        {error && (
          <p className="mr-auto text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!canSubmit}>
          {pending && <Loader2 className="animate-spin" />}
          {editing ? "Save" : "Create sprint"}
        </Button>
      </div>
    </form>
  )
}

/** A pill that opens one calendar for both ends of the sprint. */
function DateRangeChip({
  value,
  onChange,
  taken,
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  taken: Span[]
}) {
  const [open, setOpen] = useState(false)
  const { from, to } = value ?? {}

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 text-xs transition-colors hover:bg-muted data-popup-open:bg-muted",
              from && to ? "text-foreground" : "text-muted-foreground"
            )}
          />
        }
      >
        <CalendarRange className="size-3.5" />
        {from
          ? `${format(from, "d MMM yyyy")} – ${to ? format(to, "d MMM yyyy") : "End date"}`
          : "Start and end dates"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          autoFocus
          defaultMonth={from}
          selected={value}
          disabled={taken}
          excludeDisabled
          // Once both ends are set, the next click starts over from a new start
          // date instead of dragging the end around.
          resetOnSelect
          onSelect={(next) => {
            onChange(next)
            if (next?.from && next?.to) setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/** Two weeks starting the day after the latest sprint ends, or today. */
function suggestSpan(sprints: Cycle[]): Span {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const latestEnd = sprints
    .map((s) => fromApiDate(s.end_date)!)
    .reduce<Date | undefined>((latest, d) => (!latest || isAfter(d, latest) ? d : latest), undefined)

  const from = latestEnd && isAfter(addDays(latestEnd, 1), today) ? addDays(latestEnd, 1) : today
  return { from, to: addDays(from, 13) }
}

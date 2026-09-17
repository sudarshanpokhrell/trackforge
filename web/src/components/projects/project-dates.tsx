import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useUpdateProject } from "@/hooks/use-projects"
import { getErrorMessage } from "@/lib/api"
import { toDateInput, toDateTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { Project } from "@/types/projects"
import { format, isSameDay, parseISO } from "date-fns"
import { Calendar03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import type { Matcher } from "react-day-picker"
import { toast } from "sonner"

type DateField = "start_date" | "target_date"

function toDay(value: string | null) {
  return value ? parseISO(toDateInput(value)) : undefined
}

export function ProjectDates({
  project,
  canManage,
}: {
  project: Project
  canManage: boolean
}) {
  const updateProject = useUpdateProject(project.id)
  const start = toDay(project.start_date)
  const target = toDay(project.target_date)

  if (!canManage && !start && !target) return null

  const save = async (field: DateField, day: Date) => {
    try {
      await updateProject.mutateAsync({
        [field]: toDateTime(format(day, "yyyy-MM-dd")),
      })
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-muted-foreground">
      <DatePick
        label="Start date"
        value={start}
        editable={canManage}
        // The server rejects a target before the start, so don't offer one.
        disabled={target ? { after: target } : undefined}
        onSelect={(day) => save("start_date", day)}
      />
      <DatePick
        label="Target date"
        value={target}
        editable={canManage}
        disabled={start ? { before: start } : undefined}
        onSelect={(day) => save("target_date", day)}
      />
    </div>
  )
}

function DatePick({
  label,
  value,
  editable,
  disabled,
  onSelect,
}: {
  label: string
  value: Date | undefined
  editable: boolean
  disabled?: Matcher
  onSelect: (day: Date) => void
}) {
  const [open, setOpen] = useState(false)
  const text = value ? format(value, "d MMM yyyy") : "Not set"

  return (
    <span className="flex items-center gap-2">
      <HugeiconsIcon icon={Calendar03Icon} className="size-4 shrink-0 text-ink-subtle" />
      {label}
      {editable ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            aria-label={
              value
                ? `${label}: ${format(value, "PPP")}`
                : `Set ${label.toLowerCase()}`
            }
            className={cn(
              "cursor-pointer rounded-sm transition-colors outline-none hover:text-foreground focus-visible:underline data-popup-open:text-foreground",
              value ? "text-foreground" : "text-muted-foreground/70"
            )}
          >
            {text}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              required
              autoFocus
              selected={value}
              defaultMonth={value}
              disabled={disabled}
              onSelect={(day) => {
                setOpen(false)
                if (!value || !isSameDay(day, value)) onSelect(day)
              }}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <span className={value ? "text-foreground" : undefined}>{text}</span>
      )}
    </span>
  )
}

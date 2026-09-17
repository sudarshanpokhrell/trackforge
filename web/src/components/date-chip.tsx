import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarDays } from "lucide-react"
import { useState } from "react"
import type { Matcher } from "react-day-picker"

/** A pill that opens a calendar. Clicking the chosen day again clears it. */
export function DateChip({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: Date | undefined
  onChange: (day: Date | undefined) => void
  disabled?: Matcher | Matcher[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 text-xs transition-colors hover:bg-muted data-popup-open:bg-muted",
              value ? "text-foreground" : "text-muted-foreground"
            )}
          />
        }
      >
        <CalendarDays className="size-3.5" />
        {value ? `${label} · ${format(value, "d MMM yyyy")}` : label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          autoFocus
          selected={value}
          defaultMonth={value}
          disabled={disabled}
          onSelect={(day) => {
            setOpen(false)
            onChange(day)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

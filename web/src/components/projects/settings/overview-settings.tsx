import { EmojiPicker } from "@/components/emoji-picker"
import { ProjectIcon } from "@/components/projects/project-icon"
import { Button } from "@/components/ui/button"
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
import type { ProjectDetails } from "@/types/projects"
import { format, isSameDay, parseISO } from "date-fns"
import { CalendarDays, Loader2, Pencil } from "lucide-react"
import { useState } from "react"
import type { Matcher } from "react-day-picker"
import { toast } from "sonner"
import { SettingsHeader } from "./settings-header"

function toDay(value: string | null) {
  return value ? parseISO(toDateInput(value)) : undefined
}

export function OverviewSettings({ project }: { project: ProjectDetails }) {
  const canManage = project.my_access.can_manage
  const updateProject = useUpdateProject(project.id)

  const [editing, setEditing] = useState(false)
  const [emoji, setEmoji] = useState(project.emoji)
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [start, setStart] = useState(toDay(project.start_date))
  const [target, setTarget] = useState(toDay(project.target_date))

  const cancel = () => {
    setEmoji(project.emoji)
    setName(project.name)
    setDescription(project.description)
    setStart(toDay(project.start_date))
    setTarget(toDay(project.target_date))
    setEditing(false)
  }

  const onSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      await updateProject.mutateAsync({
        emoji,
        name: name.trim(),
        description: description.trim(),
        start_date: start ? toDateTime(format(start, "yyyy-MM-dd")) : undefined,
        target_date: target
          ? toDateTime(format(target, "yyyy-MM-dd"))
          : undefined,
      })
      toast.success("Project updated.")
      setEditing(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const icon = (
    <ProjectIcon
      emoji={emoji}
      className="size-5 text-xl text-muted-foreground"
    />
  )

  return (
    <section className="flex flex-col gap-6">
      <SettingsHeader
        title="Overview"
        description="The project's icon, name, description and dates."
      />
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-border bg-card"
      >
        <div className="flex flex-col gap-3 p-6">
          <div className="flex items-start justify-between gap-4">
            {editing ? (
              <EmojiPicker
                aria-label="Change project icon"
                value={emoji}
                onChange={setEmoji}
                trigger={
                  <button
                    type="button"
                    className="flex size-9 cursor-pointer items-center justify-center rounded-lg bg-muted/60 transition-colors hover:bg-muted data-popup-open:bg-muted"
                  />
                }
              >
                {icon}
              </EmojiPicker>
            ) : (
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted/60">
                {icon}
              </div>
            )}

            {canManage && !editing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil />
                Edit
              </Button>
            )}
          </div>

          <input
            aria-label="Project name"
            placeholder="Project name"
            maxLength={255}
            readOnly={!editing}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
          />

          <textarea
            aria-label="Project description"
            placeholder={editing ? "Add a description…" : "No description"}
            maxLength={2000}
            rows={1}
            readOnly={!editing}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="field-sizing-content resize-none bg-transparent text-[15px] leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/60"
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <DateChip
              label="Start"
              value={start}
              onChange={setStart}
              editable={editing}
              // The server rejects a target before the start, so don't offer one.
              disabled={target ? { after: target } : undefined}
            />
            <DateChip
              label="Target"
              value={target}
              onChange={setTarget}
              editable={editing}
              disabled={start ? { before: start } : undefined}
            />
          </div>
        </div>

        {editing && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <Button type="button" variant="ghost" onClick={cancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || updateProject.isPending}
            >
              {updateProject.isPending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </div>
        )}
      </form>
    </section>
  )
}

function DateChip({
  label,
  value,
  onChange,
  editable,
  disabled,
}: {
  label: string
  value: Date | undefined
  onChange: (day: Date) => void
  editable: boolean
  disabled?: Matcher
}) {
  const [open, setOpen] = useState(false)

  const className = cn(
    "inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs",
    value ? "text-foreground" : "text-muted-foreground"
  )
  const content = (
    <>
      <CalendarDays className="size-3.5" />
      {value ? `${label} · ${format(value, "d MMM yyyy")}` : label}
    </>
  )

  if (!editable) return <span className={className}>{content}</span>

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              className,
              "cursor-pointer transition-colors hover:bg-muted data-popup-open:bg-muted"
            )}
          />
        }
      >
        {content}
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
            if (!value || !isSameDay(day, value)) onChange(day)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

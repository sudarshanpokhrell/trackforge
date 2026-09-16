import { EmojiPicker } from "@/components/emoji-picker"
import { ProjectIcon } from "@/components/projects/project-icon"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCreateProject } from "@/hooks/use-projects"
import { getErrorMessage } from "@/lib/api"
import { toDateTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarDays, Loader2, Plus, XIcon } from "lucide-react"
import { useRef, useState } from "react"
import type { Matcher } from "react-day-picker"
import { toast } from "sonner"

const toApiDate = (day: Date | undefined) =>
  day ? toDateTime(format(day, "yyyy-MM-dd")) : null


export function CreateProjectDialog({
  trigger,
  children,
}: {
  trigger?: React.ReactElement
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [emoji, setEmoji] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [start, setStart] = useState<Date>()
  const [target, setTarget] = useState<Date>()
  const [error, setError] = useState("")

  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const createProject = useCreateProject()
  const canSubmit = name.trim() !== "" && !createProject.isPending

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setEmoji("")
      setName("")
      setDescription("")
      setStart(undefined)
      setTarget(undefined)
      setError("")
    }
  }

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!canSubmit) return

    try {
      const { project } = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        emoji,
        start_date: toApiDate(start),
        target_date: toApiDate(target),
      })
      toast.success(`${project.name} created.`)
      onOpenChange(false)
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger ?? <Button />}>
        {children ?? (
          <>
            <Plus />
            New project
          </>
        )}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(720px,calc(100dvh-4rem))] flex-col gap-0 p-0 sm:max-w-4xl"
      >
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
              New project
            </DialogTitle>
            <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" />}>
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div className="flex flex-col gap-3 px-6 pt-3">
            <EmojiPicker
              aria-label="Pick a project icon"
              value={emoji}
              onChange={setEmoji}
              trigger={
                <button
                  type="button"
                  className="flex size-9 cursor-pointer items-center justify-center self-start rounded-lg bg-muted/60 transition-colors hover:bg-muted data-popup-open:bg-muted"
                />
              }
            >
              <ProjectIcon emoji={emoji} className="size-5 text-xl text-muted-foreground" />
            </EmojiPicker>

            <input
              autoFocus
              aria-label="Project name"
              placeholder="Project name"
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                // Enter moves on to the description rather than submitting half a project.
                if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault()
                  descriptionRef.current?.focus()
                }
              }}
              className="bg-transparent text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <DateChip
                label="Start"
                value={start}
                onChange={setStart}
                // The server rejects a target before the start, so don't offer one.
                disabled={target ? { after: target } : undefined}
              />
              <DateChip
                label="Target"
                value={target}
                onChange={setTarget}
                disabled={start ? { before: start } : undefined}
              />
            </div>
          </div>

          <div className="mx-6 mt-5 border-t border-border" />

          <textarea
            ref={descriptionRef}
            aria-label="Project description"
            placeholder="Write a description, a project brief, or collect ideas…"
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
              {createProject.isPending && <Loader2 className="animate-spin" />}
              Create project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** A pill that opens a calendar. Clicking the chosen day again clears it. */
function DateChip({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: Date | undefined
  onChange: (day: Date | undefined) => void
  disabled?: Matcher
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

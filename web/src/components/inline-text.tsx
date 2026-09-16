import { getErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useRef, useState } from "react"
import { toast } from "sonner"

type InlineTextProps = {
  value: string
  onSave: (next: string) => Promise<unknown>
  "aria-label": string
  placeholder?: string
  multiline?: boolean
  /** An emptied value is thrown away rather than saved. */
  required?: boolean
  maxLength?: number
  className?: string
}

export function InlineText({
  value,
  onSave,
  placeholder,
  multiline = false,
  required = false,
  maxLength,
  className,
  ...props
}: InlineTextProps) {
  const [draft, setDraft] = useState(value)
  const [prevValue, setPrevValue] = useState(value)
  const [focused, setFocused] = useState(false)
  const cancelled = useRef(false)

  // Pick up changes made elsewhere, but never under the user's cursor.
  if (value !== prevValue) {
    setPrevValue(value)
    if (!focused) setDraft(value)
  }

  const commit = async () => {
    const next = multiline ? draft.trim() : draft.replace(/\s+/g, " ").trim()

    if (next === value || (required && !next)) {
      setDraft(value)
      return
    }

    setDraft(next)
    try {
      await onSave(next)
    } catch (e) {
      setDraft(value)
      toast.error(getErrorMessage(e))
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      cancelled.current = true
      setDraft(value)
      e.currentTarget.blur()
    } else if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    // The invisible copy sizes the grid cell, so the textarea grows with its
    // text at any width without measuring it in JS.
    <span className={cn("grid w-full", className)}>
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 wrap-break-word whitespace-pre-wrap"
      >
        {draft || placeholder}{" "}
      </span>
      <textarea
        {...props}
        rows={1}
        value={draft}
        maxLength={maxLength}
        placeholder={placeholder}
        spellCheck={multiline}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          if (cancelled.current) {
            cancelled.current = false
            return
          }
          void commit()
        }}
        className="col-start-1 row-start-1 min-h-0 w-full resize-none overflow-hidden wrap-break-word whitespace-pre-wrap border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-muted-foreground/60"
      />
    </span>
  )
}

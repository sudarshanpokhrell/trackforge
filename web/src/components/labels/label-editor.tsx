import { ColorPicker } from "@/components/color-picker"
import { LabelIcon } from "@/components/labels/label-chip"
import { Button } from "@/components/ui/button"
import { LABEL_COLORS, type LabelInput } from "@/types/labels"
import { Loader2 } from "lucide-react"
import { useState } from "react"

/** One row for creating or editing a label: color on the left, name, then actions. */
export function LabelEditor({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: LabelInput
  submitLabel: string
  pending: boolean
  onSubmit: (input: LabelInput) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [color, setColor] = useState(initial?.color ?? LABEL_COLORS[0])

  return (
    <form
      className="flex items-center gap-3 px-4 py-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim() && !pending) onSubmit({ name: name.trim(), color })
      }}
    >
      <ColorPicker
        aria-label="Label color"
        value={color}
        onChange={setColor}
        presets={LABEL_COLORS}
      >
        <LabelIcon color={color} className="transition-opacity hover:opacity-80" />
      </ColorPicker>
      <input
        autoFocus
        aria-label="Label name"
        placeholder="Label name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel()
        }}
        className="h-8 min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60"
      />
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" size="sm" disabled={!name.trim() || pending}>
        {pending && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  )
}

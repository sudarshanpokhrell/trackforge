import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { useState } from "react"
import { HexColorPicker } from "react-colorful"

const HEX = /^#[0-9a-f]{6}$/i

/** Dark or light ink, whichever reads better on the given 6-digit hex. */
function inkFor(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#000000" : "#ffffff"
}

type ColorPickerProps = {
  /** A 6-digit hex like "#e11d48". */
  value: string
  onChange: (color: string) => void
  presets: readonly string[]
  "aria-label": string
  /**
   * Follows the base-ui `render` convention used across the app: pass a bare
   * element for the styling and its content as children.
   */
  trigger?: React.ReactElement
  children: React.ReactNode
}

/** A color area and hue slider, a hex field, and preset swatches. */
export function ColorPicker({
  value,
  onChange,
  presets,
  trigger,
  children,
  ...props
}: ColorPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...props}
        render={trigger ?? <button type="button" className="cursor-pointer rounded-md" />}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 gap-3 p-3">
        <HexColorPicker
          color={value}
          onChange={onChange}
          // react-colorful injects its own styles at runtime, hence the `!`s.
          className={cn(
            "h-36! w-full! gap-3",
            "[&_.react-colorful\\_\\_saturation]:rounded-lg! [&_.react-colorful\\_\\_saturation]:border-b-0!",
            "[&_.react-colorful\\_\\_hue]:h-2.5! [&_.react-colorful\\_\\_hue]:rounded-full!",
            "[&_.react-colorful\\_\\_pointer]:size-4! [&_.react-colorful\\_\\_pointer]:border-2! [&_.react-colorful\\_\\_pointer]:shadow-md!"
          )}
        />

        <HexField value={value} onChange={onChange} />

        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <span className="text-xs font-medium text-muted-foreground">Presets</span>
          <div role="radiogroup" aria-label="Preset colors" className="grid grid-cols-10 gap-1">
            {presets.map((color) => {
              const selected = color.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={color}
                  onClick={() => {
                    onChange(color)
                    setOpen(false)
                  }}
                  className="flex aspect-square cursor-pointer items-center justify-center rounded-full ring-foreground/15 transition-transform hover:scale-115 hover:ring-1"
                  style={{ backgroundColor: color }}
                >
                  {selected && <Check className="size-3" style={{ color: inkFor(color) }} />}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function HexField({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  // What's typed may be half a hex; only a complete one is passed on.
  const [draft, setDraft] = useState(value)
  const [prevValue, setPrevValue] = useState(value)

  if (value !== prevValue) {
    setPrevValue(value)
    setDraft(value)
  }

  const valid = HEX.test(draft)

  return (
    <div
      className={cn(
        "flex h-8 items-center gap-2 rounded-lg border border-border bg-card pr-2.5 pl-1 transition-colors focus-within:border-hairline-strong",
        !valid && "border-destructive/60 focus-within:border-destructive"
      )}
    >
      <span
        aria-hidden
        className="size-6 shrink-0 rounded-md ring-1 ring-foreground/10 ring-inset"
        style={{ backgroundColor: value }}
      />
      <span className="font-mono text-xs text-muted-foreground">#</span>
      <input
        aria-label="Hex color"
        aria-invalid={!valid}
        maxLength={6}
        spellCheck={false}
        autoComplete="off"
        value={draft.replace(/^#/, "")}
        onChange={(e) => {
          const next = `#${e.target.value.replace(/[^0-9a-f]/gi, "").toLowerCase()}`
          setDraft(next)
          if (HEX.test(next)) onChange(next)
        }}
        className="min-w-0 flex-1 bg-transparent font-mono text-xs tracking-wide uppercase outline-none"
      />
    </div>
  )
}

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  EmojiPicker as Picker,
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
} from "frimousse"
import { Loader2, Search } from "lucide-react"
import { useState } from "react"

type EmojiPickerProps = {
  /** The current emoji, if any. When set, the picker offers to remove it. */
  value?: string
  /** Called with the chosen emoji, or "" when it is removed. */
  onChange: (emoji: string) => void
  "aria-label": string
  /**
   * Follows the base-ui `render` convention used across the app: pass a bare
   * element for the styling and its content as children.
   */
  trigger?: React.ReactElement
  children: React.ReactNode
  align?: "start" | "center" | "end"
}

export function EmojiPicker({
  value,
  onChange,
  trigger,
  children,
  align = "start",
  ...props
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false)

  const pick = (emoji: string) => {
    setOpen(false)
    if (emoji !== value) onChange(emoji)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} {...props}>
        {children}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto gap-0 p-0">
        <Picker.Root
          columns={9}
          onEmojiSelect={({ emoji }) => pick(emoji)}
          className="isolate flex h-[360px] w-fit flex-col"
        >
          <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Picker.Search
              autoFocus
              placeholder="Search emoji…"
              className="h-6 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {value && (
              <button
                type="button"
                onClick={() => pick("")}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Remove
              </button>
            )}
          </div>

          <Picker.Viewport className="relative flex-1 outline-hidden">
            <Picker.Loading className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </Picker.Loading>
            <Picker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No emoji found.
            </Picker.Empty>
            <Picker.List
              className="pb-1.5 select-none"
              components={{ CategoryHeader, Row, Emoji }}
            />
          </Picker.Viewport>

          <div className="flex h-10 items-center gap-2 border-t border-border px-2.5">
            <Picker.ActiveEmoji>
              {({ emoji }) =>
                emoji ? (
                  <>
                    <span className="text-lg leading-none">{emoji.emoji}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {emoji.label}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Pick an emoji…
                  </span>
                )
              }
            </Picker.ActiveEmoji>
            <Picker.SkinToneSelector
              aria-label="Change skin tone"
              className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-base transition-colors hover:bg-muted"
            />
          </div>
        </Picker.Root>
      </PopoverContent>
    </Popover>
  )
}

// Declared once at module level: inline components would remount every row on
// each render of the list.
function CategoryHeader({ category, className, ...props }: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      className={cn(
        "bg-popover px-3 pt-3 pb-1.5 text-xs font-medium text-muted-foreground",
        className
      )}
      {...props}
    >
      {category.label}
    </div>
  )
}

function Row({ className, ...props }: EmojiPickerListRowProps) {
  return <div className={cn("scroll-my-1.5 px-1.5", className)} {...props} />
}

function Emoji({ emoji, className, ...props }: EmojiPickerListEmojiProps) {
  return (
    <button
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-xl leading-none data-active:bg-muted",
        className
      )}
      {...props}
    >
      {emoji.emoji}
    </button>
  )
}

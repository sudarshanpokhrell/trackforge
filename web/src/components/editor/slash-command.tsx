import { Extension, ReactRenderer, type Editor, type Range } from "@tiptap/react"
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion"
import {
  CodeXml,
  Heading1,
  Heading2,
  Heading3,
  Lightbulb,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  type LucideIcon,
} from "lucide-react"
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type CommandItem = {
  title: string
  icon: LucideIcon
  keywords: string[]
  /** Items with different groups are separated by a divider. */
  group: number
  run: (editor: Editor, range: Range) => void
}

const ITEMS: CommandItem[] = [
  {
    title: "Heading 1",
    icon: Heading1,
    keywords: ["h1", "title"],
    group: 0,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    icon: Heading2,
    keywords: ["h2", "subtitle"],
    group: 0,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    icon: Heading3,
    keywords: ["h3"],
    group: 0,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Bulleted list",
    icon: List,
    keywords: ["unordered", "ul", "bullet"],
    group: 1,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    icon: ListOrdered,
    keywords: ["ordered", "ol"],
    group: 1,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Checklist",
    icon: ListChecks,
    keywords: ["todo", "task", "checkbox"],
    group: 1,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Code block",
    icon: CodeXml,
    keywords: ["code", "snippet", "pre"],
    group: 2,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Blockquote",
    icon: Quote,
    keywords: ["quote"],
    group: 2,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Callout",
    icon: Lightbulb,
    keywords: ["note", "info", "tip"],
    group: 2,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setCallout().run(),
  },
]

function filterItems(query: string) {
  const q = query.toLowerCase()
  return ITEMS.filter(
    (item) => item.title.toLowerCase().includes(q) || item.keywords.some((k) => k.startsWith(q))
  )
}

/** Typing "/" opens a menu of blocks to insert, filtered by what follows. */
export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<CommandItem, CommandItem>({
        editor: this.editor,
        char: "/",
        items: ({ query }) => filterItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let component: ReactRenderer<SlashMenuHandle, SuggestionProps<CommandItem, CommandItem>> | null = null
          let unmount: (() => void) | undefined

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenu, { props, editor: props.editor })
              // Inside a dialog or sheet, a menu in document.body counts as an
              // outside click and would close it, so mount within it instead.
              const host =
                props.editor.view.dom.closest('[data-slot="dialog-content"], [data-slot="sheet-content"]') ??
                document.body
              host.appendChild(component.element)
              unmount = props.mount(component.element as HTMLElement)
            },
            onUpdate: (props) => component?.updateProps(props),
            onKeyDown: (props) => {
              if (props.event.key === "Escape") return false
              return component?.ref?.onKeyDown(props) ?? false
            },
            onExit: () => {
              unmount?.()
              component?.element.remove()
              component?.destroy()
              component = null
            },
          }
        },
      }),
    ]
  },
})

type SlashMenuHandle = { onKeyDown: (props: SuggestionKeyDownProps) => boolean }

const SlashMenu = forwardRef<SlashMenuHandle, SuggestionProps<CommandItem, CommandItem>>(
  function SlashMenu({ items, command }, ref) {
    const [active, setActive] = useState(0)
    const listRef = useRef<HTMLDivElement>(null)

    // A new query means a new list; start again from its first item.
    const [prevItems, setPrevItems] = useState(items)
    if (items !== prevItems) {
      setPrevItems(items)
      setActive(0)
    }

    useEffect(() => {
      listRef.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" })
    }, [active])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) return false
        if (event.key === "ArrowDown") {
          setActive((i) => (i + 1) % items.length)
          return true
        }
        if (event.key === "ArrowUp") {
          setActive((i) => (i - 1 + items.length) % items.length)
          return true
        }
        if (event.key === "Enter") {
          command(items[active])
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="z-50 w-64 rounded-xl border border-border bg-popover px-3 py-2.5 text-sm text-muted-foreground shadow-lg">
          No matching blocks
        </div>
      )
    }

    return (
      <div
        ref={listRef}
        role="listbox"
        aria-label="Insert block"
        className="z-50 max-h-96 w-64 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      >
        {items.map((item, index) => {
          const Icon = item.icon
          const divider = index > 0 && items[index - 1].group !== item.group
          return (
            <div key={item.title}>
              {divider && <div className="-mx-1 my-1 border-t border-border" />}
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                data-index={index}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => command(item)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm",
                  index === active && "bg-foreground/8"
                )}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{item.title}</span>
              </button>
            </div>
          )
        })}
      </div>
    )
  }
)

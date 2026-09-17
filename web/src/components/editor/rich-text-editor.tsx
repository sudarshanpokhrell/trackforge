import { TaskItem, TaskList } from "@tiptap/extension-list"
import { Placeholder } from "@tiptap/extensions"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useRef } from "react"
import { cn } from "@/lib/utils"
import { Callout } from "./callout"
import { SlashCommand } from "./slash-command"

type RichTextEditorProps = {
  /** HTML. Read once when the editor mounts; remount (e.g. with `key`) to replace it. */
  value: string
  onChange?: (html: string) => void
  /**
   * Called with the new HTML when an edit is finished: on blur, or straight away
   * for changes made without focus (like ticking a checklist box). Only fires
   * when the content differs from what was last committed.
   */
  onCommit?: (html: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  "aria-label"?: string
}

/**
 * Rich text with no toolbar. Typing "/" opens a menu of blocks (headings,
 * lists, checklist, code, quote, callout); the value is HTML.
 */
export function RichTextEditor({
  value,
  onChange,
  onCommit,
  placeholder,
  autoFocus = false,
  className,
  "aria-label": ariaLabel,
}: RichTextEditorProps) {
  // The editor normalizes what it's given (plain text becomes <p>…</p>), so the
  // baseline is its own first output, not the raw value.
  const committed = useRef<string | null>(null)

  const commit = (editor: Editor) => {
    const html = htmlOf(editor)
    if (html === committed.current) return
    committed.current = html
    onCommit?.(html)
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Callout,
      SlashCommand,
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "paragraph" ? (placeholder ?? "") : "",
      }),
    ],
    content: value,
    autofocus: autoFocus ? "end" : false,
    // Only onChange needs each keystroke; re-rendering the React tree on every
    // transaction would be wasted work.
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: "tiptap-content min-h-full outline-none",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
    },
    onCreate: ({ editor }) => {
      committed.current = htmlOf(editor)
    },
    onUpdate: ({ editor }) => {
      onChange?.(htmlOf(editor))
      if (!editor.isFocused) commit(editor)
    },
    onBlur: ({ editor }) => commit(editor),
  })

  return (
    <EditorContent
      editor={editor}
      className={cn("cursor-text", className)}
      // Clicking the padding around the text should still put the caret in it.
      onClick={(e) => {
        if (editor && e.target === e.currentTarget) editor.commands.focus("end")
      }}
    />
  )
}

function htmlOf(editor: Editor) {
  return editor.isEmpty ? "" : editor.getHTML()
}

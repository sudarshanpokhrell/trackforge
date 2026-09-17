import { Node, mergeAttributes } from "@tiptap/react"
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import { Lightbulb } from "lucide-react"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wraps the current block in a callout. */
      setCallout: () => ReturnType
    }
  }
}

/** A highlighted note: a lightbulb beside any blocks. */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0]
  },

  addCommands() {
    return {
      setCallout:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView)
  },
})

function CalloutView() {
  return (
    <NodeViewWrapper data-type="callout" className="editor-callout">
      <span contentEditable={false} className="editor-callout-icon">
        <Lightbulb aria-hidden className="size-full" />
      </span>
      <NodeViewContent className="editor-callout-body" />
    </NodeViewWrapper>
  )
}

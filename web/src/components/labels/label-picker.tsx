import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { projectLabelsQuery, useCreateLabel } from '@/hooks/use-labels'
import { projectQuery } from '@/hooks/use-projects'
import { getErrorMessage } from '@/lib/api'
import type { LabelSummary } from '@/types/issues'
import type { LabelInput } from '@/types/labels'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { LabelDot } from './label-chip'
import { LabelEditor } from './label-editor'

interface LabelPickerProps {
  projectId: number
  selected: number[]
  onToggle: (label: LabelSummary, checked: boolean) => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

export function LabelPicker({
  projectId,
  selected,
  onToggle,
  disabled,
  className,
  children,
}: LabelPickerProps) {
  const { data: labels = [], isPending } = useQuery(projectLabelsQuery(projectId))
  // Only project admins may create labels; the server enforces it too.
  const { data: project } = useQuery(projectQuery(projectId))
  const canManage = project?.my_access.can_manage ?? false
  const [creating, setCreating] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          disabled={disabled}
          className={className}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Labels</DropdownMenuLabel>
            {labels.map((label) => (
              <DropdownMenuCheckboxItem
                key={label.id}
                checked={selected.includes(label.id)}
                onCheckedChange={(checked) => onToggle(label, checked)}
                className="gap-2.5"
              >
                <LabelDot color={label.color} />
                <span className="truncate">{label.name}</span>
              </DropdownMenuCheckboxItem>
            ))}
            {!isPending && labels.length === 0 && (
              <p className="px-1.5 py-1 text-sm text-muted-foreground">
                {canManage ? 'No labels yet.' : 'No labels yet. Project admins add them on the project page.'}
              </p>
            )}
          </DropdownMenuGroup>
          {canManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setCreating(true)
                }}
              >
                <Plus />
                New label
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canManage && (
        <CreateLabelDialog
          projectId={projectId}
          open={creating}
          onOpenChange={setCreating}
          onCreated={(label) => onToggle(label, true)}
        />
      )}
    </>
  )
}

/** Creates a label and hands it back so the picker can apply it straight away. */
function CreateLabelDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: {
  projectId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (label: LabelSummary) => void
}) {
  const createLabel = useCreateLabel(projectId)

  const onSubmit = async (input: LabelInput) => {
    try {
      const { label } = await createLabel.mutateAsync(input)
      onCreated(label)
      onOpenChange(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    // The dialog is portalled, but React still bubbles its events to the picker's
    // parents: an issue card link, or the New issue form it would submit.
    <span
      className="contents"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onSubmit={(e) => e.stopPropagation()}
    >
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-md">
          <DialogTitle className="px-5 pt-4 text-sm font-normal text-muted-foreground">
            New label
          </DialogTitle>
          {/* Mounted only while open, so each opening starts blank. */}
          {open && (
            <div className="px-1 py-2">
              <LabelEditor
                submitLabel="Create"
                pending={createLabel.isPending}
                onSubmit={onSubmit}
                onCancel={() => onOpenChange(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </span>
  )
}

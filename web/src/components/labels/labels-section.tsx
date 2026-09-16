import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label as FieldLabel } from '@/components/ui/label'
import {
  projectLabelsQuery,
  useCreateLabel,
  useDeleteLabel,
  useUpdateLabel,
} from '@/hooks/use-labels'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { LABEL_COLORS, type Label } from '@/types/labels'
import { useQuery } from '@tanstack/react-query'
import { Check, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { LabelDot } from './label-chip'

const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * The project's labels. Everyone in the project sees them; only those who can
 * manage the project create, edit and delete them.
 */
export function LabelsSection({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const { data: labels = [], isPending } = useQuery(projectLabelsQuery(projectId))
  // undefined: closed, null: creating, a label: editing it.
  const [editing, setEditing] = useState<Label | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Label | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-sm font-medium text-foreground">
          Labels
          {labels.length > 0 && (
            <span className="ml-1.5 text-muted-foreground">{labels.length}</span>
          )}
        </h2>
        {canManage && (
          <button
            aria-label="New label"
            onClick={() => setEditing(null)}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>

      {!isPending && labels.length === 0 ? (
        <p className="text-[14px] text-muted-foreground">
          No labels yet.
          {canManage && ' Add labels so the team can sort its issues.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {labels.map((label) => (
            <div key={label.id} className="group flex items-center gap-3 text-[14px]">
              <LabelDot color={label.color} className="size-2.5" />
              <span className="flex-1 truncate text-foreground/90">{label.name}</span>
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Manage ${label.name}`}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted/50 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[popup-open]:opacity-100"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(label)}>
                      <Pencil className="size-4" />
                      Edit label
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(label)}>
                      <Trash2 className="size-4" />
                      Delete label
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <LabelDialog
          key={editing?.id ?? 'new'}
          projectId={projectId}
          label={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
      {deleting && (
        <DeleteLabelDialog
          projectId={projectId}
          label={deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

function LabelDialog({
  projectId,
  label,
  onClose,
}: {
  projectId: number
  label: Label | null
  onClose: () => void
}) {
  const [name, setName] = useState(label?.name ?? '')
  const [color, setColor] = useState(label?.color ?? LABEL_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  const createLabel = useCreateLabel(projectId)
  const updateLabel = useUpdateLabel(projectId)
  const isPending = createLabel.isPending || updateLabel.isPending

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const input = { name: name.trim(), color }
    try {
      if (label) {
        await updateLabel.mutateAsync({ labelId: label.id, ...input })
        toast.success('Label updated.')
      } else {
        await createLabel.mutateAsync(input)
        toast.success(`${input.name} created.`)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mt-5 sm:max-w-md">
        <form className="space-y-5" noValidate onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{label ? 'Edit label' : 'New label'}</DialogTitle>
          </DialogHeader>

          <div>
            <FieldLabel htmlFor="label-name">Name</FieldLabel>
            <Input
              id="label-name"
              className="mt-2 h-9"
              maxLength={50}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Color</FieldLabel>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={color.toLowerCase() === c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow',
                    color.toLowerCase() === c && 'ring-2 ring-ring'
                  )}
                  style={{ backgroundColor: c }}
                >
                  {color.toLowerCase() === c && <Check className="size-3.5 text-white" />}
                </button>
              ))}
              <input
                type="color"
                aria-label="Custom color"
                value={HEX.test(color) ? color : LABEL_COLORS[0]}
                onChange={(e) => setColor(e.target.value)}
                className="size-6 cursor-pointer rounded-full border border-border bg-transparent p-0"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !HEX.test(color) || isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {label ? 'Save changes' : 'Create label'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteLabelDialog({
  projectId,
  label,
  onClose,
}: {
  projectId: number
  label: Label
  onClose: () => void
}) {
  const deleteLabel = useDeleteLabel(projectId)

  const onDelete = async () => {
    try {
      const { issue_count } = await deleteLabel.mutateAsync(label.id)
      toast.success(
        issue_count > 0
          ? `${label.name} deleted and removed from ${issue_count} issue${issue_count === 1 ? '' : 's'}.`
          : `${label.name} deleted.`
      )
      onClose()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mt-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {label.name}?</DialogTitle>
        </DialogHeader>
        <p className="py-2 text-sm text-muted-foreground">
          It comes off every issue that has it. Issue history keeps a record of it.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={deleteLabel.isPending}
          >
            {deleteLabel.isPending && <Loader2 className="animate-spin" />}
            Delete label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

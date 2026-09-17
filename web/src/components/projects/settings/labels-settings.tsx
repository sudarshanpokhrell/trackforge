import { DeleteDialog } from "@/components/delete-dialog"
import { LabelIcon } from "@/components/labels/label-chip"
import { LabelEditor } from "@/components/labels/label-editor"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  projectLabelsQuery,
  useCreateLabel,
  useDeleteLabel,
  useUpdateLabel,
} from "@/hooks/use-labels"
import { getErrorMessage } from "@/lib/api"
import type { Label, LabelInput } from "@/types/labels"
import { useQuery } from "@tanstack/react-query"
import { Add01Icon, Delete02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { toast } from "sonner"
import { SettingsHeader } from "./settings-header"

/** `canManage` is the project's my_access.can_manage: only admins may change labels. */
export function LabelsSettings({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const [adding, setAdding] = useState(false)

  return (
    <section className="flex flex-col gap-6">
      <SettingsHeader
        title="Labels"
        description="Labels help you group and filter work items in this project."
        action={
          canManage && (
            <Button size="sm" disabled={adding} onClick={() => setAdding(true)}>
              <HugeiconsIcon icon={Add01Icon} />
              Add label
            </Button>
          )
        }
      />

      <LabelList
        projectId={projectId}
        canManage={canManage}
        adding={adding}
        onAddingDone={() => setAdding(false)}
      />
    </section>
  )
}

function LabelList({
  projectId,
  canManage,
  adding,
  onAddingDone,
}: {
  projectId: number
  canManage: boolean
  adding: boolean
  onAddingDone: () => void
}) {
  const { data: labels, isPending, error } = useQuery(projectLabelsQuery(projectId))
  const createLabel = useCreateLabel(projectId)

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
  }

  if (labels.length === 0 && !adding) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        No labels yet.
      </div>
    )
  }

  const onCreate = async (input: LabelInput) => {
    try {
      await createLabel.mutateAsync(input)
      onAddingDone()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {adding && (
        <li>
          <LabelEditor
            submitLabel="Create"
            pending={createLabel.isPending}
            onSubmit={onCreate}
            onCancel={onAddingDone}
          />
        </li>
      )}
      {labels.map((label) => (
        <LabelRow key={label.id} projectId={projectId} label={label} canManage={canManage} />
      ))}
    </ul>
  )
}

function LabelRow({
  projectId,
  label,
  canManage,
}: {
  projectId: number
  label: Label
  canManage: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const updateLabel = useUpdateLabel(projectId)
  const deleteLabel = useDeleteLabel(projectId)

  const onUpdate = async (input: LabelInput) => {
    if (input.name === label.name && input.color === label.color) return setEditing(false)

    try {
      await updateLabel.mutateAsync({ labelId: label.id, ...input })
      setEditing(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const onDelete = async () => {
    try {
      await deleteLabel.mutateAsync(label.id)
      setConfirmingDelete(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  if (editing) {
    return (
      <li>
        <LabelEditor
          initial={label}
          submitLabel="Save"
          pending={updateLabel.isPending}
          onSubmit={onUpdate}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5 text-sm">
      <LabelIcon color={label.color} />
      <span className="min-w-0 flex-1 truncate text-foreground">{label.name}</span>

      {canManage && (
        // Hidden until the row is hovered or a button has keyboard focus.
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            aria-label={`Edit ${label.name}`}
            title="Edit"
            onClick={() => setEditing(true)}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <HugeiconsIcon icon={PencilEdit02Icon} className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${label.name}`}
            title="Delete"
            onClick={() => setConfirmingDelete(true)}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
          </button>
        </div>
      )}

      <DeleteDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete ${label.name}?`}
        description="It will be removed from every work item that uses it."
        onConfirm={onDelete}
        pending={deleteLabel.isPending}
      />
    </li>
  )
}

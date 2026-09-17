import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Loader2, Plus, Tag, XIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { LabelChip } from '@/components/labels/label-chip'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { LabelPicker } from '@/components/labels/label-picker'
import { projectLabelsQuery } from '@/hooks/use-labels'
import { toast } from 'sonner'
import { useCreateIssue } from '@/hooks/use-issues'
import { PRIORITY_LABELS, STATUS_LABELS } from '@/types/issues'
import type { IssueStatus, IssuePriority } from '@/types/issues'
import { PriorityIcon, StatusIcon } from './icons'
import { PriorityPopover, StatusPopover } from './popovers'

type FormData = {
  title: string
}

const chip =
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 text-xs text-foreground transition-colors hover:bg-muted data-popup-open:bg-muted'

export function NewIssueDialog({
  projectId,
  onSuccess,
  defaultStatus = 'backlog',
  trigger,
  children,
}: {
  projectId: number
  onSuccess?: () => void
  defaultStatus?: IssueStatus
  trigger?: React.ReactElement
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<IssueStatus>(defaultStatus)
  const [priority, setPriority] = useState<IssuePriority>('no-priority')
  const [labelIds, setLabelIds] = useState<number[]>([])
  const [description, setDescription] = useState('')
  const { data: labels = [] } = useQuery({ ...projectLabelsQuery(projectId), enabled: open })
  const { mutateAsync: createIssue, isPending } = useCreateIssue(projectId)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { title: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await createIssue({
        title: data.title,
        description,
        status,
        priority,
        label_ids: labelIds,
      })
      toast.success('Issue created successfully!')
      reset()
      setStatus(defaultStatus)
      setPriority('no-priority')
      setLabelIds([])
      setDescription('')
      setOpen(false)
      onSuccess?.()
    } catch {
      toast.error('Failed to create issue')
    }
  }

  const selectedLabels = labels.filter((l) => labelIds.includes(l.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} className={trigger ? undefined : buttonVariants()}>
        {children ?? (
          <>
            <Plus className="mr-1 size-4" />
            New issue
          </>
        )}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(760px,calc(100dvh-12rem))] flex-col gap-0 p-0 sm:max-w-200"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-5 pt-4">
            <DialogTitle className="text-sm font-normal text-muted-foreground">New issue</DialogTitle>
            <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" />}>
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div className="flex flex-col gap-3 px-6 pt-4">
            <div>
              <input
                autoFocus
                aria-label="Issue title"
                placeholder="Issue title"
                className="w-full bg-transparent text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
                {...register('title', { required: 'Title is required' })}
              />
              {errors.title && (
                <p className="mt-1.5 text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <StatusPopover current={status} onChange={setStatus}>
                <span className={chip}>
                  <StatusIcon status={status} className="size-3.5" />
                  {STATUS_LABELS[status]}
                </span>
              </StatusPopover>

              <PriorityPopover current={priority} onChange={setPriority}>
                <span className={chip}>
                  <PriorityIcon priority={priority} className="size-3.5" />
                  {PRIORITY_LABELS[priority]}
                </span>
              </PriorityPopover>

              <LabelPicker
                projectId={projectId}
                selected={labelIds}
                onToggle={(label, checked) =>
                  setLabelIds((ids) =>
                    checked ? [...ids, label.id] : ids.filter((id) => id !== label.id)
                  )
                }
                className={chip}
              >
                {selectedLabels.length === 0 ? (
                  <>
                    <Tag className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Labels</span>
                  </>
                ) : (
                  selectedLabels.map((l) => (
                    <LabelChip key={l.id} label={l} className="h-5 border-0 px-0" />
                  ))
                )}
              </LabelPicker>
            </div>
          </div>


          <RichTextEditor
            aria-label="Issue description"
            placeholder="Add a description…"
            value={description}
            onChange={setDescription}
            className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-[15px] leading-relaxed text-foreground [&>div]:min-h-full"
          />

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Create issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

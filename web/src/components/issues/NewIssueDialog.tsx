import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateIssue } from '@/hooks/use-issues'
import type { IssueStatus, IssuePriority } from '@/types/issues'

type FormData = {
  title: string
  description: string
  status: IssueStatus
  priority: IssuePriority
}

export function NewIssueDialog({ projectId, onSuccess }: { projectId: number; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const { mutateAsync: createIssue, isPending } = useCreateIssue(projectId)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
    }
  })

  const onSubmit = async (data: FormData) => {
    try {
      await createIssue({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
      })
      toast.success('Issue created successfully!')
      reset()
      setOpen(false)
      onSuccess?.()
    } catch (err) {
      toast.error('Failed to create issue')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants()}
      >
        <Plus className="mr-1 size-4" />
        New issue
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-card-title">Create new issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Issue title"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue…"
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                onValueChange={(value) => setValue('status', value as IssueStatus)}
                defaultValue="todo"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                onValueChange={(value) => setValue('priority', value as IssuePriority)}
                defaultValue="medium"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-priority">No priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>Create issue</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
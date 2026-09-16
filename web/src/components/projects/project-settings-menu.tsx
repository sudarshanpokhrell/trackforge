import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useDeleteProject, useUpdateProject } from "@/hooks/use-projects"
import { getErrorMessage } from "@/lib/api"
import { toDateInput, toDateTime } from "@/lib/dates"
import type { ProjectDetails } from "@/types/projects"
import { useNavigate } from "@tanstack/react-router"
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

type Values = {
  name: string
  description: string
  start_date: string
  target_date: string
}

export function ProjectSettingsMenu({ project }: { project: ProjectDetails }) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const navigate = useNavigate()
  const updateProject = useUpdateProject(project.id)
  const deleteProject = useDeleteProject()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: {
      name: project.name,
      description: project.description,
      start_date: toDateInput(project.start_date),
      target_date: toDateInput(project.target_date),
    },
  })

  const onEditOpenChange = (next: boolean) => {
    setEditing(next)
    if (next) {
      reset({
        name: project.name,
        description: project.description,
        start_date: toDateInput(project.start_date),
        target_date: toDateInput(project.target_date),
      })
    }
  }

  const onSubmit = async (values: Values) => {
    try {
      await updateProject.mutateAsync({
        name: values.name.trim(),
        description: values.description.trim(),
        start_date: toDateTime(values.start_date),
        target_date: toDateTime(values.target_date),
      })
      toast.success("Project updated.")
      setEditing(false)
    } catch (e) {
      setError("root", { message: getErrorMessage(e) })
    }
  }

  const onDelete = async () => {
    try {
      await deleteProject.mutateAsync(project.id)
      toast.success(`${project.name} deleted.`)
      await navigate({ to: "/", replace: true })
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label="Project settings" />}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEditOpenChange(true)}>
            <Pencil className="size-4" />
            Edit project
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editing} onOpenChange={onEditOpenChange}>
        <DialogContent className="mt-5 sm:max-w-md">
          <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit project</DialogTitle>
            </DialogHeader>

            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                className="mt-2 h-9"
                {...register("name", { required: "Name is required." })}
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                className="mt-2 min-h-20"
                {...register("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-start">Start date</Label>
                <Input
                  id="edit-start"
                  type="date"
                  className="mt-2 h-9"
                  {...register("start_date")}
                />
              </div>
              <div>
                <Label htmlFor="edit-target">Target date</Label>
                <Input
                  id="edit-target"
                  type="date"
                  className="mt-2 h-9"
                  {...register("target_date", {
                    validate: (v) =>
                      !v ||
                      !watch("start_date") ||
                      v >= watch("start_date") ||
                      "Target must not be before the start date.",
                  })}
                />
                {errors.target_date && (
                  <p className="mt-1.5 text-sm text-destructive">
                    {errors.target_date.message}
                  </p>
                )}
              </div>
            </div>

            {errors.root && (
              <p className="text-sm text-destructive" role="alert">
                {errors.root.message}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="mt-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {project.name}?</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            Its issues, comments and activity go with it. This cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending && <Loader2 className="animate-spin" />}
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

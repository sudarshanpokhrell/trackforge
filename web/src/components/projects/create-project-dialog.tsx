import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateProject } from "@/hooks/use-projects"
import { getErrorMessage } from "@/lib/api"
import { toDateTime } from "@/lib/dates"
import { Loader2, Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

type Values = {
  name: string
  description: string
  start_date: string
  target_date: string
}

/**
 * `trigger` follows the base-ui `render` convention used across the app: pass a
 * bare element for the styling and the label as children.
 */
export function CreateProjectDialog({
  trigger,
  children,
}: {
  trigger?: React.ReactElement
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const createProject = useCreateProject()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: { name: "", description: "", start_date: "", target_date: "" },
  })

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const onSubmit = async (values: Values) => {
    try {
      const { project } = await createProject.mutateAsync({
        name: values.name.trim(),
        description: values.description.trim(),
        start_date: toDateTime(values.start_date),
        target_date: toDateTime(values.target_date),
      })
      toast.success(`${project.name} created.`)
      onOpenChange(false)
    } catch (e) {
      setError("root", { message: getErrorMessage(e) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger ?? <Button />}>
        {children ?? (
          <>
            <Plus />
            New project
          </>
        )}
      </DialogTrigger>
      <DialogContent className="mt-5 sm:max-w-md">
        <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              className="mt-2 h-9"
              placeholder="Apollo"
              {...register("name", { required: "Name is required." })}
            />
            {errors.name && (
              <p className="mt-1.5 text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              className="mt-2 min-h-20"
              placeholder="What is this project for?"
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start_date">Start date</Label>
              <Input
                id="start_date"
                type="date"
                className="mt-2 h-9"
                {...register("start_date")}
              />
            </div>
            <div>
              <Label htmlFor="target_date">Target date</Label>
              <Input
                id="target_date"
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

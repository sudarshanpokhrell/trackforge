import { DeleteDialog } from "@/components/delete-dialog"
import { Button } from "@/components/ui/button"
import { useDeleteProject } from "@/hooks/use-projects"
import { getErrorMessage } from "@/lib/api"
import type { ProjectDetails } from "@/types/projects"
import { useNavigate } from "@tanstack/react-router"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function DeleteProjectSection({ project }: { project: ProjectDetails }) {
  const [confirming, setConfirming] = useState(false)
  const deleteProject = useDeleteProject()
  const navigate = useNavigate()

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
    <section className="flex items-center justify-between gap-4 rounded-xl border border-destructive/30 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-foreground">Delete project</h2>
        <p className="text-sm text-muted-foreground">
          Its issues, comments and labels are deleted with it. This cannot be undone.
        </p>
      </div>
      <Button
        type="button"
        variant="destructive"
        className="shrink-0"
        onClick={() => setConfirming(true)}
      >
        <Trash2 />
        Delete
      </Button>

      <DeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${project.name}?`}
        description="Its issues, comments and labels go with it. This cannot be undone."
        confirmText={project.name}
        onConfirm={onDelete}
        pending={deleteProject.isPending}
      />
    </section>
  )
}

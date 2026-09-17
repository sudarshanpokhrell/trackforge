import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useSetCyclesEnabled } from "@/hooks/use-cycles"
import { getErrorMessage } from "@/lib/api"
import type { ProjectDetails } from "@/types/projects"
import { Link } from "@tanstack/react-router"
import { toast } from "sonner"
import { SettingsHeader } from "./settings-header"

/** Turning sprints on or off is a project admin's call; everyone else sees the state. */
export function SprintsSettings({ project }: { project: ProjectDetails }) {
  const setEnabled = useSetCyclesEnabled(project.id)
  const canManage = project.my_access.can_manage
  const enabled = project.cycles_enabled

  const onChange = (next: boolean) =>
    setEnabled.mutate(next, {
      onSuccess: () => toast.success(next ? "Sprints turned on." : "Sprints turned off."),
      // Turning off fails while a sprint is still open; the server says so.
      onError: (e) => toast.error(getErrorMessage(e)),
    })

  return (
    <section className="flex flex-col gap-6">
      <SettingsHeader
        title="Sprints"
        description="Plan and track work in time-boxed iterations."
      />

      <div className="flex items-center justify-between gap-6 rounded-xl border border-border px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <label htmlFor="sprints-enabled" className="text-sm font-medium text-foreground">
            Use sprints in this project
          </label>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Anyone in the project can then create, complete and plan issues into sprints. To turn them off, complete or delete open sprints first."
              : enabled
                ? "Sprints are on. Only a project admin can turn them off."
                : "Sprints are off. Only a project admin can turn them on."}
          </p>
        </div>
        <Switch
          id="sprints-enabled"
          checked={enabled}
          disabled={!canManage || setEnabled.isPending}
          onCheckedChange={onChange}
        />
      </div>

      {enabled && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          nativeButton={false}
          render={<Link to="/projects/$projectId/sprints" params={{ projectId: String(project.id) }} />}
        >
          Go to sprints
        </Button>
      )}
    </section>
  )
}

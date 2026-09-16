import { SettingsHeader } from "./settings-header"

/** Placeholder until sprints exist. */
export function SprintsSettings() {
  return (
    <section className="flex flex-col gap-6">
      <SettingsHeader
        title="Sprints"
        description="Plan and track work in time-boxed iterations."
      />

      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No sprints yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sprints will show up here once they're available.
        </p>
      </div>
    </section>
  )
}

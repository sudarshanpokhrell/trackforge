import { FolderX } from "lucide-react"

export function ProjectNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex size-10 items-center justify-center rounded-md border bg-muted/50">
          <FolderX className="size-5 text-muted-foreground" />
        </div>

        <h1 className="text-base font-medium">Project not found</h1>

        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          This project may have been deleted or you may not have access to it.
        </p>
      </div>
    </div>
  )
}
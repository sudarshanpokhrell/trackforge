import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import { type QueryClient } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from 'sonner'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ThemeProvider storageKey="trackforge-theme">
      <SidebarProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary w-full">
          <Toaster position="top-right" richColors closeButton />
          <Outlet/>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  )
}
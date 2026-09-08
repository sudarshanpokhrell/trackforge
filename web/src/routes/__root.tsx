import { Outlet, createRootRoute } from "@tanstack/react-router"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from 'sonner'

export const Route = createRootRoute({
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
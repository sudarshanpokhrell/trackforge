import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import { type QueryClient } from "@tanstack/react-query"
import { ThemeProvider, useTheme } from "@/components/theme-provider"
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
    <ThemeProvider defaultTheme="dark" storageKey="trackforge-theme">
      <SidebarProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground antialiased w-full">
          <ThemedToaster />
          <Outlet/>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  )
}

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster position="top-right" theme={theme} closeButton />
}

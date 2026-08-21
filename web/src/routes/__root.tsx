import { Outlet, createRootRoute } from "@tanstack/react-router"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/layout/Sidebar"
import { Toaster } from 'sonner'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ThemeProvider storageKey="trackforge-theme">
      <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <Toaster position="top-right" richColors closeButton />
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
        <footer className="border-t border-border/50 py-4 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Trackforge</p>
        </footer>
      </div>
    </ThemeProvider>
  )
}
import { Outlet, createRootRoute } from "@tanstack/react-router"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ThemeProvider storageKey="trackforge-theme">
      <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
          <div className="mx-auto max-w-6xl px-4 flex items-center justify-center">
            <p>© {new Date().getFullYear()} Trackforge</p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  )
}

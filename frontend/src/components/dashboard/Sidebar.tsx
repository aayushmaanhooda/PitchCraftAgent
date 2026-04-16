import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { Plus, FolderOpen, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NewProjectDialog } from "@/components/dashboard/NewProjectDialog"
import { useProjects } from "@/context/ProjectContext"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const { projects } = useProjects()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate("/")
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-card/50">
      {/* New project button */}
      <div className="p-4">
        <Button
          className="w-full justify-start gap-2"
          variant="outline"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      {/* Projects list */}
      <div className="flex flex-1 min-h-0 flex-col overflow-y-auto px-3">
        <h2 className="px-2 pb-2 text-[11px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
          Your Projects
        </h2>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground/50">
              No projects yet
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {projects.map((p) => (
              <li key={p.id}>
                <NavLink
                  to={`/dashboard/projects/${p.id}`}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 truncate rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    )
                  }
                >
                  <span className="truncate">{p.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* User info & logout at bottom */}
      <div className="border-t border-border/40 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold uppercase">
            {user?.username?.charAt(0) ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user?.username}</p>
            <p className="truncate text-[11px] text-muted-foreground/60">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <NewProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </aside>
  )
}

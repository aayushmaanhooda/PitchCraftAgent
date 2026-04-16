import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

export type Project = {
  id: string
  name: string
  createdAt: number
}

type ProjectContextValue = {
  projects: Project[]
  getProject: (id: string) => Project | undefined
  createProject: (name: string) => Project
  deleteProject: (id: string) => void
}

// TODO: swap localStorage for backend fetch once /projects API exists.
const STORAGE_KEY = "pitchcraft.projects"

const ProjectContext = createContext<ProjectContextValue | null>(null)

function readFromStorage(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => readFromStorage())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  const getProject = (id: string) => projects.find((p) => p.id === id)

  const createProject = (name: string): Project => {
    const project: Project = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: Date.now(),
    }
    setProjects((prev) => [project, ...prev])
    return project
  }

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id))
  }

  return (
    <ProjectContext.Provider
      value={{ projects, getProject, createProject, deleteProject }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjects() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error("useProjects must be used within ProjectProvider")
  return ctx
}

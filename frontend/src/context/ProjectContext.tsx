import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { AxiosError } from "axios"

import { customerApi, type Customer } from "@/api/customer"
import { useAuth } from "@/context/AuthContext"

type ProjectContextValue = {
  projects: Customer[]
  loading: boolean
  error: string | null
  getProject: (id: number) => Customer | undefined
  refreshProject: (id: number) => Promise<Customer | null>
  createProject: (name: string) => Promise<Customer>
  deleteProject: (id: number) => Promise<void>
  updateLocal: (customer: Customer) => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setProjects([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    customerApi
      .list()
      .then((res) => {
        if (!cancelled) setProjects(res.data)
      })
      .catch((e: AxiosError) => {
        if (!cancelled)
          setError(e.response?.statusText ?? "Failed to load customers")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const getProject = (id: number) => projects.find((p) => p.id === id)

  const refreshProject = useCallback(async (id: number) => {
    try {
      const res = await customerApi.get(id)
      setProjects((prev) => {
        const idx = prev.findIndex((p) => p.id === id)
        if (idx === -1) return [res.data, ...prev]
        const next = prev.slice()
        next[idx] = res.data
        return next
      })
      return res.data
    } catch {
      return null
    }
  }, [])

  const createProject = async (name: string): Promise<Customer> => {
    const res = await customerApi.create(name.trim())
    setProjects((prev) => [res.data, ...prev])
    return res.data
  }

  const deleteProject = async (id: number): Promise<void> => {
    await customerApi.remove(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  const updateLocal = (customer: Customer) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === customer.id ? customer : p)),
    )
  }

  return (
    <ProjectContext.Provider
      value={{
        projects,
        loading,
        error,
        getProject,
        refreshProject,
        createProject,
        deleteProject,
        updateLocal,
      }}
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

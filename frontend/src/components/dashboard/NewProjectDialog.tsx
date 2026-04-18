import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProjects } from "@/context/ProjectContext"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewProjectDialog({ open, onOpenChange }: Props) {
  const { createProject } = useProjects()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName("")
      setErr(null)
    }
    onOpenChange(next)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmitting(true)
    setErr(null)
    try {
      const project = await createProject(trimmed)
      setName("")
      onOpenChange(false)
      navigate(`/dashboard/projects/${project.id}`)
    } catch {
      setErr("Failed to create customer. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Give your project a name to get started. You can change it later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              autoFocus
              placeholder="e.g. Acme ERP Pitch"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {err && (
            <div className="text-xs text-red-400">{err}</div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

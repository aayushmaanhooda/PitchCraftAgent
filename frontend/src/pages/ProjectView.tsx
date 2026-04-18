import { useCallback, useEffect, useState, type CSSProperties } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { Icon } from "@/components/dashboard/Icon"
import { RfpInput, type RfpMeta } from "@/components/dashboard/RfpInput"
import { BuildChoice, type BuildChoiceValue } from "@/components/dashboard/BuildChoice"
import { OutputStage, type ArtifactKind } from "@/components/dashboard/OutputStage"
import { PreviewModal } from "@/components/dashboard/PreviewModal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useProjects } from "@/context/ProjectContext"
import { agentApi, type DesignName, type QuestionnairePreview } from "@/api/agent"
import { customerApi } from "@/api/customer"

type Phase = "input" | "choice" | "output"

export default function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { getProject, refreshProject, deleteProject, loading } = useProjects()
  const numericId = projectId ? Number(projectId) : NaN
  const project =
    Number.isFinite(numericId) ? getProject(numericId) : undefined
  const [fetchedOnce, setFetchedOnce] = useState(false)

  useEffect(() => {
    if (Number.isFinite(numericId) && !project) {
      refreshProject(numericId).finally(() => setFetchedOnce(true))
    } else if (project) {
      setFetchedOnce(true)
    }
  }, [numericId, project, refreshProject])

  const [phase, setPhase] = useState<Phase>("input")
  const [rfpMeta, setRfpMeta] = useState<RfpMeta | null>(null)
  const [choice, setChoice] = useState<BuildChoiceValue>("both")
  const [previewType, setPreviewType] = useState<ArtifactKind | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [excelDownloadUrl, setExcelDownloadUrl] = useState<string | null>(null)
  const [excelFileName, setExcelFileName] = useState<string | null>(null)
  const [excelPreview, setExcelPreview] = useState<QuestionnairePreview | null>(null)
  const [excelError, setExcelError] = useState<string | null>(null)
  const [excelReady, setExcelReady] = useState(false)

  const [pptDownloadUrl, setPptDownloadUrl] = useState<string | null>(null)
  const [pptDeckTitle, setPptDeckTitle] = useState<string | null>(null)
  const [pptSlideCount, setPptSlideCount] = useState<number | null>(null)
  const [pptError, setPptError] = useState<string | null>(null)
  const [pptReady, setPptReady] = useState(false)
  const [pptDesign, setPptDesign] = useState<DesignName>("corporate_blue")

  // Reset state when project changes
  useEffect(() => {
    setPhase("input")
    setRfpMeta(null)
    setChoice("both")
    setPreviewType(null)
    setExcelDownloadUrl(null)
    setExcelFileName(null)
    setExcelPreview(null)
    setExcelError(null)
    setExcelReady(false)
    setPptDownloadUrl(null)
    setPptDeckTitle(null)
    setPptSlideCount(null)
    setPptError(null)
    setPptReady(false)
  }, [projectId])

  // Rehydrate download URLs + output stage when the project already has
  // generated artifacts stored in S3 (e.g. after logout/login).
  useEffect(() => {
    if (!project) return
    const hasExcel = Boolean(project.excel_s3_key)
    const hasPpt = Boolean(project.ppt_s3_key)
    if (!hasExcel && !hasPpt) return

    let cancelled = false

    const prior: BuildChoiceValue =
      hasExcel && hasPpt ? "both" : hasExcel ? "excel" : "ppt"
    setChoice(prior)
    setPhase("output")

    const jobs: Promise<unknown>[] = []
    if (hasExcel) {
      jobs.push(
        customerApi
          .excelUrl(project.id)
          .then((res) => {
            if (cancelled) return
            setExcelDownloadUrl(res.data.url)
            setExcelFileName(
              `${project.customer_name.replace(/\s+/g, "_")}_Response.xlsx`,
            )
            setExcelReady(true)
          })
          .catch(() => {
            if (cancelled) return
            setExcelError("Could not load previous Excel from storage.")
            setExcelReady(true)
          }),
      )
    } else {
      setExcelReady(true)
    }

    if (hasPpt) {
      jobs.push(
        customerApi
          .pptUrl(project.id)
          .then((res) => {
            if (cancelled) return
            setPptDownloadUrl(res.data.url)
            setPptReady(true)
          })
          .catch(() => {
            if (cancelled) return
            setPptError("Could not load previous PPT from storage.")
            setPptReady(true)
          }),
      )
    } else {
      setPptReady(true)
    }

    Promise.all(jobs)
    return () => {
      cancelled = true
    }
  }, [project])

  const startGeneration = useCallback(
    async (selected: BuildChoiceValue, meta: RfpMeta, design: DesignName) => {
      if (!project) return

      const needsExcel = selected === "excel" || selected === "both"
      const needsPpt = selected === "ppt" || selected === "both"

      const rfpText = meta.mode === "paste" ? meta.text : ""
      const missingText = !rfpText
      if (missingText) {
        if (needsExcel) {
          setExcelError(
            "Generation needs pasted RFP text for now. File upload support coming soon.",
          )
          setExcelReady(true)
        }
        if (needsPpt) {
          setPptError(
            "Generation needs pasted RFP text for now. File upload support coming soon.",
          )
          setPptReady(true)
        }
        return
      }

      const jobs: Promise<unknown>[] = []

      if (needsExcel) {
        jobs.push(
          agentApi
            .generateExcel(project.id, rfpText)
            .then((res) => {
              setExcelDownloadUrl(res.data.excel_url)
              setExcelFileName(
                `${project.customer_name.replace(/\s+/g, "_")}_Response.xlsx`,
              )
              setExcelPreview(res.data.preview)
            })
            .catch(() => {
              setExcelError("Failed to generate Excel. Please try regenerating.")
            })
            .finally(() => setExcelReady(true)),
        )
      } else {
        setExcelReady(true)
      }

      if (needsPpt) {
        jobs.push(
          agentApi
            .generatePPT(project.id, rfpText, design)
            .then((res) => {
              setPptDownloadUrl(res.data.ppt_url)
              setPptDeckTitle(res.data.deck_title)
              setPptSlideCount(res.data.slide_count)
            })
            .catch(() => {
              setPptError("Failed to generate PPT. Please try regenerating.")
            })
            .finally(() => setPptReady(true)),
        )
      } else {
        setPptReady(true)
      }

      await Promise.all(jobs)
    },
    [project],
  )

  if (!project) {
    if (loading || !fetchedOnce) {
      return (
        <div style={{ padding: "40px 28px", color: "var(--pc-text-3)", fontSize: 13 }}>
          Loading customer…
        </div>
      )
    }
    return (
      <div style={{ padding: "40px 28px", color: "var(--pc-text)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Customer not found</h1>
        <p style={{ marginTop: 8, color: "var(--pc-text-2)", fontSize: 13 }}>
          This customer doesn't exist or belongs to another account.
        </p>
        <Button asChild className="mt-4">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  const phaseIdx = phase === "input" ? 0 : phase === "choice" ? 1 : 2

  const handleDelete = async () => {
    await deleteProject(project.id)
    setDeleteDialogOpen(false)
    navigate("/dashboard")
  }

  const handleBuild = (c: BuildChoiceValue, design: DesignName) => {
    setChoice(c)
    setPptDesign(design)
    setPhase("output")
    setExcelReady(false)
    setExcelError(null)
    setExcelDownloadUrl(null)
    setExcelPreview(null)
    setPptReady(false)
    setPptError(null)
    setPptDownloadUrl(null)
    setPptDeckTitle(null)
    setPptSlideCount(null)
    if (rfpMeta) startGeneration(c, rfpMeta, design)
  }

  const handleDownload = (type: ArtifactKind) => {
    const url = type === "excel" ? excelDownloadUrl : pptDownloadUrl
    if (!url) return
    const a = document.createElement("a")
    a.href = url
    a.rel = "noopener noreferrer"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const header: CSSProperties = {
    height: 64,
    padding: "0 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid var(--pc-border)",
    flexShrink: 0,
  }

  const step = (active: boolean, done: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 500,
    padding: "3px 9px",
    borderRadius: 99,
    background: active ? "var(--pc-accent-dim)" : "transparent",
    color: active ? "var(--pc-accent-2)" : done ? "var(--pc-text-2)" : "var(--pc-text-3)",
  })

  const stepDot = (active: boolean, done: boolean): CSSProperties => ({
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: `1.5px solid ${active ? "var(--pc-accent-2)" : done ? "var(--pc-text-2)" : "var(--pc-text-3)"}`,
    background: done && !active ? "var(--pc-text-2)" : "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: done && !active ? "var(--pc-bg)" : "transparent",
    fontSize: 8,
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
      <div style={header}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--pc-text)" }}>
            {project.customer_name}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--pc-text-3)" }}>
            Created {new Date(project.created_at).toLocaleDateString()}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 8px",
              background: "var(--pc-card)",
              border: "1px solid var(--pc-border)",
              borderRadius: 99,
            }}
          >
            <div style={step(phaseIdx === 0, phaseIdx > 0)}>
              <div style={stepDot(phaseIdx === 0, phaseIdx > 0)}>
                {phaseIdx > 0 && <Icon name="check" size={7} strokeWidth={3} />}
              </div>
              RFP
            </div>
            <div style={{ width: 18, height: 1, background: "var(--pc-border-strong)" }} />
            <div style={step(phaseIdx === 1, phaseIdx > 1)}>
              <div style={stepDot(phaseIdx === 1, phaseIdx > 1)}>
                {phaseIdx > 1 && <Icon name="check" size={7} strokeWidth={3} />}
              </div>
              Build
            </div>
            <div style={{ width: 18, height: 1, background: "var(--pc-border-strong)" }} />
            <div style={step(phaseIdx === 2, false)}>
              <div style={stepDot(phaseIdx === 2, false)} />
              Output
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              background: "rgba(139,92,246,0.14)",
              color: "var(--pc-accent-2)",
              border: "1px solid rgba(139,92,246,0.3)",
              fontSize: 12,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,92,246,0.22)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(139,92,246,0.14)" }}
          >
            <Icon name="trash" size={12} />
            Delete project
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "48px 28px 32px",
        }}
      >
        {phase === "input" && (
          <RfpInput
            onReady={(meta) => {
              setRfpMeta(meta)
              setPhase("choice")
            }}
          />
        )}
        {phase === "choice" && rfpMeta && (
          <BuildChoice
            rfpMeta={rfpMeta}
            onBack={() => setPhase("input")}
            onBuild={handleBuild}
          />
        )}
        {phase === "output" && (
          <OutputStage
            choice={choice}
            projectName={project.customer_name.replace(/\s+/g, "_")}
            excelReady={excelReady}
            excelFileName={excelFileName}
            excelError={excelError}
            pptReady={pptReady}
            pptDeckTitle={pptDeckTitle}
            pptSlideCount={pptSlideCount}
            pptError={pptError}
            pptDesign={pptDesign}
            onPreview={setPreviewType}
            onDownload={handleDownload}
            onReset={() => setPhase("choice")}
          />
        )}
      </div>

      <PreviewModal
        type={previewType}
        projectName={project.customer_name.replace(/\s+/g, "_")}
        onClose={() => setPreviewType(null)}
        onDownload={previewType === "excel" ? () => handleDownload("excel") : undefined}
        excelPreview={excelPreview}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">
                {project.customer_name}
              </span>{" "}
              and any generated files.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

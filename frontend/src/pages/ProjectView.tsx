import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Upload, FileText, ArrowRight, FileSpreadsheet, Presentation, Layers, Loader2, Download, ExternalLink, Trash2, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useProjects } from "@/context/ProjectContext"
import { agentApi, type QuestionnairePreview } from "@/api/agent"
import { api } from "@/api/client"
import { cn } from "@/lib/utils"

type Step = "choose-input" | "upload" | "paste" | "choose-output" | "generating" | "done"

export default function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { getProject, deleteProject } = useProjects()
  const project = projectId ? getProject(projectId) : undefined

  const [step, setStep] = useState<Step>("choose-input")
  const [rfpText, setRfpText] = useState("")
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<QuestionnairePreview | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileActionMessage, setFileActionMessage] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const canLaunchExcel =
    typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent)
  const formatCategoryName = (name: string) => name.replaceAll("_", " ")

  if (!project) {
    return (
      <div className="px-6 md:px-10 py-10">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="mt-2 text-muted-foreground">
          This project doesn't exist. It may have been created in a different
          browser.
        </p>
        <Button asChild className="mt-4">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  const handleGenerateExcel = async () => {
    setError(null)
    setFileActionMessage(null)
    setStep("generating")
    try {
      const res = await agentApi.generateExcel(rfpText)
      setDownloadUrl(res.data.download_url)
      setPreviewData(res.data.preview)
      setStep("done")
    } catch {
      setPreviewData(null)
      setError("Failed to generate Excel. Please try again.")
      setStep("choose-output")
    }
  }

  const getAbsoluteDownloadUrl = (url: string) => {
    const baseUrl = api.defaults.baseURL ?? window.location.origin
    return new URL(url, baseUrl).toString()
  }

  const clickLink = (href: string) => {
    const a = document.createElement("a")
    a.href = href
    a.rel = "noopener noreferrer"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const handleDownload = () => {
    if (!downloadUrl) return
    setFileActionMessage(null)
    clickLink(getAbsoluteDownloadUrl(downloadUrl))
  }

  const handleOpenWithExcel = () => {
    if (!downloadUrl) return
    const absoluteDownloadUrl = getAbsoluteDownloadUrl(downloadUrl)

    if (!canLaunchExcel) {
      setFileActionMessage(
        "Direct Excel launch is only supported in desktop Excel on Windows. Downloading the workbook instead.",
      )
      clickLink(absoluteDownloadUrl)
      return
    }

    setFileActionMessage(null)
    clickLink(`ms-excel:ofe|u|${encodeURI(absoluteDownloadUrl)}`)
  }

  const handleReset = () => {
    setStep("choose-input")
    setRfpText("")
    setDownloadUrl(null)
    setPreviewData(null)
    setPreviewOpen(false)
    setError(null)
    setFileActionMessage(null)
  }

  const handleDeleteProject = () => {
    deleteProject(project.id)
    setDeleteDialogOpen(false)
    navigate("/dashboard")
  }

  // Header shared across all steps
  const header = (
    <header className="border-b border-border/40 px-6 md:px-10 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{project.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete project
        </Button>
      </div>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
            <DialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">{project.name}</span>{" "}
              from local storage on this device. We can swap this to a backend
              SQLModel delete later once the projects API exists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              <Trash2 className="h-4 w-4" />
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )

  // Step: generating (loading)
  if (step === "generating") {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Analyzing your RFP and generating questionnaire...</p>
        </div>
      </div>
    )
  }

  // Step: done (file card with open & download)
  if (step === "done") {
    const fileName = `${project.name} - Questionnaire.xlsx`
    const previewEntries = previewData ? Object.entries(previewData) : []

    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          {/* File card */}
          <div className="w-full max-w-2xl rounded-2xl border border-border/30 bg-card/40 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                <FileSpreadsheet className="h-6 w-6 text-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Excel Workbook &middot; Ready</p>
              </div>
            </div>

            <div
              className={cn(
                "mt-5 grid gap-3",
                canLaunchExcel ? "sm:grid-cols-3" : "sm:grid-cols-2"
              )}
            >
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="mr-1.5 h-4 w-4" /> Preview
              </Button>

              {canLaunchExcel && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleOpenWithExcel}
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" /> Open with Excel
                </Button>
              )}

              <Button
                className="w-full"
                onClick={handleDownload}
              >
                <Download className="mr-1.5 h-4 w-4" /> Download
              </Button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {fileActionMessage ??
                (canLaunchExcel
                  ? "Use desktop Excel on Windows for direct open. If nothing launches, use Download."
                  : "Preview the generated questionnaire here, then download the workbook when you want the file.")}
            </p>
          </div>

          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-w-6xl p-0 sm:max-w-6xl">
              <DialogHeader className="border-b border-border/40 px-6 py-5">
                <DialogTitle>Questionnaire Preview</DialogTitle>
                <DialogDescription>
                  Review the generated workbook content before downloading the Excel file.
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {previewEntries.map(([category, questions]) => (
                    <div
                      key={category}
                      className="rounded-xl border border-border/40 bg-card/40 p-4"
                    >
                      <p className="text-sm font-medium">{formatCategoryName(category)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {questions.length} questions
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-6">
                  {previewEntries.map(([category, questions]) => (
                    <section key={category} className="space-y-3">
                      <div>
                        <h3 className="text-base font-medium">{formatCategoryName(category)}</h3>
                        <p className="text-xs text-muted-foreground">
                          {questions.length} generated questions
                        </p>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-border/40">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-muted/50">
                            <tr className="border-b border-border/40">
                              <th className="px-3 py-2 font-medium">#</th>
                              <th className="px-3 py-2 font-medium">Question</th>
                              <th className="px-3 py-2 font-medium">Why It Matters</th>
                              <th className="px-3 py-2 font-medium">Priority</th>
                              <th className="px-3 py-2 font-medium">Risk If Unanswered</th>
                            </tr>
                          </thead>
                          <tbody>
                            {questions.map((question, index) => (
                              <tr
                                key={`${category}-${index}`}
                                className="border-b border-border/30 align-top last:border-b-0"
                              >
                                <td className="px-3 py-3 text-muted-foreground">{index + 1}</td>
                                <td className="px-3 py-3">{question.question}</td>
                                <td className="px-3 py-3 text-muted-foreground">
                                  {question.why_it_matters}
                                </td>
                                <td className="px-3 py-3">
                                  <span className="rounded-full border border-border/40 px-2 py-1 text-xs">
                                    {question.priority}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">
                                  {question.risk_if_unanswered}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="sm" onClick={handleReset}>
            Start over
          </Button>
        </div>
      </div>
    )
  }

  // Step: choose-output (Excel / PPT / Both)
  if (step === "choose-output") {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
          <div className="text-center">
            <h2 className="text-xl font-medium tracking-tight">What would you like to generate?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Choose your output format</p>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
            {/* Generate Excel */}
            <button
              onClick={handleGenerateExcel}
              className={cn(
                "group flex-1 flex flex-col items-center gap-4 rounded-2xl p-8",
                "bg-card/40 border border-border/30",
                "hover:bg-card/70 hover:border-muted-foreground/30 transition-all duration-200",
                "cursor-pointer"
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent group-hover:bg-accent/80 transition-colors">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Generate Excel</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Discovery questionnaire</p>
              </div>
            </button>

            {/* Generate PPT - coming soon */}
            <div
              className={cn(
                "flex-1 flex flex-col items-center gap-4 rounded-2xl p-8",
                "bg-card/20 border border-border/15 opacity-50",
                "cursor-not-allowed"
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/50">
                <Presentation className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Generate PPT</p>
                <p className="mt-1 text-xs text-muted-foreground/40">Coming soon</p>
              </div>
            </div>

            {/* Generate Both - coming soon */}
            <div
              className={cn(
                "flex-1 flex flex-col items-center gap-4 rounded-2xl p-8",
                "bg-card/20 border border-border/15 opacity-50",
                "cursor-not-allowed"
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/50">
                <Layers className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Generate Both</p>
                <p className="mt-1 text-xs text-muted-foreground/40">Coming soon</p>
              </div>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={() => setStep("paste")}>
            Back
          </Button>
        </div>
      </div>
    )
  }

  // Step: paste RFP text
  if (step === "paste") {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
          <div className="w-full max-w-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-sm font-medium">Type or paste your RFP</h2>
            </div>
            <Textarea
              autoFocus
              rows={12}
              placeholder="Paste or type the RFP content here..."
              value={rfpText}
              onChange={(e) => setRfpText(e.target.value)}
              className="resize-none rounded-xl bg-card/30 border-border/40 text-sm leading-relaxed focus-visible:ring-muted-foreground/30"
            />
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => { setStep("choose-input"); setRfpText("") }}>
                Back
              </Button>
              <Button size="sm" disabled={!rfpText.trim()} onClick={() => setStep("choose-output")}>
                Continue <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step: upload (ignored for now)
  if (step === "upload") {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <div
            className="flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-card/30 p-10 cursor-pointer hover:border-muted-foreground/40 transition-colors"
            onClick={() => document.getElementById("rfp-file-input")?.click()}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Click to upload your RFP</p>
            <p className="text-xs text-muted-foreground">PDF files supported - Coming soon</p>
          </div>
          <input id="rfp-file-input" type="file" accept="application/pdf" className="hidden" />
          <Button variant="ghost" size="sm" onClick={() => setStep("choose-input")}>
            Back
          </Button>
        </div>
      </div>
    )
  }

  // Default step: choose input method
  return (
    <div className="flex h-full flex-col">
      {header}

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <div className="text-center">
          <h2 className="text-xl font-medium tracking-tight">
            How would you like to provide your RFP?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose one of the options below to get started
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
          {/* Upload option */}
          <button
            onClick={() => setStep("upload")}
            className={cn(
              "group flex-1 flex flex-col items-center gap-4 rounded-2xl p-8",
              "bg-card/40 border border-border/30",
              "hover:bg-card/70 hover:border-muted-foreground/30 transition-all duration-200",
              "cursor-pointer"
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent group-hover:bg-accent/80 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Upload your RFP</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Upload a PDF document
              </p>
            </div>
          </button>

          {/* Paste option */}
          <button
            onClick={() => setStep("paste")}
            className={cn(
              "group flex-1 flex flex-col items-center gap-4 rounded-2xl p-8",
              "bg-card/40 border border-border/30",
              "hover:bg-card/70 hover:border-muted-foreground/30 transition-all duration-200",
              "cursor-pointer"
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent group-hover:bg-accent/80 transition-colors">
              <FileText className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Type or paste your RFP</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Enter the RFP text directly
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

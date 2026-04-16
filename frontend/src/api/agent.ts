import { api } from "./client"

export interface PreviewQuestion {
  question: string
  why_it_matters: string
  priority: "High" | "Medium" | "Low"
  risk_if_unanswered: string
}

export type QuestionnairePreview = Record<string, PreviewQuestion[]>

export interface GenerateExcelResponse {
  file_id: string
  file_name: string
  download_url: string
  preview: QuestionnairePreview
}

export const agentApi = {
  generateExcel: (rfpText: string) =>
    api.post<GenerateExcelResponse>("/agent/generate-excel", { rfp_text: rfpText }),
}

import { api } from "./client"

export interface PreviewQuestion {
  question: string
  why_it_matters: string
  priority: "High" | "Medium" | "Low"
  risk_if_unanswered: string
}

export type QuestionnairePreview = Record<string, PreviewQuestion[]>

export interface GenerateExcelResponse {
  customer_id: number
  excel_s3_key: string
  excel_url: string
  preview: QuestionnairePreview
}

export type DesignName = "corporate_blue" | "warm_earth"

export interface GeneratePPTResponse {
  customer_id: number
  ppt_s3_key: string
  ppt_url: string
  deck_title: string
  slide_count: number
}

export const agentApi = {
  generateExcel: (customerId: number, rfpText: string) =>
    api.post<GenerateExcelResponse>("/agent/generate-excel", {
      customer_id: customerId,
      rfp_text: rfpText,
    }),
  generatePPT: (customerId: number, rfpText: string, designName: DesignName) =>
    api.post<GeneratePPTResponse>("/agent/generate-ppt", {
      customer_id: customerId,
      rfp_text: rfpText,
      design_name: designName,
    }),
}

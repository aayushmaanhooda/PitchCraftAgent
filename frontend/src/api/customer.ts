import { api } from "./client"

export interface Customer {
  id: number
  customer_name: string
  excel_s3_key: string | null
  ppt_s3_key: string | null
  created_at: string
}

export interface PresignedUrlResponse {
  url: string
  expires_in: number
}

export const customerApi = {
  list: () => api.get<Customer[]>("/customer"),
  get: (id: number) => api.get<Customer>(`/customer/${id}`),
  create: (customer_name: string) =>
    api.post<Customer>("/customer", { customer_name }),
  remove: (id: number) => api.delete<void>(`/customer/${id}`),
  excelUrl: (id: number) =>
    api.get<PresignedUrlResponse>(`/customer/${id}/excel-url`),
  pptUrl: (id: number) =>
    api.get<PresignedUrlResponse>(`/customer/${id}/ppt-url`),
}

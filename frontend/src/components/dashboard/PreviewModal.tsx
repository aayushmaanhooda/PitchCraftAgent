import type { CSSProperties } from "react"

import { Icon } from "@/components/dashboard/Icon"
import type { QuestionnairePreview } from "@/api/agent"

type Props = {
  type: "excel" | "ppt" | null
  projectName: string
  onClose: () => void
  onDownload?: () => void
  excelPreview?: QuestionnairePreview | null
}

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(0,0,0,0.7)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 40,
}

const win: CSSProperties = {
  width: "min(1100px, 100%)",
  height: "min(760px, calc(100vh - 80px))",
  background: "var(--pc-panel)",
  border: "1px solid var(--pc-border-strong)",
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
}

const head: CSSProperties = {
  height: 52,
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  borderBottom: "1px solid var(--pc-border)",
  flexShrink: 0,
}

export function PreviewModal({ type, projectName, onClose, onDownload, excelPreview }: Props) {
  if (!type) return null
  const color = type === "excel" ? "#3ecf8e" : "#e5a94d"

  return (
    <div style={scrim} onClick={onClose}>
      <div style={win} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={type === "excel" ? "excel" : "ppt"} size={14} />
          </div>
          <div style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>
            {projectName}_{type === "excel" ? "Response.xlsx" : "Pitch.pptx"}
            <span style={{ color: "var(--pc-text-3)", marginLeft: 8, fontSize: 11.5, fontWeight: 400 }}>
              · Preview
            </span>
          </div>
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              style={{
                padding: "7px 12px",
                borderRadius: 7,
                background: "var(--pc-accent)",
                color: "white",
                fontSize: 12,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--pc-accent-2)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--pc-accent)" }}
            >
              <Icon name="download" size={12} />
              Download
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--pc-text-3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)"
              e.currentTarget.style.color = "var(--pc-text)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--pc-text-3)"
            }}
          >
            <Icon name="x" size={15} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", background: type === "excel" ? "#0e0e10" : "#0a0a0c" }}>
          {type === "excel" ? <ExcelFull preview={excelPreview} /> : <PptFull />}
        </div>
      </div>
    </div>
  )
}

function ExcelFull({ preview }: { preview?: QuestionnairePreview | null }) {
  const categories = preview ? Object.entries(preview) : []
  const hasData = categories.length > 0
  const formatCategoryName = (name: string) => name.replaceAll("_", " ")

  if (hasData) {
    return (
      <div style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: "0 4px 0",
            borderBottom: "1px solid var(--pc-border)",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {categories.map(([cat], i) => (
            <div
              key={cat}
              style={{
                padding: "7px 12px",
                fontSize: 11,
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? "var(--pc-text)" : "var(--pc-text-3)",
                background: i === 0 ? "var(--pc-card)" : "transparent",
                border: "1px solid var(--pc-border)",
                borderBottom: i === 0 ? "1px solid var(--pc-card)" : "1px solid var(--pc-border)",
                borderRadius: "6px 6px 0 0",
                marginBottom: -1,
                textTransform: "capitalize",
              }}
            >
              {formatCategoryName(cat)}
            </div>
          ))}
        </div>
        {categories.map(([cat, questions]) => (
          <section key={cat} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, textTransform: "capitalize" }}>
              {formatCategoryName(cat)}
            </h3>
            <p style={{ fontSize: 11.5, color: "var(--pc-text-3)", marginBottom: 10 }}>
              {questions.length} generated questions
            </p>
            <div
              style={{
                border: "1px solid var(--pc-border)",
                borderRadius: 6,
                overflow: "hidden",
                background: "var(--pc-card)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: "var(--pc-card-2)" }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Question</th>
                    <th style={thStyle}>Why It Matters</th>
                    <th style={thStyle}>Priority</th>
                    <th style={thStyle}>Risk If Unanswered</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--pc-border)" }}>
                      <td style={{ ...tdStyle, color: "var(--pc-green)", fontWeight: 600 }}>{i + 1}</td>
                      <td style={tdStyle}>{q.question}</td>
                      <td style={{ ...tdStyle, color: "var(--pc-text-2)" }}>{q.why_it_matters}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 99,
                            border: "1px solid var(--pc-border-strong)",
                            fontSize: 11,
                          }}
                        >
                          {q.priority}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: "var(--pc-text-2)" }}>{q.risk_if_unanswered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    )
  }

  const headers = ["ID", "Requirement", "Status", "Section", "Response", "Owner"]
  const rows: [string, string, string, string, string, string][] = [
    ["REQ-01", "User authentication with SSO/SAML 2.0", "Full", "Security", "Native SAML 2.0 + OIDC. 35 IdPs supported out of the box.", "K. Patel"],
    ["REQ-02", "Multi-currency GL with 30+ currencies", "Full", "Finance", "Supports 167 ISO 4217 currencies with real-time FX sync.", "J. Nakamura"],
    ["REQ-03", "Role-based access, field-level controls", "Full", "Security", "Custom roles + field-level masking + ABAC policies.", "K. Patel"],
    ["REQ-04", "SOC 2 Type II, ISO 27001 certified", "Full", "Compliance", "Both certifications current. Reports available under NDA.", "L. Ferreira"],
    ["REQ-05", "API rate limiting ≥ 10k req/min", "Partial", "Platform", "Current limit: 8k req/min on Enterprise; 15k on request.", "R. Silva"],
    ["REQ-06", "Workflow engine with no-code builder", "Full", "Platform", "Drag-and-drop workflows with 120+ triggers and actions.", "R. Silva"],
    ["REQ-07", "Real-time reporting, sub-second queries", "Full", "Analytics", "ClickHouse backend, p95 query latency 240ms.", "M. Chen"],
  ]
  return (
    <div style={{ padding: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "60px 2fr 70px 100px 3fr 100px",
          border: "1px solid var(--pc-border)",
          borderRadius: 6,
          overflow: "hidden",
          background: "var(--pc-card)",
        }}
      >
        {headers.map((h, i) => (
          <div
            key={i}
            style={{
              padding: "8px 10px",
              background: "var(--pc-card-2)",
              fontWeight: 600,
              color: "var(--pc-text-2)",
              borderRight: i < headers.length - 1 ? "1px solid var(--pc-border)" : "none",
              borderBottom: "1px solid var(--pc-border)",
            }}
          >
            {h}
          </div>
        ))}
        {rows.map((r, i) =>
          r.map((cell, j) => (
            <div
              key={`${i}-${j}`}
              style={{
                padding: "8px 10px",
                borderRight: j < r.length - 1 ? "1px solid var(--pc-border)" : "none",
                borderBottom: "1px solid var(--pc-border)",
                color: j === 0 ? "var(--pc-green)" : j === 2 ? (cell === "Full" ? "var(--pc-green)" : "var(--pc-accent-2)") : "var(--pc-text)",
                whiteSpace: j === 4 ? "normal" : "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontWeight: j === 0 ? 600 : 400,
              }}
            >
              {cell}
            </div>
          )),
        )}
      </div>
    </div>
  )
}

const thStyle: CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--pc-text-2)",
}

const tdStyle: CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  verticalAlign: "top",
  color: "var(--pc-text)",
}

function PptFull() {
  const slides = [
    { t: "Executive Summary", s: "Modernizing your back-office with a unified platform", kicker: "01 / 14" },
    { t: "Understanding your RFP", s: "The 4 outcomes that define success", kicker: "02 / 14" },
    { t: "Our Approach", s: "Phased delivery, zero-disruption cutover", kicker: "03 / 14" },
    { t: "Solution Fit", s: "Every must-have mapped to a native capability", kicker: "04 / 14" },
    { t: "Architecture", s: "Multi-tenant, zero-trust, region-resident", kicker: "05 / 14" },
    { t: "Security & Compliance", s: "SOC 2 · ISO 27001 · HIPAA · GDPR", kicker: "06 / 14" },
    { t: "Integration Strategy", s: "7 upstream systems, 3 downstream", kicker: "07 / 14" },
    { t: "Change & Enablement", s: "Named CSM, 12-week adoption roadmap", kicker: "08 / 14" },
    { t: "Case Study: Northwind", s: "$2.1M annual saving, 4-month payback", kicker: "09 / 14" },
    { t: "Team", s: "The humans delivering this for you", kicker: "10 / 14" },
    { t: "Timeline", s: "14-week phased rollout, go-live Q3", kicker: "11 / 14" },
    { t: "Pricing", s: "Transparent, volume-indexed, no hidden fees", kicker: "12 / 14" },
    { t: "Risks & Mitigations", s: "What we're watching and how we respond", kicker: "13 / 14" },
    { t: "Next Steps", s: "What a great week 1 looks like", kicker: "14 / 14" },
  ]
  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      {slides.map((s, i) => (
        <div
          key={i}
          style={{
            aspectRatio: "16/9",
            background:
              i % 5 === 0
                ? "linear-gradient(135deg, #2a1f3a, #1c1c22)"
                : i % 5 === 2
                  ? "linear-gradient(135deg, #1f2a22, #1c1c22)"
                  : "linear-gradient(135deg, #1c1c22, #24242a)",
            border: "1px solid var(--pc-border-strong)",
            borderRadius: 8,
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "var(--pc-text-3)" }}>
            {s.kicker}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 6 }}>
              {s.t}
            </div>
            <div style={{ fontSize: 11, color: "var(--pc-text-2)", lineHeight: 1.4 }}>{s.s}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ width: 20, height: 2, background: "var(--pc-accent)", borderRadius: 1 }} />
            <div style={{ width: 6, height: 2, background: "var(--pc-border-strong)", borderRadius: 1 }} />
            <div style={{ width: 6, height: 2, background: "var(--pc-border-strong)", borderRadius: 1 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

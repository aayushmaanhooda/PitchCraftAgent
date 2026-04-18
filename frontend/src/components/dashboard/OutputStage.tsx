import { useEffect, useMemo, useState, type CSSProperties } from "react"

import { Icon } from "@/components/dashboard/Icon"
import type { BuildChoiceValue } from "@/components/dashboard/BuildChoice"
import type { DesignName } from "@/api/agent"

export type ArtifactKind = "excel" | "ppt"

type Props = {
  choice: BuildChoiceValue
  projectName: string
  excelReady: boolean
  excelFileName?: string | null
  excelError?: string | null
  pptReady: boolean
  pptDeckTitle?: string | null
  pptSlideCount?: number | null
  pptError?: string | null
  pptDesign: DesignName
  onPreview: (type: ArtifactKind) => void
  onDownload: (type: ArtifactKind) => void
  onReset: () => void
}

type ChatMessage = { role: "user" | "assistant"; text: string }

const quickPrompts = [
  "Make it more concise",
  "Add a risk-mitigation slide",
  "Tighten pricing section",
  "Use a more formal tone",
]

export function OutputStage({
  choice,
  projectName,
  excelReady,
  excelFileName,
  excelError,
  pptReady,
  pptDeckTitle,
  pptSlideCount,
  pptError,
  pptDesign,
  onPreview,
  onDownload,
  onReset,
}: Props) {
  const artifacts = useMemo<ArtifactKind[]>(() => {
    const list: ArtifactKind[] = []
    if (choice === "excel" || choice === "both") list.push("excel")
    if (choice === "ppt" || choice === "both") list.push("ppt")
    return list
  }, [choice])

  const [progress, setProgress] = useState<{ excel: number; ppt: number }>({ excel: 0, ppt: 0 })
  const [chatOpen, setChatOpen] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: `I've drafted your ${
        choice === "both" ? "Excel and PPT" : choice === "excel" ? "Excel" : "PPT"
      } based on the RFP. Want me to tweak tone, depth, or sections? Just ask.`,
    },
  ])
  const [chatInput, setChatInput] = useState("")

  const excelPct = excelReady ? 1 : Math.min(0.92, progress.excel)
  const pptPct = pptReady ? 1 : Math.min(0.92, progress.ppt)

  // Slow rolling progress while waiting for backend (capped at ~92%)
  useEffect(() => {
    if (excelReady) {
      setProgress((p) => ({ ...p, excel: 1 }))
      return
    }
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const t = (now - start) / 1000
      const p = Math.min(0.92, t / 6)
      setProgress((prev) => ({ ...prev, excel: p }))
      if (p < 0.92) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [excelReady])

  useEffect(() => {
    if (!artifacts.includes("ppt")) return
    if (pptReady) {
      setProgress((p) => ({ ...p, ppt: 1 }))
      return
    }
    const start = performance.now()
    let frame: number
    // PPT takes ~3-5 min, so stretch the curve out to ~180s target.
    const tick = (now: number) => {
      const t = (now - start) / 1000
      const p = Math.min(0.92, t / 180)
      setProgress((prev) => ({ ...prev, ppt: p }))
      if (p < 0.92) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [artifacts, pptReady])

  const allReady =
    (!artifacts.includes("excel") || excelReady) &&
    (!artifacts.includes("ppt") || pptReady)

  const sendMessage = () => {
    const v = chatInput.trim()
    if (!v) return
    setMessages((m) => [...m, { role: "user", text: v }])
    setChatInput("")
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Got it — I'll apply that on the next regeneration. Anything else you'd like to change?",
        },
      ])
    }, 700)
  }

  const designLabel =
    pptDesign === "warm_earth" ? "Warm Earth" : "Corporate Blue"
  const artifactMeta = {
    excel: {
      title: excelFileName || `${projectName}_Response.xlsx`,
      sub: excelReady ? "Excel Workbook · Ready" : "Generating excel workbook...",
      color: "#3ecf8e" as const,
      icon: "excel" as const,
    },
    ppt: {
      title: `${projectName}_Pitch.pptx`,
      sub: pptReady
        ? `${pptSlideCount ?? "—"} slides · 16:9 · ${designLabel}`
        : `Generating pitch deck (${designLabel})...`,
      color: "#e5a94d" as const,
      icon: "ppt" as const,
    },
  }

  const statusPill = (ready: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 500,
    padding: "4px 9px",
    borderRadius: 99,
    background: ready ? "rgba(62,207,142,0.12)" : "rgba(139,92,246,0.14)",
    color: ready ? "var(--pc-green)" : "var(--pc-accent-2)",
    letterSpacing: "0.02em",
  })

  const statusDot = (ready: boolean): CSSProperties => ({
    width: 6,
    height: 6,
    borderRadius: 3,
    background: ready ? "var(--pc-green)" : "var(--pc-accent-2)",
    animation: ready ? "none" : "pc-pulse 1.2s infinite",
  })

  const card: CSSProperties = {
    background: "var(--pc-card)",
    border: "1px solid var(--pc-border)",
    borderRadius: 12,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    position: "relative",
  }

  const iconBtn = (primary: boolean): CSSProperties => ({
    width: 30,
    height: 30,
    borderRadius: 7,
    background: primary ? "var(--pc-accent)" : "rgba(255,255,255,0.04)",
    color: primary ? "white" : "var(--pc-text-2)",
    border: primary ? "none" : "1px solid var(--pc-border-strong)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 140ms",
  })

  const chatWrap: CSSProperties = {
    background: "var(--pc-card)",
    border: "1px solid var(--pc-border)",
    borderRadius: 12,
    overflow: "hidden",
    transition: "all 180ms",
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 980,
        margin: "0 auto",
        padding: "0 24px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <style>{`
        @keyframes pc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={statusPill(allReady)}>
            <span style={statusDot(allReady)} />
            {allReady ? "Ready" : "Generating..."}
          </div>
          <span style={{ fontSize: 13, color: "var(--pc-text-2)" }}>
            {allReady
              ? `${artifacts.length === 2 ? "Excel + PPT" : artifacts[0].toUpperCase()} generated from your RFP`
              : `Analyzing RFP and drafting ${
                  artifacts.length === 2 ? "both artifacts" : "your " + artifacts[0].toUpperCase()
                }`}
          </span>
        </div>
        {allReady && (
          <button
            type="button"
            style={{
              padding: "7px 12px",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid var(--pc-border-strong)",
              borderRadius: 8,
              color: "var(--pc-text-2)",
              background: "transparent",
              cursor: "pointer",
            }}
            onClick={onReset}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)"
              e.currentTarget.style.color = "var(--pc-text)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--pc-text-2)"
            }}
          >
            <Icon name="sparkle" size={12} />
            Regenerate
          </button>
        )}
      </div>

      {!allReady && (
        <div
          style={{
            background: "var(--pc-card)",
            border: "1px solid var(--pc-border)",
            borderRadius: 12,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {artifacts.map((a) => {
            const m = artifactMeta[a]
            const pct = a === "excel" ? excelPct : pptPct
            return (
              <div key={a} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `color-mix(in srgb, ${m.color} 14%, transparent)`,
                    color: m.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={m.icon} size={14} />
                </div>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {a === "excel" ? "Excel Response" : "PPT Deck"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--pc-text-3)", marginTop: 2 }}>
                    {pct < 0.3 ? "Reading RFP..." : pct < 0.7 ? "Drafting content..." : pct < 1 ? "Formatting..." : "Complete"}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(pct * 100)}%`,
                      height: "100%",
                      background: m.color,
                      transition: "width 120ms linear",
                    }}
                  />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--pc-text-3)", minWidth: 40, textAlign: "right" }}>
                  {Math.round(pct * 100)}%
                </div>
              </div>
            )
          })}
          {excelError && (
            <div style={{ fontSize: 12, color: "var(--pc-accent-2)", marginTop: 4 }}>
              Excel: {excelError}
            </div>
          )}
          {pptError && (
            <div style={{ fontSize: 12, color: "var(--pc-accent-2)", marginTop: 4 }}>
              PPT: {pptError}
            </div>
          )}
        </div>
      )}

      {allReady && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: artifacts.length === 2 ? "1fr 1fr" : "1fr",
            gap: 16,
          }}
        >
          {artifacts.map((a) => {
            const m = artifactMeta[a]
            return (
              <div key={a} style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: `color-mix(in srgb, ${m.color} 14%, transparent)`,
                      color: m.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={m.icon} size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        marginBottom: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {m.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--pc-text-3)" }}>{m.sub}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      title="Preview"
                      onClick={() => onPreview(a)}
                      style={iconBtn(false)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.08)"
                        e.currentTarget.style.color = "var(--pc-text)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                        e.currentTarget.style.color = "var(--pc-text-2)"
                      }}
                    >
                      <Icon name="eye" size={14} />
                    </button>
                    <button
                      type="button"
                      title="Download"
                      onClick={() => onDownload(a)}
                      style={iconBtn(true)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--pc-accent-2)" }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--pc-accent)" }}
                    >
                      <Icon name="download" size={14} />
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--pc-card-2)",
                    border: "1px solid var(--pc-border)",
                    borderRadius: 8,
                    padding: 14,
                    minHeight: 160,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {a === "excel" ? (
                    <ExcelMini />
                  ) : (
                    <PptMini
                      deckTitle={pptDeckTitle}
                      slideCount={pptSlideCount}
                      design={pptDesign}
                    />
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "var(--pc-text-3)" }}>
                  <span>Draft v1</span>
                  <span>Updated just now</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={chatWrap}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: chatOpen ? "1px solid var(--pc-border)" : "none",
            cursor: "pointer",
          }}
          onClick={() => setChatOpen((o) => !o)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500 }}>
            <span style={{ color: "var(--pc-blue)" }}><Icon name="sparkle" size={14} /></span>
            Refine with chat
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.05em",
                padding: "2px 7px",
                borderRadius: 99,
                background: "rgba(138,180,255,0.12)",
                color: "var(--pc-blue)",
              }}
            >
              BETA
            </span>
          </div>
          <span
            style={{
              color: "var(--pc-text-3)",
              transform: chatOpen ? "rotate(180deg)" : "none",
              transition: "transform 160ms",
              display: "inline-flex",
            }}
          >
            <Icon name="chevron-down" size={14} />
          </span>
        </div>
        {chatOpen && (
          <>
            <div
              style={{
                maxHeight: 210,
                overflowY: "auto",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    padding: "8px 12px",
                    borderRadius: 10,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    background: m.role === "user" ? "var(--pc-accent-dim)" : "rgba(255,255,255,0.04)",
                    color: "var(--pc-text)",
                    border:
                      m.role === "user"
                        ? "1px solid rgba(139,92,246,0.28)"
                        : "1px solid var(--pc-border)",
                  }}
                >
                  {m.text}
                </div>
              ))}
            </div>
            {messages.length <= 1 && (
              <div style={{ display: "flex", gap: 6, padding: "0 12px 10px", flexWrap: "wrap" }}>
                {quickPrompts.map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setChatInput(q)}
                    style={{
                      fontSize: 11.5,
                      padding: "5px 10px",
                      borderRadius: 99,
                      border: "1px solid var(--pc-border-strong)",
                      color: "var(--pc-text-2)",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                      e.currentTarget.style.color = "var(--pc-text)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.color = "var(--pc-text-2)"
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderTop: "1px solid var(--pc-border)",
              }}
            >
              <span style={{ color: "var(--pc-text-3)" }}><Icon name="sparkle" size={14} /></span>
              <input
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--pc-text)",
                  fontSize: 13,
                  padding: "6px 4px",
                }}
                placeholder="Ask to change tone, add slides, reorder sheets..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage()
                }}
              />
              <button
                type="button"
                onClick={sendMessage}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  background: chatInput.trim() ? "var(--pc-accent)" : "rgba(255,255,255,0.06)",
                  color: chatInput.trim() ? "white" : "var(--pc-text-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Icon name="send" size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ExcelMini() {
  const rows: [string, string, string, string][] = [
    ["REQ-01", "User authentication (SSO/SAML 2.0)", "Full", "Security"],
    ["REQ-02", "Multi-currency GL with 30+ currencies", "Full", "Finance"],
    ["REQ-03", "Role-based access, field-level", "Full", "Security"],
    ["REQ-04", "SOC 2 Type II, ISO 27001", "Full", "Compliance"],
    ["REQ-05", "API rate limiting ≥ 10k req/min", "Partial", "Platform"],
    ["REQ-06", "Workflow engine, no-code builder", "Full", "Platform"],
    ["REQ-07", "Real-time reporting, sub-second", "Full", "Analytics"],
  ]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "50px 1fr 44px 60px",
            gap: 8,
            padding: "3px 0",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            color: "var(--pc-text-2)",
          }}
        >
          <span style={{ color: "var(--pc-green)" }}>{r[0]}</span>
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "var(--pc-text)",
            }}
          >
            {r[1]}
          </span>
          <span style={{ color: r[2] === "Full" ? "var(--pc-green)" : "var(--pc-accent-2)" }}>{r[2]}</span>
          <span style={{ color: "var(--pc-text-3)" }}>{r[3]}</span>
        </div>
      ))}
    </div>
  )
}

function PptMini({
  deckTitle,
  slideCount,
  design,
}: {
  deckTitle: string | null | undefined
  slideCount: number | null | undefined
  design: DesignName
}) {
  const palette =
    design === "warm_earth"
      ? {
          tileA: "linear-gradient(135deg, #3a2615, #5e3a1f)",
          tileB: "linear-gradient(135deg, #5e3a1f, #c98b4d)",
          tileC: "linear-gradient(135deg, #1c1512, #2b1e15)",
        }
      : {
          tileA: "linear-gradient(135deg, #0f2b5b, #1e5fb4)",
          tileB: "linear-gradient(135deg, #1e5fb4, #3178c6)",
          tileC: "linear-gradient(135deg, #121824, #1b243a)",
        }
  const count = slideCount ?? 8
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--pc-text)",
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {deckTitle ?? "Sales deck"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "16/10",
              borderRadius: 4,
              background:
                i % 3 === 0 ? palette.tileA : i % 3 === 2 ? palette.tileC : palette.tileB,
              border: "1px solid var(--pc-border)",
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--pc-text-3)" }}>
        Showing {Math.min(count, 8)} of {count} slides
      </div>
    </div>
  )
}

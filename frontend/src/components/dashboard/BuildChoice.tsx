import { useState, type CSSProperties } from "react"

import { Icon } from "@/components/dashboard/Icon"
import type { RfpMeta } from "@/components/dashboard/RfpInput"
import type { DesignName } from "@/api/agent"

export type BuildChoiceValue = "excel" | "ppt" | "both"

type Props = {
  rfpMeta?: RfpMeta
  onBack: () => void
  onBuild: (choice: BuildChoiceValue, design: DesignName) => void
}

type DesignOption = {
  id: DesignName
  title: string
  tagline: string
  swatches: string[]
}

const designs: DesignOption[] = [
  {
    id: "corporate_blue",
    title: "Corporate Blue",
    tagline: "Cool, structured, enterprise pitch energy.",
    swatches: ["#0f2b5b", "#1e5fb4", "#e6edf7"],
  },
  {
    id: "warm_earth",
    title: "Warm Earth",
    tagline: "Warm, human, mid-market storytelling.",
    swatches: ["#5e3a1f", "#c98b4d", "#f2e4d4"],
  },
]

type Option = {
  id: BuildChoiceValue
  title: string
  icon: "excel" | "ppt" | "both"
  color: string
  desc: string
  features: string[]
  recommended?: boolean
}

const options: Option[] = [
  {
    id: "excel",
    title: "Build Excel",
    icon: "excel",
    color: "#3ecf8e",
    desc: "A structured response matrix answering every requirement with compliance, evidence and owners.",
    features: ["Compliance matrix", "Requirement traceability", "Evaluation scoring sheet"],
  },
  {
    id: "ppt",
    title: "Build PPT",
    icon: "ppt",
    color: "#e5a94d",
    desc: "A pitch deck with executive summary, solution narrative, team and case studies tailored to the RFP.",
    features: ["Executive summary", "Tailored solution slides", "Case studies & team"],
  },
  {
    id: "both",
    title: "Build Both",
    icon: "both",
    color: "#a78bfa",
    desc: "Generate the Excel response matrix and the PowerPoint pitch deck together — cross-linked.",
    features: ["Everything in Excel", "Everything in PPT", "Cross-referenced narrative"],
    recommended: true,
  },
]

export function BuildChoice({ rfpMeta, onBack, onBuild }: Props) {
  const [choice, setChoice] = useState<BuildChoiceValue>("both")
  const [design, setDesign] = useState<DesignName>("corporate_blue")
  const needsDesign = choice !== "excel"

  const optionStyle = (active: boolean): CSSProperties => ({
    position: "relative",
    background: active ? "var(--pc-accent-dim)" : "var(--pc-card)",
    border: `1px solid ${active ? "rgba(139,92,246,0.45)" : "var(--pc-border)"}`,
    borderRadius: 12,
    padding: "22px 20px 20px",
    cursor: "pointer",
    transition: "all 180ms",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 200,
  })

  const rfpLabel =
    rfpMeta?.mode === "upload"
      ? rfpMeta.file.name
      : rfpMeta?.mode === "paste"
        ? `Pasted RFP · ~${rfpMeta.text.trim().split(/\s+/).length} words`
        : "RFP ready"

  return (
    <div style={{ width: "100%", maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 28,
          padding: "10px 14px",
          background: "var(--pc-card)",
          border: "1px solid var(--pc-border)",
          borderRadius: 10,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--pc-text-3)",
            fontSize: 12,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--pc-text)" }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--pc-text-3)" }}
        >
          <Icon name="arrow-left" size={12} />
          Change RFP
        </button>
        <div style={{ width: 1, height: 16, background: "var(--pc-border-strong)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "rgba(62,207,142,0.12)",
              color: "var(--pc-green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="file" size={14} />
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--pc-text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              minWidth: 0,
            }}
          >
            {rfpLabel}
          </div>
          <div
            style={{
              fontSize: 10.5,
              padding: "3px 8px",
              borderRadius: 99,
              background: "rgba(62,207,142,0.12)",
              color: "var(--pc-green)",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            Parsed
          </div>
        </div>
      </div>

      <div style={{ fontSize: 20, fontWeight: 600, textAlign: "center", letterSpacing: "-0.01em", marginBottom: 6 }}>
        What would you like to build?
      </div>
      <div style={{ fontSize: 13.5, color: "var(--pc-text-2)", textAlign: "center", marginBottom: 28 }}>
        You can always regenerate or swap formats later
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {options.map((o) => (
          <div key={o.id} style={optionStyle(choice === o.id)} onClick={() => setChoice(o.id)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: `color-mix(in srgb, ${o.color} 14%, transparent)`,
                    color: o.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={o.icon} size={16} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{o.title}</div>
              </div>
              {o.recommended && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    padding: "3px 7px",
                    borderRadius: 99,
                    background: "rgba(139,92,246,0.18)",
                    color: "var(--pc-accent-2)",
                  }}
                >
                  RECOMMENDED
                </div>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--pc-text-2)", lineHeight: 1.5 }}>{o.desc}</div>
            <div
              style={{
                marginTop: "auto",
                paddingTop: 12,
                borderTop: "1px solid var(--pc-border)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {o.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--pc-text-2)" }}>
                  <span style={{ color: "var(--pc-green)", flexShrink: 0 }}>
                    <Icon name="check" size={12} strokeWidth={2.2} />
                  </span>
                  {f}
                </div>
              ))}
            </div>
            {choice === o.id && (
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--pc-accent)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="check" size={10} strokeWidth={2.5} />
              </div>
            )}
          </div>
        ))}
      </div>

      {needsDesign && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 600, textAlign: "center", marginBottom: 4 }}>
            Pick a deck design
          </div>
          <div style={{ fontSize: 12, color: "var(--pc-text-3)", textAlign: "center", marginBottom: 14 }}>
            Sets the palette, typography feel and image tone for the slides.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {designs.map((d) => {
              const active = design === d.id
              return (
                <div
                  key={d.id}
                  onClick={() => setDesign(d.id)}
                  style={{
                    background: active ? "var(--pc-accent-dim)" : "var(--pc-card)",
                    border: `1px solid ${active ? "rgba(139,92,246,0.45)" : "var(--pc-border)"}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    position: "relative",
                    transition: "all 160ms",
                  }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
                    {d.swatches.map((c) => (
                      <div
                        key={c}
                        style={{
                          width: 18,
                          height: 28,
                          borderRadius: 4,
                          background: c,
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{d.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--pc-text-3)", marginTop: 2 }}>
                      {d.tagline}
                    </div>
                  </div>
                  {active && (
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "var(--pc-accent)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="check" size={10} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
        <button
          type="button"
          onClick={() => onBuild(choice, design)}
          style={{
            padding: "11px 22px",
            borderRadius: 9,
            background: "var(--pc-accent)",
            color: "white",
            fontWeight: 500,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "none",
            cursor: "pointer",
            transition: "background 150ms",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--pc-accent-2)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--pc-accent)" }}
        >
          <Icon name="sparkle" size={14} />
          {choice === "both" ? "Build Excel + PPT" : choice === "excel" ? "Build Excel" : "Build PPT"}
        </button>
      </div>
    </div>
  )
}

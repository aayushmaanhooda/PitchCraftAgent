import { useRef, useState, type CSSProperties } from "react"

import { Icon } from "@/components/dashboard/Icon"

export type RfpMeta =
  | { mode: "upload"; file: { name: string; size: number } }
  | { mode: "paste"; text: string }

type Props = {
  onReady: (meta: RfpMeta) => void
}

export function RfpInput({ onReady }: Props) {
  const [mode, setMode] = useState<"upload" | "paste" | null>(null)
  const [file, setFile] = useState<{ name: string; size: number } | null>(null)
  const [text, setText] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const canContinue = (mode === "upload" && !!file) || (mode === "paste" && wordCount >= 20)

  const handleFile = (f: File | null | undefined) => {
    if (!f) return
    setFile({ name: f.name, size: f.size })
  }

  const submit = () => {
    if (!canContinue) return
    if (mode === "upload" && file) onReady({ mode: "upload", file })
    else if (mode === "paste") onReady({ mode: "paste", text })
  }

  const card = (active: boolean): CSSProperties => ({
    background: active ? "var(--pc-accent-dim)" : "var(--pc-card)",
    border: `1px solid ${active ? "rgba(139,92,246,0.45)" : "var(--pc-border)"}`,
    borderRadius: 12,
    padding: "28px 22px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    transition: "all 180ms",
    position: "relative",
  })

  const iconBox = (active: boolean): CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: 8,
    background: active ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.05)",
    color: active ? "var(--pc-accent-2)" : "var(--pc-text-2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  })

  const continueBtn = (on: boolean): CSSProperties => ({
    padding: "11px 20px",
    borderRadius: 9,
    background: on ? "var(--pc-accent)" : "rgba(255,255,255,0.06)",
    color: on ? "white" : "var(--pc-text-3)",
    fontWeight: 500,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: on ? "pointer" : "not-allowed",
    border: "1px solid transparent",
    transition: "background 150ms",
  })

  const dropzone: CSSProperties = {
    marginTop: 8,
    border: `1.5px dashed ${dragOver ? "var(--pc-accent)" : "var(--pc-border-strong)"}`,
    borderRadius: 12,
    padding: "40px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    background: dragOver ? "rgba(139,92,246,0.04)" : "transparent",
    cursor: "pointer",
    transition: "all 140ms",
  }

  return (
    <div style={{ width: "100%", maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ fontSize: 20, fontWeight: 600, textAlign: "center", letterSpacing: "-0.01em", marginBottom: 6 }}>
        How would you like to provide your RFP?
      </div>
      <div style={{ fontSize: 13.5, color: "var(--pc-text-2)", textAlign: "center", marginBottom: 32 }}>
        Choose one of the options below to get started
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <div style={card(mode === "upload")} onClick={() => setMode("upload")}>
          <div style={iconBox(mode === "upload")}><Icon name="upload" size={18} /></div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Upload your RFP</div>
          <div style={{ fontSize: 12, color: "var(--pc-text-2)" }}>PDF, DOCX or TXT up to 20MB</div>
          {mode === "upload" && (
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 18,
                height: 18,
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

        <div style={card(mode === "paste")} onClick={() => setMode("paste")}>
          <div style={iconBox(mode === "paste")}><Icon name="doc" size={18} /></div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Type or paste your RFP</div>
          <div style={{ fontSize: 12, color: "var(--pc-text-2)" }}>Enter the RFP text directly</div>
          {mode === "paste" && (
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 18,
                height: 18,
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
      </div>

      {mode === "upload" && !file && (
        <div
          style={dropzone}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ color: "var(--pc-text-3)" }}><Icon name="upload" size={24} /></div>
          <div style={{ fontSize: 13, color: "var(--pc-text-2)" }}>
            Drag and drop your RFP here, or{" "}
            <span style={{ color: "var(--pc-accent-2)", textDecoration: "underline", textUnderlineOffset: 2 }}>
              browse files
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--pc-text-3)" }}>PDF, DOCX, TXT · max 20MB</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {mode === "upload" && file && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: "var(--pc-card)",
            border: "1px solid var(--pc-border)",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(62,207,142,0.12)",
              color: "var(--pc-green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="file" size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {file.name}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--pc-text-3)", marginTop: 2 }}>
              {(file.size / 1024).toFixed(0)} KB · uploaded just now
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              color: "var(--pc-text-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {mode === "paste" && (
        <div
          style={{
            marginTop: 8,
            background: "var(--pc-card)",
            border: "1px solid var(--pc-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <textarea
            style={{
              width: "100%",
              minHeight: 220,
              padding: "16px 18px",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--pc-text)",
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: "inherit",
              resize: "none",
              display: "block",
            }}
            placeholder="Paste the full RFP text here — including scope, deliverables, timelines, evaluation criteria, and any technical requirements..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderTop: "1px solid var(--pc-border)",
              fontSize: 11.5,
              color: "var(--pc-text-3)",
            }}
          >
            <span>
              {wordCount} words{" "}
              {wordCount > 0 && wordCount < 20 && (
                <span style={{ color: "var(--pc-accent-2)" }}>· minimum 20 to continue</span>
              )}
            </span>
            <span>Paste or type freely</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <button
          type="button"
          style={continueBtn(canContinue)}
          disabled={!canContinue}
          onClick={submit}
          onMouseEnter={(e) => { if (canContinue) e.currentTarget.style.background = "var(--pc-accent-2)" }}
          onMouseLeave={(e) => { if (canContinue) e.currentTarget.style.background = "var(--pc-accent)" }}
        >
          Continue
          <Icon name="arrow-right" size={14} />
        </button>
      </div>
    </div>
  )
}

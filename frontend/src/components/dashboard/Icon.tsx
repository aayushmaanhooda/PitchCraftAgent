import type { CSSProperties } from "react"

type IconName =
  | "plus"
  | "upload"
  | "doc"
  | "trash"
  | "logout"
  | "check"
  | "download"
  | "eye"
  | "send"
  | "sparkle"
  | "excel"
  | "ppt"
  | "both"
  | "arrow-right"
  | "arrow-left"
  | "x"
  | "file"
  | "chevron-down"
  | "logo"

type Props = {
  name: IconName
  size?: number
  strokeWidth?: number
  style?: CSSProperties
  className?: string
}

export function Icon({ name, size = 16, strokeWidth = 1.6, style, className }: Props) {
  const s: CSSProperties = {
    width: size,
    height: size,
    display: "inline-block",
    verticalAlign: "middle",
    flexShrink: 0,
    ...style,
  }
  const common = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: s,
    className,
  }

  switch (name) {
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
    case "upload":
      return (
        <svg {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
      )
    case "doc":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      )
    case "trash":
      return (
        <svg {...common}>
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      )
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5M21 12H9" />
        </svg>
      )
    case "check":
      return <svg {...common}><path d="M20 6L9 17l-5-5" /></svg>
    case "download":
      return (
        <svg {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
      )
    case "eye":
      return (
        <svg {...common}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case "send":
      return (
        <svg {...common}>
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      )
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M12 3l2.09 5.26L19.5 10l-5.41 1.74L12 17l-2.09-5.26L4.5 10l5.41-1.74z" />
          <path d="M19 17l.9 2.1L22 20l-2.1.9L19 23l-.9-2.1L16 20l2.1-.9z" strokeWidth={1.3} />
        </svg>
      )
    case "excel":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
        </svg>
      )
    case "ppt":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="14" rx="2" />
          <path d="M7 21h10M12 17v4" />
          <path d="M7 8h7M7 12h5" />
        </svg>
      )
    case "both":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="12" height="12" rx="2" />
          <rect x="9" y="9" width="12" height="12" rx="2" fill="var(--pc-bg)" />
        </svg>
      )
    case "arrow-right":
      return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7" /></svg>
    case "arrow-left":
      return <svg {...common}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
    case "x":
      return <svg {...common}><path d="M18 6L6 18M6 6l12 12" /></svg>
    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      )
    case "chevron-down":
      return <svg {...common}><path d="M6 9l6 6 6-6" /></svg>
    case "logo":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={s}
          className={className}
        >
          <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M7 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
        </svg>
      )
    default:
      return null
  }
}

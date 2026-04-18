import { useAuth } from "@/context/AuthContext"

export default function DashboardHome() {
  const { user } = useAuth()
  return (
    <div
      style={{
        flex: 1,
        padding: "64px 40px",
        color: "var(--pc-text)",
        overflow: "auto",
      }}
    >
      <h1 style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-0.02em" }}>
        Hello,{" "}
        <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400 }}>
          {user?.username}
        </span>
      </h1>
      <p style={{ marginTop: 16, color: "var(--pc-text-2)", fontSize: 15 }}>
        Select a project from the sidebar, or create a new one to get started.
      </p>
    </div>
  )
}

import { useState, type CSSProperties } from "react"
import { NavLink, useNavigate } from "react-router-dom"

import { NewProjectDialog } from "@/components/dashboard/NewProjectDialog"
import { Icon } from "@/components/dashboard/Icon"
import { useProjects } from "@/context/ProjectContext"
import { useAuth } from "@/context/AuthContext"

const styles: Record<string, CSSProperties> = {
  root: {
    width: 240,
    borderRight: "1px solid var(--pc-border)",
    background: "var(--pc-panel)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    height: "100%",
  },
  header: {
    height: 56,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 18px",
    borderBottom: "1px solid var(--pc-border)",
  },
  logoText: { fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em", color: "var(--pc-text)" },
  body: { flex: 1, overflow: "auto", padding: 12 },
  newBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "9px 12px",
    background: "var(--pc-card)",
    border: "1px solid var(--pc-border-strong)",
    borderRadius: 8,
    color: "var(--pc-text)",
    fontSize: 13,
    fontWeight: 500,
    transition: "background 140ms",
    cursor: "pointer",
  },
  section: {
    marginTop: 18,
    padding: "0 8px 6px",
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: "var(--pc-text-3)",
    textTransform: "uppercase",
  },
  footer: {
    padding: 12,
    borderTop: "1px solid var(--pc-border)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #3b3b40, #1e1e22)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--pc-text)",
    border: "1px solid var(--pc-border-strong)",
  },
  userBox: { flex: 1, minWidth: 0 },
  userName: {
    fontSize: 12.5,
    fontWeight: 500,
    color: "var(--pc-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userEmail: {
    fontSize: 11,
    color: "var(--pc-text-3)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  logoutBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--pc-text-3)",
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
  },
}

function itemStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    background: active ? "rgba(255,255,255,0.055)" : "transparent",
    color: active ? "var(--pc-text)" : "var(--pc-text-2)",
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    textAlign: "left",
    marginBottom: 2,
    cursor: "pointer",
    border: "1px solid transparent",
    transition: "background 120ms",
    textDecoration: "none",
  }
}

export function Sidebar() {
  const { projects } = useProjects()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate("/")
  }

  const initial = (user?.username ?? "U").charAt(0).toUpperCase()

  return (
    <aside style={styles.root}>
      <div style={styles.header}>
        <span style={{ color: "var(--pc-text)" }}><Icon name="logo" size={18} /></span>
        <span style={styles.logoText}>PitchCraft</span>
      </div>

      <div style={styles.body}>
        <button
          type="button"
          style={styles.newBtn}
          onClick={() => setDialogOpen(true)}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--pc-card-2)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--pc-card)" }}
        >
          <Icon name="plus" size={14} />
          New project
        </button>

        <div style={styles.section}>Your customers</div>
        {projects.length === 0 ? (
          <div style={{ padding: "20px 10px", textAlign: "center", color: "var(--pc-text-3)", fontSize: 12 }}>
            No customers yet
          </div>
        ) : (
          projects.map((p) => (
            <NavLink
              key={p.id}
              to={`/dashboard/projects/${p.id}`}
              style={({ isActive }) => itemStyle(isActive)}
            >
              {({ isActive }) => (
                <>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: isActive ? "var(--pc-accent-2)" : "var(--pc-text-3)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.customer_name}
                  </span>
                </>
              )}
            </NavLink>
          ))
        )}
      </div>

      <div style={styles.footer}>
        <div style={styles.avatar}>{initial}</div>
        <div style={styles.userBox}>
          <div style={styles.userName}>{user?.username}</div>
          <div style={styles.userEmail}>{user?.email}</div>
        </div>
        <button
          type="button"
          style={styles.logoutBtn}
          title="Sign out"
          onClick={handleLogout}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)"
            e.currentTarget.style.color = "var(--pc-text)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = "var(--pc-text-3)"
          }}
        >
          <Icon name="logout" size={14} />
        </button>
      </div>

      <NewProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </aside>
  )
}

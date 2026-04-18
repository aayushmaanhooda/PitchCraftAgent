import { Outlet } from "react-router-dom"

import { Sidebar } from "@/components/dashboard/Sidebar"

export function DashboardLayout() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: "var(--pc-bg)",
        color: "var(--pc-text)",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}

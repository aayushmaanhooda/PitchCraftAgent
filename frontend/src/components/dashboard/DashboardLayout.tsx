import { Outlet } from "react-router-dom"

import { Navbar } from "@/components/Navbar"
import { Sidebar } from "@/components/dashboard/Sidebar"

export function DashboardLayout() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

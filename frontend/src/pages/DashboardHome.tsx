import { useAuth } from "@/context/AuthContext"

export default function DashboardHome() {
  const { user } = useAuth()
  return (
    <div className="h-full overflow-y-auto px-6 md:px-10 py-10 md:py-16">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight">
        Hello,{" "}
        <span className="font-serif italic font-normal">{user?.username}</span>
      </h1>
      <p className="mt-4 text-muted-foreground text-base md:text-lg">
        Select a project from the sidebar, or create a new one to get started.
      </p>
    </div>
  )
}

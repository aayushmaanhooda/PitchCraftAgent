import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Logo } from "./Logo"
import { useAuth } from "@/context/AuthContext"

export function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="flex items-center justify-between px-4 sm:px-8 md:px-28 py-4 gap-4">
      <div className="flex items-center gap-6 sm:gap-12 md:gap-20 min-w-0">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 shrink-0">
          <Logo />
          <span className="text-lg sm:text-xl font-bold tracking-tight">
            PitchCraft
          </span>
        </Link>
        {!user && (
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <a
              href="#contact"
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact us
            </a>
          </div>
        )}
      </div>

      {!user && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/login")}
          >
            Log In
          </Button>
          <Button size="sm" onClick={() => navigate("/signup")}>
            Sign Up
          </Button>
        </div>
      )}
    </nav>
  )
}

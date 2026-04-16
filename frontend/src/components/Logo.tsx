export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="6" width="18" height="13" rx="2" fill="white" />
      <rect
        x="10"
        y="13"
        width="18"
        height="13"
        rx="2"
        fill="white"
        fillOpacity="0.55"
      />
    </svg>
  )
}

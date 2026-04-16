import { useRef, useState, type ChangeEvent } from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"

export function UploadPdfButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleClick = () => inputRef.current?.click()

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setFileName(file.name)
    e.target.value = ""
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={handleClick}>
        <Upload /> Upload PDF
      </Button>
      {fileName && (
        <span className="truncate text-sm text-muted-foreground">
          {fileName}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

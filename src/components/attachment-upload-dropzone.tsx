'use client'

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { FileText, Loader2, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ALLOWED_FORM_ATTACHMENT_TYPES,
  MAX_FORM_ATTACHMENT_FILES,
  MAX_FORM_ATTACHMENT_SIZE_BYTES,
  formatFileSize,
} from '@/lib/form-attachment'

type AttachmentUploadDropzoneProps = {
  files: File[]
  error?: string | null
  disabled?: boolean
  busy?: boolean
  maxFiles?: number
  onFilesAdded: (files: File[]) => void
  onRemoveFile: (index: number) => void
  className?: string
  idleTitle?: string
  busyTitle?: string
}

export function AttachmentUploadDropzone({
  files,
  error,
  disabled = false,
  busy = false,
  maxFiles = MAX_FORM_ATTACHMENT_FILES,
  onFilesAdded,
  onRemoveFile,
  className,
  idleTitle = 'Drop files here, or click to choose',
  busyTitle = 'Submitting attachments...',
}: AttachmentUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const isDisabled = disabled || busy

  const addFiles = (incomingFiles: File[]) => {
    if (isDisabled || incomingFiles.length === 0) return
    onFilesAdded(incomingFiles)
    if (inputRef.current) inputRef.current.value = ''
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []))
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    addFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onDrop={onDrop}
        onDragOver={(event) => {
          event.preventDefault()
          if (!isDisabled) setIsDragOver(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragOver(false)
        }}
        onClick={() => {
          if (!isDisabled) inputRef.current?.click()
        }}
        onKeyDown={(event) => {
          if (!isDisabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={cn(
          'flex min-h-28 cursor-pointer items-center justify-between gap-4 rounded-lg border border-dashed bg-muted/10 px-5 py-4 transition-colors duration-200',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/40 hover:bg-muted/20',
          isDisabled && 'cursor-default opacity-70',
          className,
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={Object.keys(ALLOWED_FORM_ATTACHMENT_TYPES).join(',')}
          className="hidden"
          onChange={onInputChange}
          disabled={isDisabled}
        />
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {busy ? busyTitle : idleTitle}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {busy && files.length > 0
                ? `Processing ${files.length} file${files.length === 1 ? '' : 's'}`
                : `Up to ${maxFiles} files, ${formatFileSize(MAX_FORM_ATTACHMENT_SIZE_BYTES)} each`}
            </p>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium text-muted-foreground sm:flex">
          <Upload className="h-3.5 w-3.5" />
          Upload
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {files.length} file{files.length === 1 ? '' : 's'} ready
          </p>
          <div className="flex flex-wrap gap-1.5">
            {files.map((file, index) => (
              <span
                key={`${file.name}-${file.lastModified}-${file.size}-${index}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/40 py-1 pl-2 pr-1 text-xs"
              >
                <span className="max-w-[180px] truncate">{file.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                {!isDisabled && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

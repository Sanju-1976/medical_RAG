'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, Image, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

type UploadState = 'idle' | 'uploading' | 'embedding' | 'success' | 'error'

const ACCEPTED_MIME = 'application/pdf,image/jpeg,image/jpg,image/png,image/webp'
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']

function isAccepted(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.type.startsWith('image/')
  )
}

function fileIcon(file: File) {
  if (file.type === 'application/pdf') return <FileText size={24} className="text-green-600" />
  return <Image size={24} className="text-green-600" />
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const router = useRouter()
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFile = (f: File) => {
    if (!isAccepted(f)) {
      setErrorMsg('Only PDF, JPG, PNG, and WEBP files are supported.')
      return
    }
    setFile(f)
    setErrorMsg('')
    setUploadState('idle')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploadState('uploading')
    setProgress(20)

    try {
      const formData = new FormData()
      formData.append('file', file)

      setProgress(40)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })

      // For images, OCR takes a moment — show the embedding state earlier
      setProgress(70)
      setUploadState('embedding')

      const data = await res.json()
      setProgress(100)

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Upload failed')
        setUploadState('error')
        return
      }

      setUploadState('success')
      setTimeout(() => {
        onClose()
        router.push(`/chat/${data.sessionId}`)
      }, 1200)
    } catch {
      setErrorMsg('Network error. Please try again.')
      setUploadState('error')
    }
  }

  const isImage = file && file.type.startsWith('image/')

  const embeddingLabel = isImage
    ? 'Reading image with AI vision…'
    : 'Generating embeddings…'

  const stateLabel: Record<UploadState, string> = {
    idle: 'Upload Report',
    uploading: 'Uploading file…',
    embedding: embeddingLabel,
    success: 'Ready! Opening chat…',
    error: 'Try Again',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Medical Report</h2>
            <p className="text-sm text-gray-500 mt-0.5">PDF or image (JPG, PNG) · Max 20 MB</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all',
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : file
              ? 'border-green-400 bg-green-50'
              : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_MIME}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {file ? (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                {fileIcon(file)}
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900 text-sm truncate max-w-[220px]">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                  {isImage && (
                    <span className="ml-2 text-blue-600 font-medium">· AI vision OCR</span>
                  )}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Upload size={24} className="text-blue-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-700 text-sm">Drop your report here</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, or WEBP</p>
              </div>
            </>
          )}
        </div>

        {/* Supported formats hint */}
        <div className="flex items-center justify-center gap-4 -mt-2">
          {[
            { icon: <FileText size={13} />, label: 'PDF' },
            { icon: <Image size={13} />, label: 'JPG' },
            { icon: <Image size={13} />, label: 'PNG' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-1 text-xs text-gray-400">
              {icon}
              {label}
            </div>
          ))}
        </div>

        {/* Progress / Status */}
        {uploadState !== 'idle' && uploadState !== 'error' && (
          <div className="flex flex-col gap-2">
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              {uploadState === 'success' ? (
                <CheckCircle size={14} className="text-green-600" />
              ) : (
                <Loader2 size={14} className="text-blue-600 animate-spin" />
              )}
              <span className={uploadState === 'success' ? 'text-green-700' : 'text-blue-700'}>
                {stateLabel[uploadState]}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploadState === 'uploading' || uploadState === 'embedding' || uploadState === 'success'}
          className={cn(
            'w-full py-3 rounded-xl font-semibold text-sm transition-all',
            file && uploadState === 'idle'
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          {stateLabel[uploadState]}
        </button>

        <p className="text-center text-xs text-gray-400">
          Your report is processed securely and never shared.
        </p>
      </div>
    </div>
  )
}

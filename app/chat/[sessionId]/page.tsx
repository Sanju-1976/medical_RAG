'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ChatCanvas } from '@/components/ChatCanvas'
import { DocumentOverview } from '@/components/DocumentOverview'
import { UploadModal } from '@/components/UploadModal'
import { ShieldCheck, User, Menu } from 'lucide-react'

interface Session {
  id: string
  title: string
  created_at: string
  document?: { id: string; name: string; file_size?: number; lab_name?: string }
}

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default function ChatSessionPage({ params }: PageProps) {
  const { sessionId } = use(params)
  const [session, setSession] = useState<Session | null>(null)
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load all sessions for sidebar
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllSessions(data)
          // Find current session
          const current = data.find((s: Session) => s.id === sessionId)
          if (current) setSession(current)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [sessionId])

  const document = session?.document

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sessions={allSessions} onUploadClick={() => setShowUpload(true)} />

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <header className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 hover:bg-gray-100 rounded-xl">
              <Menu size={20} />
            </button>
            <h1 className="font-semibold text-[#00478d] text-lg">
              {loading ? 'Loading…' : (session?.title ?? 'Medical Assistant')}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
              <ShieldCheck size={14} className="text-green-600" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                HIPAA Compliant
              </span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors p-1.5 rounded-xl pr-3">
              <User size={18} className="text-[#00478d]" />
              <span className="hidden sm:inline text-sm font-medium">Dr. James Wilson</span>
            </div>
          </div>
        </header>

        {/* Chat area */}
        {!loading && document && (
          <ChatCanvas
            sessionId={sessionId}
            documentId={document.id}
            documentName={document.name}
            onUploadClick={() => setShowUpload(true)}
          />
        )}

        {!loading && !document && (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Session not found. <a href="/chat" className="ml-2 text-[#00478d] underline">Start a new chat →</a>
          </div>
        )}
      </main>

      {/* Right panel */}
      <DocumentOverview document={document} />

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  )
}

'use client'

import { useEffect, useState, use } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ChatCanvas } from '@/components/ChatCanvas'
import { DocumentOverview } from '@/components/DocumentOverview'
import { UploadModal } from '@/components/UploadModal'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ShieldCheck, User, Menu, LogOut } from 'lucide-react'

interface Session {
  id: string
  title: string
  created_at: string
  document?: { id: string; name: string; file_size?: number; lab_name?: string; metadata?: any }
}

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default function ChatSessionPage({ params }: PageProps) {
  const { sessionId } = use(params)
  const router = useRouter()
  const supabase = createBrowserClient()
  
  const [session, setSession] = useState<Session | null>(null)
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!currentSession) {
        router.push('/login')
        return
      }

      setUserEmail(currentSession.user.email ?? 'User')

      // Load all sessions for sidebar
      fetch('/api/sessions', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      })
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
    })
  }, [sessionId, router, supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
            
            {document?.metadata?.doctor_name && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 rounded-xl border border-blue-100/50 text-[#00478d]">
                <User size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Physician: {document.metadata.doctor_name}
                </span>
              </div>
            )}

            {userEmail && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSignOut}
                  className="p-1.5 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-xl transition-all"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
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

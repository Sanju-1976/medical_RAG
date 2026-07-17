'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { DocumentOverview } from '@/components/DocumentOverview'
import { UploadModal } from '@/components/UploadModal'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Bot, ShieldCheck, User, Upload, Menu, LogOut } from 'lucide-react'

interface Session {
  id: string
  title: string
  created_at: string
  document?: { id: string; name: string; file_size?: number }
}

export default function ChatHomePage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [sessions, setSessions] = useState<Session[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }

      setUserEmail(session.user.email ?? 'User')

      // Fetch sessions with auth header
      fetch('/api/sessions', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setSessions(data))
        .catch(console.error)
    })
  }, [router, supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sessions={sessions} onUploadClick={() => setShowUpload(true)} />

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <header className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 hover:bg-gray-100 rounded-xl">
              <Menu size={20} />
            </button>
            <h1 className="font-semibold text-[#00478d] text-lg">Medical Assistant</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
              <ShieldCheck size={14} className="text-green-600" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                HIPAA Compliant
              </span>
            </div>
            
            {userEmail && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700">
                  <User size={14} className="text-[#00478d]" />
                  <span className="text-xs font-semibold">{userEmail}</span>
                </div>
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

        {/* Welcome / empty state */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center">
          <div className="w-20 h-20 bg-[#00478d]/10 rounded-3xl flex items-center justify-center">
            <Bot size={40} className="text-[#00478d]" />
          </div>
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-gray-900">Welcome to Clinical Clarity</h2>
            <p className="text-gray-500 mt-2 leading-relaxed">
              Upload a medical report to start an AI-powered conversation. I'll help you understand
              lab results, identify flags, and answer any questions about your health data.
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#00478d] text-white font-semibold rounded-2xl hover:bg-[#005eb8] transition-all shadow-lg shadow-[#00478d]/20 active:scale-[0.98]"
          >
            <Upload size={18} />
            Upload Your Report
          </button>

          {sessions.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400">or continue a recent conversation from the sidebar</p>
            </div>
          )}

          {/* Feature chips */}
          <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {[
              '🩸 Blood Reports', '💊 Medication Interactions',
              '🧬 Genetic Markers', '📊 Trend Analysis',
              '🫀 Cardiac Biomarkers', '🧪 Pathology Reports',
            ].map((f) => (
              <span key={f} className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 shadow-sm">
                {f}
              </span>
            ))}
          </div>
        </div>
      </main>

      <DocumentOverview />

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  )
}

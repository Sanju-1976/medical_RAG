'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  History,
  Bookmark,
  Settings,
  HelpCircle,
  Stethoscope,
  PlusCircle,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Session {
  id: string
  title: string
  created_at: string
  document?: { name: string }
}

interface SidebarProps {
  sessions?: Session[]
  onUploadClick: () => void
}

export function Sidebar({ sessions = [], onUploadClick }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col h-full w-72 bg-[#f2f4f6] border-r border-[#c2c6d4] p-4 gap-2 z-20 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 py-4 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#00478d] flex items-center justify-center text-white shadow-sm">
          <Stethoscope size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-[#00478d] leading-tight">Clinical Clarity</h2>
          <p className="text-xs text-gray-500">Medical AI Assistant</p>
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={onUploadClick}
        className="w-full py-3 px-4 bg-[#00478d] text-white font-semibold rounded-xl mb-2 hover:bg-[#005eb8] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
      >
        <Upload size={16} />
        Upload Report
      </button>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
        <SidebarItem
          href="/chat"
          icon={<PlusCircle size={18} />}
          label="New Chat"
          active={pathname === '/chat'}
        />

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-3 mt-3 mb-1">
              Recent Chats
            </p>
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/chat/${s.id}`}
                className={cn(
                  'flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all text-sm',
                  pathname === `/chat/${s.id}`
                    ? 'bg-[#005eb8]/10 text-[#00478d] font-medium'
                    : 'text-gray-600 hover:bg-gray-200'
                )}
              >
                <FileText size={16} className="flex-shrink-0" />
                <span className="truncate">{s.title ?? s.document?.name ?? 'Untitled'}</span>
              </Link>
            ))}
          </>
        )}

        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-3 mt-3 mb-1">
          Library
        </p>
        <SidebarItem icon={<History size={18} />} label="Medical History" href="#" />
        <SidebarItem icon={<Bookmark size={18} />} label="Saved Insights" href="#" />
      </nav>

      {/* Footer */}
      <div className="pt-3 border-t border-[#c2c6d4] flex flex-col gap-1">
        <SidebarItem icon={<Settings size={18} />} label="Settings" href="#" />
        <SidebarItem icon={<HelpCircle size={18} />} label="Support" href="#" />
      </div>
    </aside>
  )
}

function SidebarItem({
  icon,
  label,
  href,
  active,
}: {
  icon: React.ReactNode
  label: string
  href: string
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all text-sm',
        active
          ? 'bg-[#005eb8]/10 text-[#00478d] font-medium'
          : 'text-gray-600 hover:bg-gray-200'
      )}
    >
      {icon}
      {label}
    </Link>
  )
}

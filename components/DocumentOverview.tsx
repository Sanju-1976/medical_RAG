'use client'

import {
  FileText,
  ExternalLink,
  ShieldCheck,
  FlaskConical,
  AlertTriangle,
  Link2,
} from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface DocumentOverviewProps {
  document?: {
    id: string
    name: string
    file_size?: number
    lab_name?: string
  }
}

const REFERENCES = [
  { label: 'AHA Guidelines 2023', href: 'https://www.heart.org/en/health-topics/cholesterol/cholesterol-tools-and-resources' },
  { label: 'Managing LDL through Diet', href: 'https://www.ncbi.nlm.nih.gov/books/NBK459368/' },
  { label: 'Understanding Blood Reports', href: 'https://medlineplus.gov/lab-tests/' },
]

export function DocumentOverview({ document }: DocumentOverviewProps) {
  return (
    <aside className="hidden xl:flex flex-col w-96 h-full bg-white border-l border-gray-200 p-6 gap-6 overflow-y-auto flex-shrink-0">
      <h3 className="font-semibold text-gray-900 text-base">Document Overview</h3>

      {document ? (
        <>
          {/* Document Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00478d]/10 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-[#00478d]" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm truncate max-w-[160px]">
                    {document.name}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                    Blood Work{document.file_size ? ` · ${formatFileSize(document.file_size)}` : ''}
                  </p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-[#00478d] transition-colors p-1">
                <ExternalLink size={15} />
              </button>
            </div>

            {/* Preview placeholder */}
            <div className="h-36 w-full bg-gradient-to-br from-[#00478d]/5 to-[#006a61]/5 rounded-xl overflow-hidden flex items-center justify-center border border-dashed border-gray-200">
              <div className="text-center text-gray-400">
                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">PDF Preview</p>
              </div>
            </div>
          </div>

          {/* Stats Bento Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Status</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-700">Flagged Values</span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Lab</p>
              <p className="text-sm font-medium text-gray-700">{document.lab_name ?? 'City Diagnostics'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl col-span-2 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-[#006a61]" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  AI Risk Assessment
                </p>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1">
                <div className="bg-[#006a61] h-full rounded-full w-[15%] transition-all duration-1000" />
              </div>
              <p className="text-[10px] font-semibold text-[#006a61] mt-1.5 uppercase tracking-wider">
                Low probability of acute concern
              </p>
            </div>
          </div>

          {/* Key Indicators */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <FlaskConical size={12} />
              Key Indicators
            </h4>
            <IndicatorRow label="Total Cholesterol" value="215 mg/dL" status="borderline" />
            <IndicatorRow label="LDL (Bad)" value="142 mg/dL" status="high" />
            <IndicatorRow label="HDL (Good)" value="58 mg/dL" status="normal" />
            <IndicatorRow label="Triglycerides" value="145 mg/dL" status="normal" />
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
            <FileText size={28} className="text-gray-300" />
          </div>
          <div>
            <p className="font-medium text-gray-600 text-sm">No report loaded</p>
            <p className="text-xs text-gray-400 mt-1">Upload a medical PDF to see document analysis here</p>
          </div>
        </div>
      )}

      {/* Medical References */}
      <div className="flex flex-col gap-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
          <Link2 size={12} />
          Medical References
        </h4>
        {REFERENCES.map((ref) => (
          <a
            key={ref.label}
            href={ref.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-[#00478d]/20 transition-all group"
          >
            <span className="text-sm text-gray-700 group-hover:text-[#00478d]">{ref.label}</span>
            <ExternalLink size={13} className="text-gray-300 group-hover:text-[#00478d]" />
          </a>
        ))}
      </div>
    </aside>
  )
}

function IndicatorRow({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status: 'normal' | 'borderline' | 'high'
}) {
  const config: Record<string, { color: string; label: string; icon?: boolean }> = {
    normal: { color: 'bg-green-100 text-green-700', label: 'Normal' },
    borderline: { color: 'bg-amber-100 text-amber-700', label: 'Borderline', icon: true },
    high: { color: 'bg-red-100 text-red-700', label: 'Elevated', icon: true },
  }
  const c = config[status]

  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="font-mono font-semibold text-gray-900 text-sm mt-0.5">{value}</p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1 ${c.color}`}>
        {c.icon && <AlertTriangle size={10} />}
        {c.label}
      </span>
    </div>
  )
}

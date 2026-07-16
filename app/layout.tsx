import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Clinical Clarity | Medical AI Assistant',
  description:
    'Upload your medical reports and get clear, AI-powered explanations grounded in your actual data.',
  keywords: ['medical AI', 'blood report', 'lab results', 'clinical assistant', 'health AI'],
  openGraph: {
    title: 'Clinical Clarity',
    description: 'AI-powered medical report analysis',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-[#f7f9fb] text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}

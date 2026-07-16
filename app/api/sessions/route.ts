import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/sessions — list all sessions with document info
export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('chat_sessions')
    .select(`
      id,
      title,
      created_at,
      document:documents(id, name, file_size)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/sessions — create a new blank session for an existing document
export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { documentId, title } = await request.json()

  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ document_id: documentId, title: title ?? 'New Chat' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

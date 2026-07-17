import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

// GET /api/sessions — list all sessions for the logged-in user
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('chat_sessions')
    .select(`
      id,
      title,
      created_at,
      document:documents(id, name, file_size, lab_name, report_date, metadata)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/sessions — create a new blank session for an existing document
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { documentId, title } = await request.json()

  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ 
      document_id: documentId, 
      title: title ?? 'New Chat',
      user_id: user.id 
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

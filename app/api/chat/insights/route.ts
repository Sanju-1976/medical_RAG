import { NextRequest, NextResponse } from 'next/server'
import { searchDocumentChunks, buildContext } from '@/lib/rag'
import { getHFAnswer } from '@/lib/hf'
import { getAuthUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export const maxDuration = 30

/**
 * POST /api/chat/insights
 *
 * Calls the HuggingFace Qwen2.5-1.5B model with the same RAG context.
 * Body: { question: string, documentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { question, documentId } = body

    if (!question || !documentId) {
      return NextResponse.json(
        { error: 'question and documentId are required' },
        { status: 400 }
      )
    }

    // Verify document ownership
    const supabase = createServerClient()
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !docData) {
      return NextResponse.json({ error: 'Forbidden or document not found' }, { status: 403 })
    }

    // Retrieve the same relevant chunks as the main chat
    const relevantChunks = await searchDocumentChunks(documentId, question)
    const context = buildContext(relevantChunks)

    // Get answer from HuggingFace Qwen2.5-1.5B
    const answer = await getHFAnswer(question, context)

    if (!answer) {
      return NextResponse.json(
        { error: 'HF_TOKEN not configured or HuggingFace API unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      answer,
      model: 'Qwen/Qwen2.5-1.5B-Instruct',
      chunksUsed: relevantChunks.length,
    })
  } catch (err) {
    console.error('Insights error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

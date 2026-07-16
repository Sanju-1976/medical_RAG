import { NextRequest, NextResponse } from 'next/server'
import { searchDocumentChunks, buildContext } from '@/lib/rag'
import { getHFAnswer } from '@/lib/hf'

export const maxDuration = 30

/**
 * POST /api/chat/insights
 *
 * Calls the HuggingFace Qwen2.5-1.5B model with the same RAG context
 * as the main Groq chat. Returns a short, plain-language answer as JSON.
 *
 * Body: { question: string, documentId: string }
 * Response: { answer: string, model: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, documentId } = body

    if (!question || !documentId) {
      return NextResponse.json(
        { error: 'question and documentId are required' },
        { status: 400 }
      )
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

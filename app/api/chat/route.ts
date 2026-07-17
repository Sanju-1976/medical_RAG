import { NextRequest, NextResponse } from 'next/server'
import { searchDocumentChunks, buildContext, persistMessages } from '@/lib/rag'
import { streamHFResponse, ChatMessage } from '@/lib/hf'
import { getAuthUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { question, documentId, sessionId, history = [] } = body

    if (!question || !documentId || !sessionId) {
      return NextResponse.json(
        { error: 'question, documentId, and sessionId are required' },
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

    // 1. Similarity search — retrieve relevant chunks from the document
    const relevantChunks = await searchDocumentChunks(documentId, question)

    // 2. Build context string from retrieved chunks
    const context = buildContext(relevantChunks)

    // 3. Format chat history
    const hfHistory: ChatMessage[] = history.map(
      (msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    )

    // 4. Stream response from HuggingFace Qwen2.5-1.5B
    const stream = await streamHFResponse(question, context, hfHistory)

    // 5. Tee: client stream + persistence stream
    const [clientStream, persistStream] = stream.tee()

    // Persist asynchronously
    ;(async () => {
      const decoder = new TextDecoder()
      let fullResponse = ''
      const reader = persistStream.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullResponse += decoder.decode(value, { stream: true })
      }
      await persistMessages(sessionId, question, fullResponse, relevantChunks)
    })()

    // 6. Sources metadata in header (ASCII-safe)
    const sourcesMeta = relevantChunks.slice(0, 3).map((c) => ({
      content: c.content
        .slice(0, 200)
        .replace(/[^\x00-\x7F]/g, (ch) => {
          const map: Record<string, string> = {
            '\u2013': '-', '\u2014': '-', '\u2018': "'", '\u2019': "'",
            '\u201C': '"', '\u201D': '"', '\u2026': '...',
          }
          return map[ch] ?? ' '
        }),
      similarity: c.similarity,
    }))

    return new Response(clientStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Sources': encodeURIComponent(JSON.stringify(sourcesMeta)),
        'X-Model': 'Qwen/Qwen2.5-1.5B-Instruct',
      },
    })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { createServerClient } from './supabase/server'
import { embedText } from './embeddings'

export interface RelevantChunk {
  id: string
  content: string
  chunkIndex: number
  pageNumber: number
  similarity: number
}

/**
 * Search for the most relevant chunks in a document for a given query.
 *
 * Threshold is intentionally low (0.15) because all-MiniLM-L6-v2
 * produces cosine similarity scores in the 0.1–0.6 range for medical text,
 * much lower than OpenAI embeddings which score 0.7–0.9.
 *
 * Falls back to top-N chunks by similarity if none pass the threshold.
 */
export async function searchDocumentChunks(
  documentId: string,
  query: string,
  matchCount = 6,
  matchThreshold = 0.15
): Promise<RelevantChunk[]> {
  const supabase = createServerClient()
  const queryEmbedding = await embedText(query)

  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_document_id: documentId,
    match_count: matchCount,
    match_threshold: matchThreshold,
  })

  if (error) {
    console.error('Vector search error:', error)
    // Fallback: return top chunks without threshold filter
    return await fallbackChunks(supabase, documentId, matchCount)
  }

  const chunks = (data ?? []) as RelevantChunk[]

  // If nothing passes threshold, fallback to top-N ordered by similarity
  if (chunks.length === 0) {
    console.warn('No chunks above threshold — using fallback top-N retrieval')
    return await fallbackChunks(supabase, documentId, matchCount)
  }

  return chunks
}

/**
 * Fallback: return the most recent N chunks for the document in chunk_index order.
 * Used when similarity search returns nothing (e.g., very short documents).
 */
async function fallbackChunks(
  supabase: ReturnType<typeof createServerClient>,
  documentId: string,
  matchCount: number
): Promise<RelevantChunk[]> {
  const { data } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index, page_number')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true })
    .limit(matchCount)

  return (data ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    chunkIndex: row.chunk_index,
    pageNumber: row.page_number,
    similarity: 0,
  }))
}

/**
 * Format retrieved chunks into a structured context string for the LLM.
 * Preserves document order (sorted by chunk_index) for coherent reading.
 */
export function buildContext(chunks: RelevantChunk[]): string {
  if (chunks.length === 0) return ''

  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex)

  const header = `The following are excerpts from the patient's medical report (${sorted.length} sections retrieved):\n`
  const body = sorted
    .map((c, i) => {
      const label = c.similarity > 0
        ? `[Section ${i + 1} | relevance: ${Math.round(c.similarity * 100)}%]`
        : `[Section ${i + 1}]`
      return `${label}\n${c.content}`
    })
    .join('\n\n---\n\n')

  return header + '\n' + body
}

/**
 * Persist both the user message and AI response to chat_messages.
 */
export async function persistMessages(
  sessionId: string,
  userContent: string,
  assistantContent: string,
  sources: RelevantChunk[]
) {
  const supabase = createServerClient()

  const { error } = await supabase.from('chat_messages').insert([
    { session_id: sessionId, role: 'user', content: userContent },
    {
      session_id: sessionId,
      role: 'assistant',
      content: assistantContent,
      sources: sources.map((s) => ({
        content: s.content.slice(0, 300),
        chunkIndex: s.chunkIndex,
        similarity: s.similarity,
      })),
    },
  ])

  if (error) console.error('Error persisting messages:', error)
}

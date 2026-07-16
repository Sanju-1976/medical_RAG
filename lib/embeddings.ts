/**
 * Serverless-compatible embedding utility using the Hugging Face OpenAI-compatible Router API.
 *
 * Endpoint: https://router.huggingface.co/v1/embeddings
 * Model: sentence-transformers/all-MiniLM-L6-v2
 *   - 384-dimensional output (matches vector(384) in DB schema)
 *   - High availability router endpoint (resolves via router.huggingface.co)
 *   - Uses HF_TOKEN from environment variables
 */

const HF_ROUTER_URL = 'https://router.huggingface.co/v1/embeddings'
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

interface EmbeddingItem {
  embedding: number[]
  index: number
}

interface OpenAIEmbeddingResponse {
  data: EmbeddingItem[]
}

/**
 * Generate a 384-dim embedding for a single text string.
 */
export async function embedText(text: string): Promise<number[]> {
  const token = process.env.HF_TOKEN
  if (!token) {
    throw new Error('HF_TOKEN environment variable is required for embeddings')
  }

  const response = await fetch(HF_ROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.trim(),
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Hugging Face embedding error (${response.status}): ${errText}`)
  }

  const result = (await response.json()) as OpenAIEmbeddingResponse
  if (result.data && result.data[0]?.embedding) {
    return result.data[0].embedding
  }
  throw new Error('Unexpected embedding response format from Hugging Face Router')
}

/**
 * Embed multiple texts in batch using the Hugging Face Router API.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const token = process.env.HF_TOKEN
  if (!token) {
    throw new Error('HF_TOKEN environment variable is required for embeddings')
  }

  const response = await fetch(HF_ROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts.map((t) => t.trim()),
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Hugging Face batch embedding error (${response.status}): ${errText}`)
  }

  const result = (await response.json()) as OpenAIEmbeddingResponse
  if (result.data && Array.isArray(result.data)) {
    // Sort by index to maintain original order
    return result.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding)
  }
  throw new Error('Unexpected batch embedding response format from Hugging Face Router')
}

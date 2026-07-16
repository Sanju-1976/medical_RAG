/**
 * Serverless-compatible embedding utility using the Hugging Face Router Inference API.
 *
 * Endpoint: https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2
 * Model: sentence-transformers/all-MiniLM-L6-v2
 *   - 384-dimensional output (matches vector(384) in DB schema)
 *   - Fast API call, no local model files, zero native dependencies
 *   - Uses HF_TOKEN from environment variables
 */

const HF_API_URL = 'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2'

/**
 * Generate a 384-dim embedding for a single text string.
 */
export async function embedText(text: string): Promise<number[]> {
  const token = process.env.HF_TOKEN
  if (!token) {
    throw new Error('HF_TOKEN environment variable is required for embeddings')
  }

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text.trim() }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Hugging Face embedding error (${response.status}): ${errText}`)
  }

  const result = await response.json()
  // HF returns an array of numbers for a single text input
  if (Array.isArray(result)) {
    return result as number[]
  }
  throw new Error('Unexpected embedding response format from Hugging Face Router')
}

/**
 * Embed multiple texts in batch using the Hugging Face Router Inference API.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const token = process.env.HF_TOKEN
  if (!token) {
    throw new Error('HF_TOKEN environment variable is required for embeddings')
  }

  // Hugging Face supports batch input: {"inputs": ["text1", "text2"]}
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: texts.map((t) => t.trim()) }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Hugging Face batch embedding error (${response.status}): ${errText}`)
  }

  const result = await response.json()
  // HF returns a 2D array of numbers for batch inputs
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result as number[][]
  }
  throw new Error('Unexpected batch embedding response format from Hugging Face Router')
}

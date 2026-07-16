/**
 * Serverless-compatible embedding utility using the Hugging Face Router Inference API.
 *
 * Endpoint: https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5
 * Model: BAAI/bge-small-en-v1.5
 *   - 384-dimensional output (matches vector(384) in DB schema)
 *   - Defaults natively to the 'feature-extraction' task in Hugging Face
 *   - Extremely high quality embeddings, serverless-safe
 *   - Uses HF_TOKEN from environment variables
 */

const HF_API_URL = 'https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5'

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
  // HF returns a 2D array [ [0.1, 0.2, ...] ] for feature-extraction models even with a single input,
  // or a 1D array of numbers. Let's handle both structures safely.
  if (Array.isArray(result)) {
    if (Array.isArray(result[0])) {
      return result[0] as number[]
    }
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
  // HF returns a 3D array [ [ [0.1, ...], [0.2, ...] ] ] or 2D array [ [0.1, ...], [0.2, ...] ] depending on pooling.
  // We normalize the dimensions to return number[][]
  if (Array.isArray(result)) {
    // If it's a 3D array returned from raw token embeddings (e.g. shape [batch_size, seq_len, hidden_dim]),
    // we need to mean-pool or grab the CLS token [0] if pooling wasn't applied by the pipeline.
    // However, the feature-extraction pipeline usually returns the pooled 2D array or 3D array.
    // If 3D, we mean-pool the sequence dimension.
    if (Array.isArray(result[0]) && Array.isArray(result[0][0])) {
      return (result as number[][][]).map((item) => {
        // Mean pooling over tokens (sequence length dimension)
        const numTokens = item.length
        const dim = item[0].length
        const pooled = new Array(dim).fill(0)
        for (let t = 0; t < numTokens; t++) {
          for (let d = 0; d < dim; d++) {
            pooled[d] += item[t][d]
          }
        }
        return pooled.map((val) => val / numTokens)
      })
    }
    
    if (Array.isArray(result[0])) {
      return result as number[][]
    }
  }
  throw new Error('Unexpected batch embedding response format from Hugging Face Router')
}

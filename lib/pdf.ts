/**
 * Text extraction and chunking utilities.
 *
 * Supports:
 *  - PDF  → unpdf (Serverless-safe pure JS parser)
 *  - JPG/PNG → Groq llama-3.2-11b-vision OCR
 *
 * Chunking: ~500 tokens (~2000 chars) per chunk, ~50 token (~200 char) overlap.
 */

import Groq from 'groq-sdk'

export interface TextChunk {
  content: string
  chunkIndex: number
  pageNumber?: number
}

const CHUNK_CHARS = 2000
const OVERLAP_CHARS = 200

// ─── PDF Extraction (unpdf) ──────────────────────────────────

/**
 * Extract raw text from a PDF Buffer using unpdf (pure JS, Vercel-compatible).
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { getDocumentProxy, extractText } = await import('unpdf')
  
  // Load the document using the Uint8Array buffer data
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  // Pass mergePages: true to get the entire text as a single string
  const { text } = await extractText(pdf, { mergePages: true })
  
  return text || ''
}

// ─── Image OCR via Groq Vision ───────────────────────────────

let _groqClient: Groq | null = null

function getGroqClient(): Groq {
  if (!_groqClient) {
    _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _groqClient
}

/**
 * Extract all text from a JPG/PNG medical report image using
 * Groq's llama-3.2-11b-vision model.
 */
export async function extractImageText(
  buffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<string> {
  const base64 = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  const response = await getGroqClient().chat.completions.create({
    model: 'meta-llama/llama-3.2-11b-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: dataUrl },
          },
          {
            type: 'text',
            text: `You are a medical document OCR specialist. 
Extract ALL text from this medical report image exactly as it appears.
Preserve:
- Test names and their values
- Reference ranges
- Units (mg/dL, mmol/L, etc.)
- Patient info headers
- Doctor notes
- All numeric values

Output ONLY the extracted text, nothing else. Do not summarize or interpret.`,
          },
        ],
      },
    ],
    max_tokens: 4096,
    temperature: 0.1,
  })

  return response.choices[0]?.message?.content ?? ''
}

// ─── Chunking ─────────────────────────────────────────────────

/**
 * Split extracted text into overlapping chunks for embedding.
 */
export function chunkText(text: string): TextChunk[] {
  const chunks: TextChunk[] = []
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

  let start = 0
  let chunkIndex = 0

  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_CHARS, normalized.length)
    let content = normalized.slice(start, end)

    // Try to split at a natural boundary
    if (end < normalized.length) {
      const lastPara = content.lastIndexOf('\n\n')
      const lastSentence = content.lastIndexOf('. ')
      const splitAt =
        lastPara > CHUNK_CHARS * 0.5
          ? lastPara + 2
          : lastSentence > CHUNK_CHARS * 0.5
            ? lastSentence + 2
            : content.length
      content = content.slice(0, splitAt).trim()
    }

    if (content.length > 0) {
      chunks.push({ content, chunkIndex })
      chunkIndex++
    }

    const consumed = content.length - OVERLAP_CHARS
    start += consumed > 0 ? consumed : content.length
  }

  return chunks
}

/**
 * HuggingFace Inference Router client.
 *
 * Uses the OpenAI-compatible endpoint at https://router.huggingface.co/v1
 * Model: Qwen/Qwen2.5-1.5B-Instruct via featherless-ai
 *
 * No extra packages needed — uses native fetch.
 */

const HF_BASE_URL = 'https://router.huggingface.co/v1'
const HF_MODEL = 'Qwen/Qwen2.5-1.5B-Instruct:featherless-ai'

const SYSTEM_PROMPT = `You are Clinical Clarity, an expert AI medical assistant specializing in interpreting medical reports and lab results.

## Your Primary Role
You analyze medical reports using ONLY the content provided in the report excerpts. You do NOT invent or fabricate values not found in the context.

## Strict RAG Rules
- ONLY reference data that appears in the provided report excerpts
- If a value is NOT in the context, say: "I don't see that value in the uploaded report"
- Never guess or fabricate lab values, dates, or patient information
- If no context is provided, ask the user to upload their report first

## Response Format
- Lead with the most important finding from the report
- Use **bold** for any abnormal values or critical flags
- Use bullet points to list multiple values clearly
- Quote reference ranges when they appear in the report
- End with a brief note to consult their physician

## Tone
- Clear, compassionate, and plain-language
- Explain medical terms alongside technical terms
- Never diagnose or prescribe — only interpret what the report says`

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Stream a response from HuggingFace Qwen2.5-1.5B.
 * Returns a ReadableStream<Uint8Array> compatible with the chat route.
 */
export async function streamHFResponse(
  question: string,
  context: string,
  history: ChatMessage[] = []
): Promise<ReadableStream<Uint8Array>> {
  const token = process.env.HF_TOKEN
  if (!token) throw new Error('HF_TOKEN is not set')

  const userContent = context
    ? `REPORT CONTEXT (from the patient's uploaded medical document):\n\n${context}\n\n${'='.repeat(60)}\n\nPatient question: ${question}\n\nAnswer strictly based on the report context above.`
    : `Patient question: ${question}\n\n(No report context available. Ask the user to upload their report.)`

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ]

  const res = await fetch(`${HF_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: HF_MODEL,
      messages,
      max_tokens: 1024,
      temperature: 0.3,
      stream: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HuggingFace API error ${res.status}: ${err}`)
  }

  // Parse the SSE stream and re-emit plain text chunks
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = res.body!.getReader()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              controller.close()
              return
            }
            try {
              const json = JSON.parse(data)
              const text = json.choices?.[0]?.delta?.content ?? ''
              if (text) controller.enqueue(encoder.encode(text))
            } catch {
              // skip malformed SSE lines
            }
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

/**
 * Non-streaming HF call — returns full response text at once.
 */
export async function getHFAnswer(
  question: string,
  context: string
): Promise<string> {
  const token = process.env.HF_TOKEN
  if (!token) return ''

  const userContent = context
    ? `Report excerpts:\n\n${context}\n\n---\n\nQuestion: ${question}`
    : `Question: ${question}`

  try {
    const res = await fetch(`${HF_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 512,
        temperature: 0.3,
        stream: false,
      }),
    })

    if (!res.ok) return ''
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  } catch {
    return ''
  }
}

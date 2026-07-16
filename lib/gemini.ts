/**
 * Groq LLM streaming wrapper.
 *
 * Uses llama-3.3-70b-versatile via Groq's OpenAI-compatible API.
 * Returns a ReadableStream<Uint8Array> of text chunks for streaming to the client.
 */
import Groq from 'groq-sdk'

// Lazy client — only instantiated at call time, not at module load.
let _client: Groq | null = null

function getClient(): Groq {
  if (!_client) {
    _client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _client
}

const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `You are Clinical Clarity, an expert AI medical assistant specializing in interpreting medical reports and lab results.

## Your Primary Role
You analyze medical reports using ONLY the content provided in the report excerpts below each user question. You do NOT invent or fabricate values not found in the context.

## Strict RAG Rules
- ONLY reference data that appears in the provided report excerpts
- If a value is NOT in the context, say exactly: "I don't see that value in the uploaded report section provided"
- Never guess or fabricate lab values, dates, or patient information
- If no context is provided, tell the user to upload their report first

## Response Format
- Lead with the most important finding from the report
- Use **bold** for any abnormal values or critical flags
- Use bullet points to list multiple values clearly
- Cite reference ranges when they appear in the report: "Normal range: X-Y"
- End with a brief note to consult their physician for medical decisions

## Tone
- Clear, compassionate, and reassuring
- Explain medical terms in plain language alongside the technical term
- Never diagnose or prescribe — only interpret what the report says`

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Generate a streaming Groq response for a medical question.
 * Returns a ReadableStream of UTF-8 text chunks.
 */
export async function streamGroqResponse(
  question: string,
  context: string,
  history: ChatMessage[] = []
): Promise<ReadableStream<Uint8Array>> {
  // Build the user message: always include context when available
  const userContent = context
    ? `REPORT CONTEXT (extracted from the patient's uploaded medical document):\n\n${context}\n\n${'='.repeat(60)}\n\nPatient question: ${question}\n\nPlease answer based strictly on the report context above.`
    : `Patient question: ${question}\n\n(Note: No report context was retrieved. If the patient has uploaded a report, suggest they re-upload it.)`

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userContent },
  ]

  const streamResponse = await getClient().chat.completions.create({
    model: MODEL,
    messages,
    stream: true,
    temperature: 0.2,   // lower = more faithful to context, less hallucination
    max_tokens: 2048,
  })

  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamResponse) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            controller.enqueue(encoder.encode(text))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

/**
 * Groq LLM streaming and extraction wrapper.
 *
 * Uses llama-3.3-70b-versatile via Groq's OpenAI-compatible API.
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

export interface ExtractedReportMetadata {
  lab_name: string | null
  report_date: string | null
  doctor_name: string | null
  risk_score: number // 0-100
  risk_label: string
  biomarkers: Array<{
    label: string
    value: string
    status: 'normal' | 'borderline' | 'high'
  }>
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
    temperature: 0.2,
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

/**
 * Extract structured metadata, risk level, and biomarkers from a medical report.
 * Uses Groq's high-speed structured generation.
 */
export async function extractReportMetadata(rawText: string): Promise<ExtractedReportMetadata> {
  const prompt = `You are a medical document extraction agent. 
Analyze the following raw medical report text and extract structured information.

Return a JSON object with the exact keys:
1. "lab_name": string or null (e.g. "Quest Diagnostics", "Labcorp", etc.)
2. "report_date": string or null (format YYYY-MM-DD)
3. "doctor_name": string or null representing the ordering/prescribing doctor or physician mentioned in the report (e.g. "Dr. Sarah Jenkins")
4. "risk_score": integer between 0 and 100 representing general risk or level of out-of-range biomarkers (0=all normal, 100=critical)
5. "risk_label": a short summary phrase (e.g., "Low probability of acute concern", "Several borderline levels", "Action recommended for elevated markers")
6. "biomarkers": an array of up to 6 key indicators/lab tests found in the report, each having:
   - "label": string (e.g. "Total Cholesterol", "Hemoglobin A1c", "TSH", "Glucose")
   - "value": string (value with unit, e.g. "215 mg/dL", "5.8%")
   - "status": one of ["normal", "borderline", "high"] based on standard reference ranges or flags in the report.

Text to analyze:
${rawText}

Return ONLY a valid JSON block starting with { and ending with }. Do not include any other markdown formatting or conversational filler.`

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from Groq extraction')
    }

    return JSON.parse(content) as ExtractedReportMetadata
  } catch (err) {
    console.error('Failed to extract report metadata:', err)
    // Return graceful fallback
    return {
      lab_name: null,
      report_date: null,
      doctor_name: null,
      risk_score: 10,
      risk_label: 'Low probability of acute concern',
      biomarkers: [],
    }
  }
}

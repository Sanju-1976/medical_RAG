import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { extractPdfText, extractImageText, chunkText } from '@/lib/pdf'
import { embedBatch } from '@/lib/embeddings'
import { extractReportMetadata } from '@/lib/gemini'

export const maxDuration = 60

// Accepted MIME types
const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
} as const

type AcceptedMime = keyof typeof ACCEPTED_TYPES

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Normalise mime type (browsers sometimes send 'image/jpg' instead of 'image/jpeg')
    const mimeType = (file.type === 'image/jpg' ? 'image/jpeg' : file.type) as AcceptedMime

    if (!ACCEPTED_TYPES[mimeType]) {
      return NextResponse.json(
        { error: 'Only PDF, JPG, PNG, and WEBP files are supported' },
        { status: 400 }
      )
    }

    const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size must be under 20 MB' }, { status: 400 })
    }

    const supabase = createServerClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileType = ACCEPTED_TYPES[mimeType]

    // 1. Upload to Supabase Storage
    const storagePath = `reports/${Date.now()}_${fileName}`
    const { error: storageError } = await supabase.storage
      .from('medical-reports')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

    if (storageError) {
      console.error('Storage error:', storageError)
      // Non-fatal — continue with embedding
    }

    // 2. Create document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        name: file.name,
        file_path: storagePath,
        file_size: file.size,
      })
      .select()
      .single()

    if (docError || !doc) {
      console.error('Document insert error:', docError)
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 })
    }

    // 3. Extract text — PDF or image
    let rawText = ''

    if (fileType === 'pdf') {
      rawText = await extractPdfText(buffer)
      if (!rawText || rawText.trim().length < 50) {
        return NextResponse.json(
          { error: 'Could not extract text from PDF. Try uploading a JPG scan instead.' },
          { status: 422 }
        )
      }
    } else {
      // Image: use Groq vision OCR
      rawText = await extractImageText(buffer, mimeType as 'image/jpeg' | 'image/png' | 'image/webp')
      if (!rawText || rawText.trim().length < 20) {
        return NextResponse.json(
          { error: 'Could not read text from image. Please ensure the image is clear and well-lit.' },
          { status: 422 }
        )
      }
    }

    // 3.5 Extract metadata (lab name, report date, biomarkers, risk assessment) from rawText using Groq
    const reportMetadata = await extractReportMetadata(rawText)
    
    // Update the document row with the extracted metadata
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        lab_name: reportMetadata.lab_name,
        report_date: reportMetadata.report_date,
        metadata: reportMetadata, // Store the full metadata JSON (including risk and biomarkers)
      })
      .eq('id', doc.id)

    if (updateError) {
      console.error('Failed to update document metadata:', updateError)
    }

    // 4. Chunk the text
    const chunks = chunkText(rawText)

    // 5. Generate local embeddings
    const texts = chunks.map((c) => c.content)
    const embeddings = await embedBatch(texts)

    // 6. Store chunks + embeddings
    const chunkRows = chunks.map((chunk, i) => ({
      document_id: doc.id,
      content: chunk.content,
      embedding: embeddings[i],
      chunk_index: chunk.chunkIndex,
      page_number: chunk.pageNumber ?? null,
    }))

    const { error: chunkError } = await supabase.from('document_chunks').insert(chunkRows)

    if (chunkError) {
      console.error('Chunk insert error:', chunkError)
      return NextResponse.json({ error: 'Failed to store document chunks' }, { status: 500 })
    }

    // 7. Create initial chat session
    const sessionTitle = file.name.replace(/\.(pdf|jpg|jpeg|png|webp)$/i, '')
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({ document_id: doc.id, title: sessionTitle })
      .select()
      .single()

    if (sessionError || !session) {
      console.error('Session insert error:', sessionError)
      return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 })
    }

    return NextResponse.json({
      documentId: doc.id,
      sessionId: session.id,
      chunkCount: chunks.length,
      name: file.name,
      fileType,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

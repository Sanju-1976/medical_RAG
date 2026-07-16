/**
 * Local embedding utility using @xenova/transformers.
 *
 * Model: Xenova/all-MiniLM-L6-v2
 *   - 384-dimensional output (matches vector(384) in DB schema)
 *   - ~20MB download, cached after first use
 *   - No API key required
 */

import type { FeatureExtractionPipeline } from '@xenova/transformers'

// Singleton pipeline — loaded once per process, reused across requests
let _pipeline: FeatureExtractionPipeline | null = null

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!_pipeline) {
    const { pipeline } = await import('@xenova/transformers')
    _pipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    ) as FeatureExtractionPipeline
  }
  return _pipeline
}

/**
 * Generate a 384-dim embedding for a single text string.
 */
export async function embedText(text: string): Promise<number[]> {
  const pipe = await getPipeline()
  const output = await pipe(text.trim(), { pooling: 'mean', normalize: true })
  return Array.from(output.data) as number[]
}

/**
 * Embed multiple texts using the local model (no batching limit).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const pipe = await getPipeline()
  const results: number[][] = []
  for (const text of texts) {
    const output = await pipe(text.trim(), { pooling: 'mean', normalize: true })
    results.push(Array.from(output.data) as number[])
  }
  return results
}

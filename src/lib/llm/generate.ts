import { streamText } from 'ai'
import { buildPrompt, cleanGeneratedText, getSystemPrompt } from './prompts'
import { createLanguageModel } from './providers'
import type { CopywritingConfig, GenerationResult, LlmConfig } from './types'

export interface GenerateCopywritingOptions {
  llmConfig: LlmConfig
  copywritingConfig: CopywritingConfig
  prompt: string
  abortSignal: AbortSignal
  onTextDelta?: (text: string) => void
}

const isAbortError = (error: unknown) =>
  error instanceof DOMException
    ? error.name === 'AbortError'
    : (error as { name?: string })?.name === 'AbortError'

const isTruncated = (reason: string | undefined) =>
  ['length', 'max_tokens', 'max_output_tokens', 'content-filter'].includes(reason ?? '')

export async function generateCopywriting(
  options: GenerateCopywritingOptions,
): Promise<GenerationResult> {
  const { llmConfig, copywritingConfig, prompt, abortSignal, onTextDelta } = options
  const instructions = getSystemPrompt(copywritingConfig)
  const input = buildPrompt(prompt, instructions, llmConfig.instructionDelivery)
  const model = createLanguageModel(llmConfig)
  const maxOutputTokens =
    llmConfig.maxOutputTokens ?? (llmConfig.protocol === 'anthropic-messages' ? 4096 : undefined)
  const requestController = new AbortController()
  let timedOut = false
  const handleAbort = () => requestController.abort()
  if (abortSignal.aborted) {
    handleAbort()
  } else {
    abortSignal.addEventListener('abort', handleAbort, { once: true })
  }
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true
    requestController.abort()
  }, llmConfig.timeoutSeconds * 1000)
  const signal = requestController.signal
  let text = ''

  try {
    const result = streamText({
      model,
      ...input,
      abortSignal: signal,
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
    })
    for await (const part of result.stream) {
      if (part.type === 'text-delta') {
        text += part.text
        onTextDelta?.(part.text)
      }
      if (part.type === 'error') throw part.error
      if (part.type === 'abort') {
        if (timedOut) throw new Error(`Request timed out after ${llmConfig.timeoutSeconds} seconds`)
        return { text: cleanGeneratedText(text), status: 'cancelled' }
      }
    }
    const finishReason = await result.rawFinishReason
    text = cleanGeneratedText(text)
    return {
      text,
      finishReason,
      status: !text ? 'failed' : isTruncated(finishReason) ? 'truncated' : 'completed',
    }
  } catch (error) {
    if (timedOut) {
      throw new Error(`Request timed out after ${llmConfig.timeoutSeconds} seconds`)
    }
    if ((isAbortError(error) || signal.aborted) && abortSignal.aborted) {
      return { text: cleanGeneratedText(text), status: 'cancelled' }
    }
    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
    abortSignal.removeEventListener('abort', handleAbort)
  }
}

import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import type { LlmConfig } from './types'

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, '')

export function getRequestUrlHint(config: LlmConfig): string {
  const baseUrl = normalizeUrl(config.apiUrl)
  if (!baseUrl) return ''
  if (config.protocol === 'anthropic-messages') return `${baseUrl}/messages`
  if (config.protocol === 'openai-responses') return `${baseUrl}/responses`
  return `${baseUrl}/chat/completions`
}

export function createLanguageModel(config: LlmConfig): LanguageModel {
  const baseURL = normalizeUrl(config.apiUrl)
  const headers = Object.fromEntries(
    config.customHeaders.map(({ name, value }) => [name.trim(), value]),
  )

  switch (config.protocol) {
    case 'openai-compatible':
      return createOpenAICompatible({
        name: 'openai-compatible',
        baseURL,
        apiKey: config.apiKey || undefined,
        headers,
      }).chatModel(config.modelName)
    case 'openai-chat': {
      const provider = createOpenAI({ baseURL, apiKey: config.apiKey || undefined, headers })
      return provider.chat(config.modelName)
    }
    case 'openai-responses': {
      const provider = createOpenAI({ baseURL, apiKey: config.apiKey || undefined, headers })
      return provider.responses(config.modelName)
    }
    case 'anthropic-messages': {
      const provider = createAnthropic({
        baseURL,
        apiKey: config.anthropicAuthMode === 'api-key' ? config.apiKey || undefined : undefined,
        authToken: config.anthropicAuthMode === 'bearer' ? config.apiKey || undefined : undefined,
        headers,
      })
      return provider(config.modelName)
    }
  }
}

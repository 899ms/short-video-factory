import type { CopywritingConfig, CustomHeader, LlmConfig } from './types'

export const defaultLlmConfig = (): LlmConfig => ({
  protocol: 'openai-compatible',
  apiUrl: '',
  apiKey: '',
  modelName: '',
  timeoutSeconds: 120,
  anthropicAuthMode: 'api-key',
  instructionDelivery: 'standard',
  customHeaders: [],
})

export const defaultCopywritingConfig = (): CopywritingConfig => ({
  systemPromptMode: 'builtin',
  customSystemPrompt: '',
})

const protocols = new Set<LlmConfig['protocol']>([
  'openai-compatible',
  'openai-chat',
  'openai-responses',
  'anthropic-messages',
])

const isHeader = (value: unknown): value is CustomHeader => {
  if (!value || typeof value !== 'object') return false
  const header = value as CustomHeader
  return (
    typeof header.name === 'string' && header.name.trim() !== '' && typeof header.value === 'string'
  )
}

export function normalizeLlmConfig(value: unknown): LlmConfig {
  const defaults = defaultLlmConfig()
  const config = value && typeof value === 'object' ? (value as Partial<LlmConfig>) : {}
  const isLegacy = !('protocol' in config)
  const headers = Array.isArray(config.customHeaders) ? config.customHeaders.filter(isHeader) : []
  const usedNames = new Set<string>()

  return {
    ...defaults,
    protocol: protocols.has(config.protocol as LlmConfig['protocol'])
      ? (config.protocol as LlmConfig['protocol'])
      : isLegacy
        ? 'openai-chat'
        : defaults.protocol,
    apiUrl: typeof config.apiUrl === 'string' ? config.apiUrl : '',
    apiKey: typeof config.apiKey === 'string' ? config.apiKey : '',
    modelName: typeof config.modelName === 'string' ? config.modelName : '',
    timeoutSeconds:
      Number.isInteger(config.timeoutSeconds) && (config.timeoutSeconds ?? 0) > 0
        ? config.timeoutSeconds!
        : defaults.timeoutSeconds,
    maxOutputTokens:
      Number.isInteger(config.maxOutputTokens) && (config.maxOutputTokens ?? 0) > 0
        ? config.maxOutputTokens
        : undefined,
    anthropicAuthMode: config.anthropicAuthMode === 'bearer' ? 'bearer' : 'api-key',
    instructionDelivery:
      config.instructionDelivery === 'user-message' ? 'user-message' : 'standard',
    customHeaders: headers.filter((header) => {
      const name = header.name.trim().toLowerCase()
      if (usedNames.has(name)) return false
      usedNames.add(name)
      return !['authorization', 'x-api-key', 'anthropic-version'].includes(name)
    }),
  }
}

export function normalizeCopywritingConfig(value: unknown): CopywritingConfig {
  const config = value && typeof value === 'object' ? (value as Partial<CopywritingConfig>) : {}
  return {
    systemPromptMode: ['builtin', 'custom', 'off'].includes(config.systemPromptMode ?? '')
      ? (config.systemPromptMode as CopywritingConfig['systemPromptMode'])
      : 'builtin',
    customSystemPrompt:
      typeof config.customSystemPrompt === 'string' ? config.customSystemPrompt : '',
  }
}

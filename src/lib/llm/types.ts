export type LlmProtocol =
  | 'openai-compatible'
  | 'openai-chat'
  | 'openai-responses'
  | 'anthropic-messages'

export type AnthropicAuthMode = 'api-key' | 'bearer'
export type InstructionDelivery = 'standard' | 'user-message'
export type SystemPromptMode = 'builtin' | 'custom' | 'off'

export type CopywritingStatus =
  | 'idle'
  | 'generating'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'truncated'
  | 'edited'

export interface CustomHeader {
  name: string
  value: string
}

export interface LlmConfig {
  protocol: LlmProtocol
  apiUrl: string
  apiKey: string
  modelName: string
  timeoutSeconds: number
  maxOutputTokens?: number
  anthropicAuthMode: AnthropicAuthMode
  instructionDelivery: InstructionDelivery
  customHeaders: CustomHeader[]
}

export interface CopywritingConfig {
  systemPromptMode: SystemPromptMode
  customSystemPrompt: string
}

export interface GenerationResult {
  text: string
  status: Extract<CopywritingStatus, 'completed' | 'cancelled' | 'failed' | 'truncated'>
  finishReason?: string
}

import OpenAI from 'openai'
import { HttpError } from '../utils/errors.js'
import type { ChatMessageInput } from '../types/chat.types.js'
import type { Bindings } from '../types/env.js'

function getClient(env: Bindings): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new HttpError('OpenAI is not configured on the server', 500)
  }

  return new OpenAI({ apiKey: env.OPENAI_API_KEY })
}

export interface OpenAiCompletion {
  id: string
  content: string
  createdAt: string
}

export async function createChatCompletion(
  messages: ChatMessageInput[],
  env: Bindings,
): Promise<OpenAiCompletion> {
  try {
    const response = await getClient(env).responses.create({
      model: env.OPENAI_MODEL ?? 'gpt-5.6-luna',
      input: messages,
    })

    return {
      id: response.id,
      content: response.output_text,
      createdAt: new Date(response.created_at * 1000).toISOString(),
    }
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(`OpenAI API error (${error.status ?? 'unknown'}): ${error.message}`)

      if (error.status === 429) {
        throw new HttpError('OpenAI rate limit exceeded, please try again shortly', 429)
      }

      throw new HttpError('The AI provider failed to generate a response', 502)
    }

    console.error('Unexpected error calling OpenAI:', error instanceof Error ? error.message : error)
    throw new HttpError('The AI provider failed to generate a response', 502)
  }
}

export async function* streamChatCompletion(
  messages: ChatMessageInput[],
  signal: AbortSignal,
  env: Bindings,
): AsyncGenerator<string> {
  try {
    const stream = await getClient(env).responses.create(
      {
        model: env.OPENAI_MODEL ?? 'gpt-5.6-luna',
        input: messages,
        stream: true,
      },
      { signal },
    )

    for await (const event of stream) {
      if (event.type === 'response.output_text.delta') {
        yield event.delta
      }
    }
  } catch (error) {
    if (signal.aborted) {
      return
    }

    if (error instanceof OpenAI.APIError) {
      console.error(`OpenAI streaming error (${error.status ?? 'unknown'}): ${error.message}`)
      throw new HttpError('The AI provider failed to generate a response', 502)
    }

    console.error('Unexpected error during OpenAI stream:', error instanceof Error ? error.message : error)
    throw new HttpError('The AI provider failed to generate a response', 502)
  }
}

import type OpenAI from 'openai';
import type { AIService } from './ai-service';
import type { ChatMessage, ChatCompletionOptions, ChatCompletionResult } from '../types';

/**
 * Wrapper for Azure OpenAI client.
 */
export class OpenAIClient {
    private aiService: AIService;
    private openaiClient: OpenAI;

    constructor(aiService: AIService, openaiClient: OpenAI) {
        this.aiService = aiService;
        this.openaiClient = openaiClient;
    }

    /**
     * Get the underlying OpenAI client.
     */
    getClient(): OpenAI {
        return this.openaiClient;
    }

    /**
     * Get the parent AI service.
     */
    getAIService(): AIService {
        return this.aiService;
    }

    /**
     * Generate embeddings for text.
     *
     * @param text - Text to generate embeddings for
     * @param model - Embedding model to use (deployment name)
     * @returns Array of embedding values
     */
    async generateEmbeddings(
        text: string,
        model = 'text-embedding-3-large'
    ): Promise<number[]> {
        const response = await this.openaiClient.embeddings.create({
            input: text,
            model,
        });

        return response.data[0].embedding;
    }

    /**
     * Generate embeddings for multiple texts.
     *
     * @param texts - Array of texts to generate embeddings for
     * @param model - Embedding model to use (deployment name)
     * @returns Array of embedding arrays
     */
    async generateBatchEmbeddings(
        texts: string[],
        model = 'text-embedding-3-large'
    ): Promise<number[][]> {
        const response = await this.openaiClient.embeddings.create({
            input: texts,
            model,
        });

        return response.data.map((d) => d.embedding);
    }

    /**
     * Generate a chat completion.
     *
     * @param messages - Chat messages
     * @param options - Completion options
     * @returns Chat completion result
     */
    async generateChatCompletion(
        messages: ChatMessage[],
        options: ChatCompletionOptions
    ): Promise<ChatCompletionResult> {
        const response = await this.openaiClient.chat.completions.create({
            model: options.model,
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 800,
            response_format: options.responseFormat as { type: 'text' | 'json_object' } | undefined,
        });

        const choice = response.choices[0];

        return {
            content: choice.message.content || '',
            finishReason: choice.finish_reason || 'stop',
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            },
        };
    }

    /**
     * Stream a chat completion.
     *
     * @param messages - Chat messages
     * @param options - Completion options
     * @returns Async generator yielding content chunks
     */
    async *streamChatCompletion(
        messages: ChatMessage[],
        options: ChatCompletionOptions
    ): AsyncGenerator<string, void, unknown> {
        const stream = await this.openaiClient.chat.completions.create({
            model: options.model,
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 800,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    }

    /**
     * Simple completion helper for single prompts.
     *
     * @param prompt - The user prompt
     * @param model - Model deployment name
     * @param systemPrompt - Optional system prompt
     * @returns Completion text
     */
    async complete(
        prompt: string,
        model: string,
        systemPrompt?: string
    ): Promise<string> {
        const messages: ChatMessage[] = [];

        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }

        messages.push({ role: 'user', content: prompt });

        const result = await this.generateChatCompletion(messages, { model });
        return result.content;
    }
}

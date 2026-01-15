import type { TokenCredential } from '@azure/identity';
import type { Subscription as AzureSubscription } from '@azure/arm-subscriptions';
import type { ResourceGroup as AzureResourceGroup } from '@azure/arm-resources';
import type { StorageAccount as AzureStorageAccount } from '@azure/arm-storage';
import type { SearchService as AzureSearchService } from '@azure/arm-search';

/**
 * Options for Identity initialization.
 */
export interface IdentityOptions {
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
}

/**
 * Container public access levels.
 */
export type ContainerAccessLevel = 'container' | 'blob' | 'private';

/**
 * Options for uploading blobs.
 */
export interface UploadOptions {
    contentType?: string;
    metadata?: Record<string, string>;
}

/**
 * Search field options.
 */
export interface FieldOptions {
    key?: boolean;
    filterable?: boolean;
    sortable?: boolean;
    facetable?: boolean;
    hidden?: boolean;
}

/**
 * Searchable field options.
 */
export interface SearchableFieldOptions extends FieldOptions {
    analyzerName?: string;
    searchAnalyzerName?: string;
    indexAnalyzerName?: string;
}

/**
 * Vector search configuration.
 */
export interface VectorSearchOptions {
    algorithmName?: string;
    profileName?: string;
    dimensions?: number;
    metric?: 'cosine' | 'euclidean' | 'dotProduct';
}

/**
 * Chat message for OpenAI completions.
 */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Options for chat completion.
 */
export interface ChatCompletionOptions {
    model: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: Record<string, unknown>;
}

/**
 * Result from chat completion.
 */
export interface ChatCompletionResult {
    content: string;
    finishReason: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * Document analysis options.
 */
export interface AnalyzeOptions {
    pages?: string;
    locale?: string;
}

/**
 * Output format for CLI.
 */
export type OutputFormat = 'text' | 'json' | 'table';

// Re-export Azure types for convenience
export type { TokenCredential, AzureSubscription, AzureResourceGroup, AzureStorageAccount, AzureSearchService };

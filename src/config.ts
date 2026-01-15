import { config } from 'dotenv';

// Load environment variables from .env file
config();

/**
 * Azure configuration loaded from environment variables.
 */
export interface AzureConfig {
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    subscriptionId?: string;
    resourceGroup?: string;
    resourceLocation?: string;
    storageAccountName?: string;
    storageContainerName?: string;
    searchServiceName?: string;
    searchIndexName?: string;
    searchSemanticConfiguration?: string;
    searchEndpoint?: string;
    searchKey?: string;
    searchApiVersion?: string;
    openaiServiceName?: string;
    openaiApiKey?: string;
    openaiEndpoint?: string;
    openaiEmbeddingModel?: string;
    openaiChatModel?: string;
    openaiApiVersion?: string;
}

/**
 * Load Azure configuration from environment variables.
 * @returns AzureConfig object with values from environment
 */
export function loadConfig(): AzureConfig {
    return {
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
        resourceGroup: process.env.AZURE_RESOURCE_GROUP_NAME,
        resourceLocation: process.env.AZURE_RESOURCE_LOCATION,
        storageAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
        storageContainerName: process.env.AZURE_STORAGE_CONTAINER_NAME,
        searchServiceName: process.env.AZURE_SEARCH_SERVICE_NAME,
        searchIndexName: process.env.AZURE_SEARCH_INDEX_NAME,
        searchSemanticConfiguration: process.env.AZURE_SEARCH_INDEX_SEMANTIC_CONFIGURATION,
        searchEndpoint: process.env.AZURE_SEARCH_ENDPOINT,
        searchKey: process.env.AZURE_SEARCH_KEY,
        searchApiVersion: process.env.AZURE_SEARCH_API_VERSION,
        openaiServiceName: process.env.AZURE_OPENAI_SERVICE_NAME,
        openaiApiKey: process.env.AZURE_OPENAI_API_KEY,
        openaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        openaiEmbeddingModel: process.env.AZURE_OPENAI_EMBEDDING_MODEL,
        openaiChatModel: process.env.AZURE_OPENAI_CHAT_MODEL,
        openaiApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    };
}

// Export individual config values for convenience
export const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
export const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
export const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
export const AZURE_SUBSCRIPTION_ID = process.env.AZURE_SUBSCRIPTION_ID;
export const AZURE_RESOURCE_GROUP = process.env.AZURE_RESOURCE_GROUP_NAME;
export const AZURE_RESOURCE_LOCATION = process.env.AZURE_RESOURCE_LOCATION;
export const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
export const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME;
export const AZURE_SEARCH_SERVICE_NAME = process.env.AZURE_SEARCH_SERVICE_NAME;
export const AZURE_SEARCH_INDEX_NAME = process.env.AZURE_SEARCH_INDEX_NAME;
export const AZURE_SEARCH_ENDPOINT = process.env.AZURE_SEARCH_ENDPOINT;
export const AZURE_SEARCH_KEY = process.env.AZURE_SEARCH_KEY;
export const AZURE_OPENAI_SERVICE_NAME = process.env.AZURE_OPENAI_SERVICE_NAME;
export const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
export const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
export const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION;

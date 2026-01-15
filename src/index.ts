// Main library exports

// Errors
export { ResourceNotFoundError, AuthenticationError, ConfigurationError } from './errors';

// Configuration
export { loadConfig, AzureConfig } from './config';
export * from './config';

// Identity
export { Identity } from './identity';

// Resources
export { Subscription, ResourceGroup } from './resources';

// Storage
export {
    StorageAccount,
    Container,
    Table,
    BlobType,
    blobTypeFromExtension,
    blobTypeFromMimeType,
    extensionFromBlobType,
    isTextType,
    validateContainerName,
} from './storage';

// Search
export {
    SearchService,
    SearchIndex,
    SearchIndexerManager,
    DataSourceConnection,
    Indexer,
    Skillset,
    getStdVectorSearch,
    getExhaustiveKnnVectorSearch,
    FieldOptions,
    SearchableFieldOptions,
    BatchProcessOptions,
    HybridSearchOptions,
    CreateDataSourceOptions,
    CreateIndexerOptions,
    CreateSkillsetOptions,
    VectorSearchOptions,
} from './search';

// AI
export { AIService, OpenAIClient, ModelDetails, DeploymentDetails, CreateDeploymentOptions } from './ai';

// Document Intelligence
export {
    DocumentIntelligenceService,
    DocumentAnalysisClientWrapper,
    AnalysisResult,
    PageResult,
    BatchAnalysisResult,
} from './document-intelligence';

// Types
export type {
    IdentityOptions,
    ContainerAccessLevel,
    UploadOptions,
    ChatMessage,
    ChatCompletionOptions,
    ChatCompletionResult,
    AnalyzeOptions,
    OutputFormat,
} from './types';

// CLI
export { createProgram, main as cliMain } from './cli';

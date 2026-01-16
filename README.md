# azwrap-ts

> TypeScript port of [AzWrap](https://github.com/BikS2013/AzWrap) - a Python wrapper for Azure SDKs.

TypeScript wrapper for Azure SDKs - simplifies interaction with Azure services.

## Installation

```bash
npm install azwrap-ts
```

## Features

- **Identity & Authentication**: Support for both Service Principal and DefaultAzureCredential
- **Resource Management**: Subscription and Resource Group management
- **Storage**: Blob storage (containers, blobs) and Table storage
- **Azure AI Search**: Index management, indexers, skillsets, and vector search
- **Azure OpenAI**: Embeddings and chat completions
- **Document Intelligence**: Document analysis with prebuilt and custom models
- **CLI**: Command-line interface for all services

## Quick Start

### Library Usage

```typescript
import { Identity, Subscription } from 'azwrap-ts';

// Create identity with service principal
const identity = await Identity.create({
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
});

// Or use default Azure credentials
const identity = await Identity.create();

// Get a subscription
const subscription = await identity.getSubscription('your-subscription-id');

// Get a resource group
const resourceGroup = await subscription.getResourceGroup('your-resource-group');

// Get a storage account
const storageAccount = await resourceGroup.getStorageAccount('your-storage-account');

// List containers
const containers = await storageAccount.getContainers();
```

### CLI Usage

```bash
# List subscriptions
npx azwrap subscription list

# List resource groups
npx azwrap resource-group list -s <subscription-id>

# List containers in a storage account
npx azwrap storage container list -a <storage-account>

# Analyze a document
npx azwrap document analyze ./document.pdf -n <service-name>
```

## Configuration

Set the following environment variables or use a `.env` file:

```bash
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP_NAME=your-resource-group
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_SEARCH_SERVICE_NAME=your-search-service
AZURE_OPENAI_SERVICE_NAME=your-openai-service
```

## API Reference

### Identity

```typescript
// Create with service principal
const identity = await Identity.create({
    tenantId: 'tenant-id',
    clientId: 'client-id',
    clientSecret: 'client-secret',
});

// Get subscriptions
const subscriptions = await identity.getSubscriptions();

// Get specific subscription
const subscription = await identity.getSubscription('subscription-id');
```

### Storage

```typescript
// Get storage account
const storageAccount = await resourceGroup.getStorageAccount('account-name');

// Create container
const container = await storageAccount.createContainer('container-name');

// Upload blob
await container.uploadFile('./local-file.txt', 'remote-name.txt');

// Download blob
const content = await container.getBlobContent('blob-name');
```

### Search

```typescript
// Get search service
const searchService = await subscription.getSearchService('service-name');

// Create index
const fields = [
    searchService.addSimpleField('id', 'String', { key: true }),
    searchService.addSearchableField('content'),
];
const index = searchService.createOrUpdateIndex('index-name', fields);
await index.save();

// Upload documents
await index.uploadRows([{ id: '1', content: 'Hello world' }]);
```

### AI (OpenAI)

```typescript
// Get AI service
const aiService = await resourceGroup.getAIService('service-name');

// Get OpenAI client
const openaiClient = await aiService.getOpenAIClient('2024-02-01');

// Generate embeddings
const embeddings = await openaiClient.generateEmbeddings('Hello world');

// Chat completion
const result = await openaiClient.generateChatCompletion(
    [{ role: 'user', content: 'Hello!' }],
    { model: 'gpt-4' }
);
```

### Document Intelligence

```typescript
// Get Document Intelligence service
const diService = await resourceGroup.getDocumentIntelligenceService('service-name');

// Get analysis client
const client = await diService.getDocumentAnalysisClient();

// Analyze document
const result = await client.analyzeLayout('./document.pdf');
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Testing

The library has comprehensive test coverage with both unit tests and integration tests.

### Test Summary

| Type | Tests | Description |
|------|-------|-------------|
| Unit tests | 186 | Fast tests with mocked Azure SDK |
| Integration tests | 28 | Tests against actual Azure services |
| **Total** | **214** | |

### Unit Tests

Unit tests use mocked Azure SDK clients and run without Azure credentials:

```bash
npm test
```

Modules covered:
- `errors` - Custom error classes
- `identity` - Authentication and credential management
- `storage` - StorageAccount, Container, Table, BlobType utilities
- `search` - SearchService, VectorSearch configurations
- `ai` - AIService, deployments, OpenAI client
- `document-intelligence` - DocumentIntelligenceService
- `resources` - ResourceGroup management

### Integration Tests

Integration tests run against actual Azure services. Configure these environment variables:

```bash
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_SUBSCRIPTION_ID=your-subscription-id
```

Run integration tests:

```bash
npm test -- tests/integration.test.ts
```

Integration tests verify:
- Subscription and resource group operations
- Storage account and container access
- Search service connectivity and index management
- AI/OpenAI service access and deployments
- Table storage operations

## License

MIT

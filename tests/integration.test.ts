import { describe, it, expect, beforeAll } from 'vitest';
import { Identity } from '../src/identity';
import { Subscription } from '../src/resources/subscription';
import { ResourceGroup } from '../src/resources/resource-group';
import { StorageAccount } from '../src/storage/storage-account';
import { SearchService } from '../src/search/search-service';
import { AIService } from '../src/ai/ai-service';
import { testConfig, hasCredentials } from './setup';

/**
 * Integration tests that test actual Azure services.
 * These tests require valid Azure credentials and access to real resources.
 */
describe.skipIf(!hasCredentials())('Integration Tests - Actual Azure Services', () => {
    let identity: Identity;
    let subscription: Subscription;

    const RESOURCE_GROUP = 'rg-RAG-resources';
    const STORAGE_ACCOUNT = 'saragcontent';
    const SEARCH_SERVICE = 'search-service-aiml-dev';
    const OPENAI_SERVICE = 'openai-idp-rag';
    const TEST_CONTAINER = 'tests-container';

    beforeAll(async () => {
        identity = await Identity.create({
            tenantId: testConfig.tenantId!,
            clientId: testConfig.clientId!,
            clientSecret: testConfig.clientSecret!,
        });
        subscription = await identity.getSubscription(testConfig.subscriptionId!);
    });

    describe('Subscription', () => {
        it('should list resource groups', async () => {
            const groups = await subscription.listResourceGroups();

            expect(groups.length).toBeGreaterThan(0);
            const names = groups.map(g => g.name);
            expect(names).toContain(RESOURCE_GROUP);
        });

        it('should get a specific resource group', async () => {
            const rg = await subscription.getResourceGroup(RESOURCE_GROUP);

            expect(rg.getName()).toBe(RESOURCE_GROUP);
            expect(rg.getLocation()).toBe('westeurope');
        });

        it('should list storage accounts', async () => {
            const accounts = await subscription.getStorageAccounts();

            expect(accounts.length).toBeGreaterThan(0);
            const names = accounts.map(a => a.name);
            expect(names).toContain(STORAGE_ACCOUNT);
        });

        it('should list search services', async () => {
            const services = await subscription.getSearchServices();

            expect(services.length).toBeGreaterThan(0);
            const names = services.map(s => s.name);
            expect(names).toContain(SEARCH_SERVICE);
        });
    });

    describe('ResourceGroup', () => {
        let resourceGroup: ResourceGroup;

        beforeAll(async () => {
            resourceGroup = await subscription.getResourceGroup(RESOURCE_GROUP);
        });

        it('should list resources in the group', async () => {
            const resources = await resourceGroup.getResources();

            expect(resources.length).toBeGreaterThan(0);
        });

        it('should get cognitive services', async () => {
            const services = await resourceGroup.getCognitiveServices();

            expect(services.length).toBeGreaterThan(0);
            const names = services.map(s => s.name);
            expect(names).toContain(OPENAI_SERVICE);
        });

        it('should get storage account by name', async () => {
            const storage = await resourceGroup.getStorageAccount(STORAGE_ACCOUNT);

            expect(storage.getName()).toBe(STORAGE_ACCOUNT);
        });

        it('should get AI service by name', async () => {
            const aiService = await resourceGroup.getAIService(OPENAI_SERVICE);

            expect(aiService).not.toBeNull();
            expect(aiService!.getName()).toBe(OPENAI_SERVICE);
        });
    });

    describe('StorageAccount', () => {
        let storageAccount: StorageAccount;

        beforeAll(async () => {
            const rg = await subscription.getResourceGroup(RESOURCE_GROUP);
            storageAccount = await rg.getStorageAccount(STORAGE_ACCOUNT);
            await storageAccount.initialize();
        });

        it('should have a valid connection string', () => {
            const connStr = storageAccount.getConnectionString();

            expect(connStr).toContain('DefaultEndpointsProtocol=https');
            expect(connStr).toContain(`AccountName=${STORAGE_ACCOUNT}`);
        });

        it('should list containers', async () => {
            const containers = await storageAccount.getContainers();

            expect(containers.length).toBeGreaterThan(0);
            const names = containers.map(c => c.name);
            expect(names).toContain(TEST_CONTAINER);
        });

        it('should get a specific container', async () => {
            const container = await storageAccount.getContainer(TEST_CONTAINER);

            expect(container.getName()).toBe(TEST_CONTAINER);
        });

        it('should get Table client', () => {
            const tableClient = storageAccount.getTablesClient();

            expect(tableClient).toBeDefined();
        });
    });

    describe('Container', () => {
        let storageAccount: StorageAccount;

        beforeAll(async () => {
            const rg = await subscription.getResourceGroup(RESOURCE_GROUP);
            storageAccount = await rg.getStorageAccount(STORAGE_ACCOUNT);
            await storageAccount.initialize();
        });

        it('should list blob names', async () => {
            const container = await storageAccount.getContainer(TEST_CONTAINER);
            const names = await container.getBlobNames();

            expect(Array.isArray(names)).toBe(true);
        });

        it('should get blob metadata', async () => {
            const container = await storageAccount.getContainer(TEST_CONTAINER);
            const metadata = await container.getBlobMetadata();

            expect(typeof metadata).toBe('object');
        });

        it('should get folder structure', async () => {
            const container = await storageAccount.getContainer(TEST_CONTAINER);
            const structure = await container.getFolderStructure();

            expect(typeof structure).toBe('object');
        });
    });

    describe('SearchService', () => {
        let searchService: SearchService;

        beforeAll(async () => {
            searchService = await subscription.getSearchService(SEARCH_SERVICE);
        });

        it('should have correct name', () => {
            expect(searchService.getName()).toBe(SEARCH_SERVICE);
        });

        it('should have correct endpoint', () => {
            const endpoint = searchService.getServiceEndpoint();

            expect(endpoint).toBe(`https://${SEARCH_SERVICE}.search.windows.net`);
        });

        it('should get admin key', async () => {
            const key = await searchService.getAdminKey();

            expect(key).toBeDefined();
            expect(key.length).toBeGreaterThan(0);
        });

        it('should list indexes', async () => {
            const indexes = await searchService.getIndexes();

            expect(Array.isArray(indexes)).toBe(true);
        });

        it('should create index client', async () => {
            const client = await searchService.getIndexClient();

            expect(client).toBeDefined();
        });

        it('should create indexer manager', () => {
            const manager = searchService.createIndexerManager();

            expect(manager).toBeDefined();
        });
    });

    describe('AIService', () => {
        let aiService: AIService;

        beforeAll(async () => {
            const rg = await subscription.getResourceGroup(RESOURCE_GROUP);
            aiService = (await rg.getAIService(OPENAI_SERVICE))!;
        });

        it('should have correct name', () => {
            expect(aiService.getName()).toBe(OPENAI_SERVICE);
        });

        it('should have correct endpoint', () => {
            const endpoint = aiService.getEndpoint();

            expect(endpoint).toBe(`https://${OPENAI_SERVICE}.openai.azure.com/`);
        });

        it('should have correct location', () => {
            expect(aiService.getLocation()).toBe('westeurope');
        });

        it('should get API keys', async () => {
            const keys = await aiService.getKeys();

            expect(keys.key1).toBeDefined();
            expect(keys.key1!.length).toBeGreaterThan(0);
        });

        it('should list deployments', async () => {
            const deployments = await aiService.getDeployments();

            expect(Array.isArray(deployments)).toBe(true);
        });

        it('should get OpenAI client', async () => {
            const client = await aiService.getOpenAIClient();

            expect(client).toBeDefined();
        });
    });

    describe('Table Storage', () => {
        let storageAccount: StorageAccount;

        beforeAll(async () => {
            const rg = await subscription.getResourceGroup(RESOURCE_GROUP);
            storageAccount = await rg.getStorageAccount(STORAGE_ACCOUNT);
            await storageAccount.initialize();
        });

        it('should list tables', async () => {
            const tableClient = storageAccount.getTablesClient();
            const tables = await tableClient.getTables();

            expect(Array.isArray(tables)).toBe(true);
        });
    });
});

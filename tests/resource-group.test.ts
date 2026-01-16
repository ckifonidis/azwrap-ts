import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceGroup } from '../src/resources/resource-group';
import { ResourceNotFoundError } from '../src/errors';

// Mock imports for dynamic imports
vi.mock('../src/storage/storage-account', () => ({
    StorageAccount: vi.fn().mockImplementation((rg, account) => ({
        getName: () => account.name,
        initialize: vi.fn(),
    })),
}));

vi.mock('../src/search/search-service', () => ({
    SearchService: vi.fn().mockImplementation((sub, rg, service) => ({
        getName: () => service.name,
    })),
}));

vi.mock('../src/ai/ai-service', () => ({
    AIService: vi.fn().mockImplementation((rg, client, account) => ({
        getName: () => account.name,
    })),
}));

vi.mock('../src/document-intelligence/document-intelligence-service', () => ({
    DocumentIntelligenceService: vi.fn().mockImplementation((rg, client, account) => ({
        getName: () => account.name,
    })),
}));

// Mock Azure ARM clients
vi.mock('@azure/arm-search', () => ({
    SearchManagementClient: vi.fn().mockImplementation(() => ({
        services: {
            beginCreateOrUpdate: vi.fn().mockResolvedValue({
                pollUntilDone: vi.fn().mockResolvedValue({
                    name: 'new-search-service',
                }),
            }),
        },
    })),
}));

describe('ResourceGroup', () => {
    let resourceGroup: ResourceGroup;
    let mockSubscription: {
        subscriptionId: string;
        getIdentity: () => { getCredential: () => object };
        getResourceClient: () => {
            resources: {
                listByResourceGroup: ReturnType<typeof vi.fn>;
            };
        };
        getStorageManagementClient: () => {
            storageAccounts: {
                getProperties: ReturnType<typeof vi.fn>;
                beginCreate: ReturnType<typeof vi.fn>;
            };
        };
        getCognitiveClient: () => {
            accounts: {
                listByResourceGroup: ReturnType<typeof vi.fn>;
            };
        };
    };
    let mockAzureResourceGroup: {
        name: string;
        location: string;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockSubscription = {
            subscriptionId: 'test-subscription-id',
            getIdentity: () => ({
                getCredential: () => ({}),
            }),
            getResourceClient: () => ({
                resources: {
                    listByResourceGroup: vi.fn().mockImplementation(async function* () {
                        yield { name: 'resource1', type: 'Microsoft.Storage/storageAccounts' };
                        yield { name: 'resource2', type: 'Microsoft.Search/searchServices' };
                    }),
                },
            }),
            getStorageManagementClient: () => ({
                storageAccounts: {
                    getProperties: vi.fn().mockResolvedValue({
                        name: 'teststorage',
                    }),
                    beginCreate: vi.fn().mockResolvedValue({
                        pollUntilDone: vi.fn().mockResolvedValue({
                            name: 'newstorage',
                        }),
                    }),
                },
            }),
            getCognitiveClient: () => ({
                accounts: {
                    listByResourceGroup: vi.fn().mockImplementation(async function* () {
                        yield { name: 'openai-service', kind: 'OpenAI' };
                        yield { name: 'doc-intel', kind: 'FormRecognizer' };
                        yield { name: 'other-service', kind: 'TextAnalytics' };
                    }),
                },
            }),
        };

        mockAzureResourceGroup = {
            name: 'test-resource-group',
            location: 'eastus',
        };

        resourceGroup = new ResourceGroup(
            mockSubscription as never,
            mockAzureResourceGroup as never
        );
    });

    describe('getName', () => {
        it('should return the resource group name', () => {
            expect(resourceGroup.getName()).toBe('test-resource-group');
        });

        it('should return empty string if name is undefined', () => {
            const rgWithoutName = new ResourceGroup(
                mockSubscription as never,
                {} as never
            );
            expect(rgWithoutName.getName()).toBe('');
        });
    });

    describe('getLocation', () => {
        it('should return the resource group location', () => {
            expect(resourceGroup.getLocation()).toBe('eastus');
        });

        it('should return empty string if location is undefined', () => {
            const rgWithoutLocation = new ResourceGroup(
                mockSubscription as never,
                { name: 'test' } as never
            );
            expect(rgWithoutLocation.getLocation()).toBe('');
        });
    });

    describe('getSubscription', () => {
        it('should return the parent subscription', () => {
            expect(resourceGroup.getSubscription()).toBe(mockSubscription);
        });
    });

    describe('getResources', () => {
        it('should list all resources in the resource group', async () => {
            const resources = await resourceGroup.getResources();

            expect(resources).toHaveLength(2);
            expect(resources[0].name).toBe('resource1');
            expect(resources[1].name).toBe('resource2');
        });
    });

    describe('getStorageManagementClient', () => {
        it('should return the storage management client from subscription', () => {
            const client = resourceGroup.getStorageManagementClient();
            expect(client).toBeDefined();
        });
    });

    describe('getStorageAccount', () => {
        it('should return a storage account by name', async () => {
            const account = await resourceGroup.getStorageAccount('teststorage');

            expect(account.getName()).toBe('teststorage');
        });

        it('should throw ResourceNotFoundError when account not found', async () => {
            mockSubscription.getStorageManagementClient = () => ({
                storageAccounts: {
                    getProperties: vi.fn().mockRejectedValue(new Error('Not found')),
                    beginCreate: vi.fn(),
                },
            });

            await expect(
                resourceGroup.getStorageAccount('nonexistent')
            ).rejects.toThrow(ResourceNotFoundError);
        });

        it('should throw ResourceNotFoundError when account is null', async () => {
            mockSubscription.getStorageManagementClient = () => ({
                storageAccounts: {
                    getProperties: vi.fn().mockResolvedValue(null),
                    beginCreate: vi.fn(),
                },
            });

            await expect(
                resourceGroup.getStorageAccount('nullaccount')
            ).rejects.toThrow(ResourceNotFoundError);
        });
    });

    describe('createStorageAccount', () => {
        it('should create a new storage account', async () => {
            const account = await resourceGroup.createStorageAccount('newstorage', 'eastus');

            expect(account.getName()).toBe('newstorage');
        });
    });

    describe('createSearchService', () => {
        it('should create a new search service with default SKU', async () => {
            const searchService = await resourceGroup.createSearchService(
                'new-search-service',
                'eastus'
            );

            expect(searchService.getName()).toBe('new-search-service');
        });

        it('should create a search service with custom SKU', async () => {
            const searchService = await resourceGroup.createSearchService(
                'premium-search',
                'westus',
                'standard2'
            );

            expect(searchService).toBeDefined();
        });
    });

    describe('getAIService', () => {
        it('should return an AI service by name', async () => {
            const aiService = await resourceGroup.getAIService('openai-service');

            expect(aiService).not.toBeNull();
            expect(aiService!.getName()).toBe('openai-service');
        });

        it('should return null for non-existent AI service', async () => {
            const aiService = await resourceGroup.getAIService('nonexistent');

            expect(aiService).toBeNull();
        });

        it('should be case insensitive', async () => {
            const aiService = await resourceGroup.getAIService('OPENAI-SERVICE');

            expect(aiService).not.toBeNull();
        });

        it('should not match non-OpenAI services', async () => {
            const aiService = await resourceGroup.getAIService('other-service');

            expect(aiService).toBeNull();
        });
    });

    describe('getDocumentIntelligenceService', () => {
        it('should return a Document Intelligence service by name', async () => {
            const docService = await resourceGroup.getDocumentIntelligenceService('doc-intel');

            expect(docService).not.toBeNull();
            expect(docService!.getName()).toBe('doc-intel');
        });

        it('should return null for non-existent service', async () => {
            const docService = await resourceGroup.getDocumentIntelligenceService('nonexistent');

            expect(docService).toBeNull();
        });

        it('should be case insensitive', async () => {
            const docService = await resourceGroup.getDocumentIntelligenceService('DOC-INTEL');

            expect(docService).not.toBeNull();
        });

        it('should match both FormRecognizer and DocumentIntelligence kinds', async () => {
            // Add a DocumentIntelligence kind account
            mockSubscription.getCognitiveClient = () => ({
                accounts: {
                    listByResourceGroup: vi.fn().mockImplementation(async function* () {
                        yield { name: 'doc-intel-v2', kind: 'DocumentIntelligence' };
                    }),
                },
            });

            const docService = await resourceGroup.getDocumentIntelligenceService('doc-intel-v2');

            expect(docService).not.toBeNull();
        });
    });

    describe('getCognitiveServices', () => {
        it('should list all cognitive services', async () => {
            const services = await resourceGroup.getCognitiveServices();

            expect(services).toHaveLength(3);
            expect(services.map((s) => s.name)).toContain('openai-service');
            expect(services.map((s) => s.name)).toContain('doc-intel');
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../src/ai/ai-service';

// Mock openai
vi.mock('openai', () => ({
    AzureOpenAI: vi.fn().mockImplementation(() => ({
        chat: { completions: { create: vi.fn() } },
    })),
}));

describe('AIService', () => {
    let service: AIService;
    let mockResourceGroup: { getName: () => string };
    let mockCognitiveClient: {
        accounts: {
            listKeys: ReturnType<typeof vi.fn>;
        };
        models: {
            list: ReturnType<typeof vi.fn>;
        };
        deployments: {
            list: ReturnType<typeof vi.fn>;
            get: ReturnType<typeof vi.fn>;
            beginCreateOrUpdate: ReturnType<typeof vi.fn>;
            beginDelete: ReturnType<typeof vi.fn>;
        };
    };
    let mockAzureAccount: {
        name: string;
        location: string;
        kind: string;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockResourceGroup = {
            getName: () => 'test-resource-group',
        };

        mockCognitiveClient = {
            accounts: {
                listKeys: vi.fn().mockResolvedValue({
                    key1: 'api-key-1',
                    key2: 'api-key-2',
                }),
            },
            models: {
                list: vi.fn().mockImplementation(async function* () {
                    yield { kind: 'OpenAI', model: { name: 'gpt-4', version: '0613' } };
                    yield { kind: 'OpenAI', model: { name: 'gpt-35-turbo', version: '0613' } };
                }),
            },
            deployments: {
                list: vi.fn().mockImplementation(async function* () {
                    yield { name: 'gpt4-deployment', properties: { provisioningState: 'Succeeded' } };
                    yield { name: 'gpt35-deployment', properties: { provisioningState: 'Succeeded' } };
                }),
                get: vi.fn().mockResolvedValue({
                    name: 'gpt4-deployment',
                    properties: {
                        provisioningState: 'Succeeded',
                        model: { name: 'gpt-4' },
                    },
                }),
                beginCreateOrUpdate: vi.fn().mockResolvedValue({
                    pollUntilDone: vi.fn().mockResolvedValue({
                        name: 'new-deployment',
                        properties: { provisioningState: 'Succeeded' },
                    }),
                }),
                beginDelete: vi.fn().mockResolvedValue({
                    pollUntilDone: vi.fn().mockResolvedValue({}),
                }),
            },
        };

        mockAzureAccount = {
            name: 'test-openai-service',
            location: 'eastus',
            kind: 'OpenAI',
        };

        service = new AIService(
            mockResourceGroup as never,
            mockCognitiveClient as never,
            mockAzureAccount as never
        );
    });

    describe('getName', () => {
        it('should return the service name', () => {
            expect(service.getName()).toBe('test-openai-service');
        });

        it('should return empty string if name is undefined', () => {
            const serviceWithoutName = new AIService(
                mockResourceGroup as never,
                mockCognitiveClient as never,
                {} as never
            );
            expect(serviceWithoutName.getName()).toBe('');
        });
    });

    describe('getEndpoint', () => {
        it('should return correct endpoint URL', () => {
            expect(service.getEndpoint()).toBe('https://test-openai-service.openai.azure.com/');
        });
    });

    describe('getLocation', () => {
        it('should return the service location', () => {
            expect(service.getLocation()).toBe('eastus');
        });

        it('should return empty string if location is undefined', () => {
            const serviceWithoutLocation = new AIService(
                mockResourceGroup as never,
                mockCognitiveClient as never,
                { name: 'test' } as never
            );
            expect(serviceWithoutLocation.getLocation()).toBe('');
        });
    });

    describe('getAccount', () => {
        it('should return the underlying Azure account', () => {
            expect(service.getAccount()).toBe(mockAzureAccount);
        });
    });

    describe('getKeys', () => {
        it('should return API keys', async () => {
            const keys = await service.getKeys();

            expect(keys.key1).toBe('api-key-1');
            expect(keys.key2).toBe('api-key-2');
            expect(mockCognitiveClient.accounts.listKeys).toHaveBeenCalledWith(
                'test-resource-group',
                'test-openai-service'
            );
        });
    });

    describe('getOpenAIClient', () => {
        it('should return an OpenAIClient', async () => {
            const client = await service.getOpenAIClient();

            expect(client).toBeDefined();
        });

        it('should use custom API version when provided', async () => {
            const client = await service.getOpenAIClient('2024-02-01');

            expect(client).toBeDefined();
        });

        it('should throw error when no API key available', async () => {
            mockCognitiveClient.accounts.listKeys.mockResolvedValue({
                key1: undefined,
                key2: undefined,
            });

            await expect(service.getOpenAIClient()).rejects.toThrow('Failed to get API key');
        });
    });

    describe('getModels', () => {
        it('should list available models', async () => {
            const models = await service.getModels();

            expect(models).toHaveLength(2);
        });

        it('should use service location by default', async () => {
            await service.getModels();

            expect(mockCognitiveClient.models.list).toHaveBeenCalledWith('eastus');
        });

        it('should use custom location when provided', async () => {
            await service.getModels('westus');

            expect(mockCognitiveClient.models.list).toHaveBeenCalledWith('westus');
        });
    });

    describe('getModelDetails', () => {
        it('should extract model details', () => {
            const model = {
                kind: 'OpenAI',
                skuName: 'Standard',
                model: {
                    name: 'gpt-4',
                    format: 'OpenAI',
                    version: '0613',
                },
            };

            const details = AIService.getModelDetails(model);

            expect(details.kind).toBe('OpenAI');
            expect(details.name).toBe('gpt-4');
            expect(details.format).toBe('OpenAI');
            expect(details.version).toBe('0613');
            expect(details.skuName).toBe('Standard');
        });

        it('should handle missing model properties', () => {
            const details = AIService.getModelDetails({});

            expect(details.kind).toBeUndefined();
            expect(details.name).toBeUndefined();
        });
    });

    describe('getDeployments', () => {
        it('should list all deployments', async () => {
            const deployments = await service.getDeployments();

            expect(deployments).toHaveLength(2);
            expect(deployments[0].name).toBe('gpt4-deployment');
        });
    });

    describe('getDeployment', () => {
        it('should get a specific deployment', async () => {
            const deployment = await service.getDeployment('gpt4-deployment');

            expect(deployment.name).toBe('gpt4-deployment');
            expect(mockCognitiveClient.deployments.get).toHaveBeenCalledWith(
                'test-resource-group',
                'test-openai-service',
                'gpt4-deployment'
            );
        });
    });

    describe('getDeploymentDetails', () => {
        it('should extract deployment details', () => {
            const deployment = {
                name: 'my-deployment',
                properties: {
                    provisioningState: 'Succeeded',
                    model: { name: 'gpt-4' },
                    scaleSettings: {
                        scaleType: 'Standard',
                        capacity: 10,
                    },
                },
            };

            const details = AIService.getDeploymentDetails(deployment);

            expect(details.name).toBe('my-deployment');
            expect(details.status).toBe('Succeeded');
            expect(details.model).toEqual({ name: 'gpt-4' });
            expect(details.scaleSettings?.scaleType).toBe('Standard');
            expect(details.scaleSettings?.capacity).toBe(10);
        });

        it('should handle deployment without properties', () => {
            const deployment = { name: 'minimal' };

            const details = AIService.getDeploymentDetails(deployment as never);

            expect(details.name).toBe('minimal');
            expect(details.status).toBe('unknown');
        });

        it('should handle deployment without name', () => {
            const deployment = {};

            const details = AIService.getDeploymentDetails(deployment as never);

            expect(details.name).toBe('name not found');
        });
    });

    describe('createDeployment', () => {
        it('should create a new deployment', async () => {
            const deployment = await service.createDeployment({
                deploymentName: 'new-gpt4',
                modelFormat: 'OpenAI',
                modelName: 'gpt-4',
                modelVersion: '0613',
            });

            expect(deployment.name).toBe('new-deployment');
            expect(mockCognitiveClient.deployments.beginCreateOrUpdate).toHaveBeenCalledWith(
                'test-resource-group',
                'test-openai-service',
                'new-gpt4',
                expect.objectContaining({
                    properties: {
                        model: {
                            format: 'OpenAI',
                            name: 'gpt-4',
                            version: '0613',
                        },
                    },
                })
            );
        });

        it('should use default SKU values', async () => {
            await service.createDeployment({
                deploymentName: 'test',
                modelFormat: 'OpenAI',
                modelName: 'gpt-4',
                modelVersion: '0613',
            });

            expect(mockCognitiveClient.deployments.beginCreateOrUpdate).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.any(String),
                expect.objectContaining({
                    sku: {
                        name: 'Standard',
                        capacity: 1,
                    },
                })
            );
        });

        it('should use custom SKU values when provided', async () => {
            await service.createDeployment({
                deploymentName: 'test',
                modelFormat: 'OpenAI',
                modelName: 'gpt-4',
                modelVersion: '0613',
                skuName: 'Premium',
                skuCapacity: 5,
            });

            expect(mockCognitiveClient.deployments.beginCreateOrUpdate).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.any(String),
                expect.objectContaining({
                    sku: {
                        name: 'Premium',
                        capacity: 5,
                    },
                })
            );
        });
    });

    describe('deleteDeployment', () => {
        it('should delete a deployment', async () => {
            const result = await service.deleteDeployment('old-deployment');

            expect(result).toBe(true);
            expect(mockCognitiveClient.deployments.beginDelete).toHaveBeenCalledWith(
                'test-resource-group',
                'test-openai-service',
                'old-deployment'
            );
        });
    });
});

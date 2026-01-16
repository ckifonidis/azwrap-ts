import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentIntelligenceService } from '../src/document-intelligence/document-intelligence-service';

// Mock Azure Cognitive Services
vi.mock('@azure/core-auth', () => ({
    AzureKeyCredential: vi.fn().mockImplementation((key) => ({ key })),
}));

vi.mock('@azure/ai-form-recognizer', () => ({
    DocumentAnalysisClient: vi.fn().mockImplementation(() => ({
        beginAnalyzeDocument: vi.fn(),
    })),
}));

describe('DocumentIntelligenceService', () => {
    let service: DocumentIntelligenceService;
    let mockResourceGroup: { getName: () => string };
    let mockCognitiveClient: {
        accounts: {
            listKeys: ReturnType<typeof vi.fn>;
        };
    };
    let mockAzureAccount: {
        name: string;
        location: string;
        kind: string;
        id: string;
        sku: { name: string };
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockResourceGroup = {
            getName: () => 'test-resource-group',
        };

        mockCognitiveClient = {
            accounts: {
                listKeys: vi.fn().mockResolvedValue({
                    key1: 'primary-key',
                    key2: 'secondary-key',
                }),
            },
        };

        mockAzureAccount = {
            name: 'test-doc-intelligence',
            location: 'eastus',
            kind: 'FormRecognizer',
            id: '/subscriptions/xxx/resourceGroups/test/providers/Microsoft.CognitiveServices/accounts/test-doc-intelligence',
            sku: { name: 'S0' },
        };

        service = new DocumentIntelligenceService(
            mockResourceGroup as never,
            mockCognitiveClient as never,
            mockAzureAccount as never
        );
    });

    describe('properties', () => {
        it('should have correct name', () => {
            expect(service.name).toBe('test-doc-intelligence');
            expect(service.getName()).toBe('test-doc-intelligence');
        });

        it('should have correct location', () => {
            expect(service.location).toBe('eastus');
            expect(service.getLocation()).toBe('eastus');
        });

        it('should have correct endpoint', () => {
            expect(service.endpoint).toBe(
                'https://test-doc-intelligence.cognitiveservices.azure.com/'
            );
            expect(service.getEndpoint()).toBe(
                'https://test-doc-intelligence.cognitiveservices.azure.com/'
            );
        });

        it('should have correct kind', () => {
            expect(service.kind).toBe('FormRecognizer');
            expect(service.getKind()).toBe('FormRecognizer');
        });

        it('should have correct sku', () => {
            expect(service.sku).toBe('S0');
            expect(service.getSku()).toBe('S0');
        });

        it('should have correct id', () => {
            expect(service.id).toContain('test-doc-intelligence');
            expect(service.getId()).toContain('test-doc-intelligence');
        });
    });

    describe('with missing properties', () => {
        it('should handle undefined name', () => {
            const serviceWithoutName = new DocumentIntelligenceService(
                mockResourceGroup as never,
                mockCognitiveClient as never,
                {} as never
            );
            expect(serviceWithoutName.name).toBe('');
        });

        it('should handle undefined location', () => {
            const serviceWithoutLocation = new DocumentIntelligenceService(
                mockResourceGroup as never,
                mockCognitiveClient as never,
                { name: 'test' } as never
            );
            expect(serviceWithoutLocation.location).toBe('');
        });

        it('should handle undefined sku', () => {
            const serviceWithoutSku = new DocumentIntelligenceService(
                mockResourceGroup as never,
                mockCognitiveClient as never,
                { name: 'test' } as never
            );
            expect(serviceWithoutSku.sku).toBe('unknown');
        });
    });

    describe('getKeys', () => {
        it('should return primary and secondary keys', async () => {
            const keys = await service.getKeys();

            expect(keys.primary).toBe('primary-key');
            expect(keys.secondary).toBe('secondary-key');
            expect(mockCognitiveClient.accounts.listKeys).toHaveBeenCalledWith(
                'test-resource-group',
                'test-doc-intelligence'
            );
        });
    });

    describe('getCredential', () => {
        it('should return AzureKeyCredential with primary key', async () => {
            const credential = await service.getCredential();

            expect(credential).toBeDefined();
        });

        it('should cache the credential', async () => {
            await service.getCredential();
            await service.getCredential();

            // listKeys should only be called once due to caching
            expect(mockCognitiveClient.accounts.listKeys).toHaveBeenCalledTimes(1);
        });

        it('should throw error when no primary key available', async () => {
            mockCognitiveClient.accounts.listKeys.mockResolvedValue({
                key1: undefined,
                key2: 'secondary-key',
            });

            await expect(service.getCredential()).rejects.toThrow(
                'Failed to get API key'
            );
        });
    });

    describe('getDocumentAnalysisClient', () => {
        it('should return a DocumentAnalysisClientWrapper', async () => {
            const client = await service.getDocumentAnalysisClient();

            expect(client).toBeDefined();
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchService } from '../src/search/search-service';
import { SearchIndex } from '../src/search/search-index';

// Mock dependencies
vi.mock('@azure/search-documents', () => ({
    SearchIndexClient: vi.fn().mockImplementation(() => ({
        listIndexes: vi.fn().mockImplementation(async function* () {
            yield { name: 'index1', fields: [] };
            yield { name: 'index2', fields: [] };
        }),
        getIndex: vi.fn().mockResolvedValue({ name: 'test-index', fields: [] }),
        createOrUpdateIndex: vi.fn().mockResolvedValue({ name: 'test-index' }),
    })),
    SearchIndexerClient: vi.fn(),
}));

vi.mock('@azure/core-auth', () => ({
    AzureKeyCredential: vi.fn().mockImplementation((key) => ({ key })),
}));

vi.mock('@azure/arm-search', () => ({
    SearchManagementClient: vi.fn().mockImplementation(() => ({
        adminKeys: {
            get: vi.fn().mockResolvedValue({ primaryKey: 'test-admin-key' }),
        },
    })),
}));

describe('SearchService', () => {
    let searchService: SearchService;
    let mockSubscription: {
        subscriptionId: string;
        getIdentity: () => { getCredential: () => object };
    };
    let mockResourceGroup: { getName: () => string };
    let mockAzureSearchService: { name: string };

    beforeEach(() => {
        vi.clearAllMocks();

        mockSubscription = {
            subscriptionId: 'test-subscription-id',
            getIdentity: () => ({
                getCredential: () => ({}),
            }),
        };

        mockResourceGroup = {
            getName: () => 'test-resource-group',
        };

        mockAzureSearchService = {
            name: 'test-search-service',
        };

        searchService = new SearchService(
            mockSubscription as never,
            mockResourceGroup as never,
            mockAzureSearchService as never
        );
    });

    describe('getName', () => {
        it('should return the search service name', () => {
            expect(searchService.getName()).toBe('test-search-service');
        });

        it('should return empty string if name is undefined', () => {
            const serviceWithoutName = new SearchService(
                mockSubscription as never,
                mockResourceGroup as never,
                {} as never
            );
            expect(serviceWithoutName.getName()).toBe('');
        });
    });

    describe('getServiceEndpoint', () => {
        it('should return correct endpoint URL', () => {
            expect(searchService.getServiceEndpoint()).toBe(
                'https://test-search-service.search.windows.net'
            );
        });
    });

    describe('getAdminKey', () => {
        it('should fetch and cache admin key', async () => {
            const key = await searchService.getAdminKey();
            expect(key).toBe('test-admin-key');

            // Second call should use cached value
            const key2 = await searchService.getAdminKey();
            expect(key2).toBe('test-admin-key');
        });
    });

    describe('addSimpleField', () => {
        it('should create a simple field with default options', () => {
            const field = searchService.addSimpleField('id', 'Edm.String');

            expect(field.name).toBe('id');
            expect(field.type).toBe('Edm.String');
        });

        it('should create a key field', () => {
            const field = searchService.addSimpleField('id', 'Edm.String', { key: true });

            expect(field.key).toBe(true);
        });

        it('should create a field with all options', () => {
            const field = searchService.addSimpleField('price', 'Edm.Double', {
                key: false,
                filterable: true,
                sortable: true,
                facetable: true,
                hidden: false,
            });

            expect(field.name).toBe('price');
            expect(field.type).toBe('Edm.Double');
            expect(field.filterable).toBe(true);
            expect(field.sortable).toBe(true);
            expect(field.facetable).toBe(true);
            expect(field.hidden).toBe(false);
        });
    });

    describe('addSearchableField', () => {
        it('should create a searchable string field', () => {
            const field = searchService.addSearchableField('title');

            expect(field.name).toBe('title');
            expect(field.type).toBe('Edm.String');
            expect(field.searchable).toBe(true);
        });

        it('should create a collection field', () => {
            const field = searchService.addSearchableField('tags', { collection: true });

            expect(field.type).toBe('Collection(Edm.String)');
        });

        it('should support analyzer options', () => {
            const field = searchService.addSearchableField('content', {
                analyzerName: 'en.microsoft',
                searchAnalyzerName: 'en.lucene',
            });

            expect(field.analyzerName).toBe('en.microsoft');
            expect(field.searchAnalyzerName).toBe('en.lucene');
        });
    });

    describe('addSearchField', () => {
        it('should create a vector field', () => {
            const field = searchService.addSearchField('embedding', 'Collection(Edm.Single)', {
                searchable: true,
                vectorSearchDimensions: 1536,
                vectorSearchProfileName: 'default-profile',
            });

            expect(field.name).toBe('embedding');
            expect(field.type).toBe('Collection(Edm.Single)');
            expect(field.vectorSearchDimensions).toBe(1536);
            expect(field.vectorSearchProfileName).toBe('default-profile');
        });
    });

    describe('createOrUpdateIndex', () => {
        it('should return a SearchIndex instance', () => {
            const fields = [searchService.addSimpleField('id', 'Edm.String', { key: true })];

            const index = searchService.createOrUpdateIndex('my-index', fields);

            expect(index).toBeInstanceOf(SearchIndex);
        });
    });

    describe('createIndexerManager', () => {
        it('should return a SearchIndexerManager instance', () => {
            const manager = searchService.createIndexerManager();
            expect(manager).toBeDefined();
        });
    });
});

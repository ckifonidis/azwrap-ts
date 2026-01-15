import {
    SearchIndexClient,
    SearchIndexerClient,
    SearchIndex as AzureSearchIndex,
    SearchField,
    VectorSearch,
    SemanticConfiguration,
    SemanticSearch,
    SemanticPrioritizedFields,
} from '@azure/search-documents';
import { AzureKeyCredential } from '@azure/core-auth';
import { SearchManagementClient, SearchService as AzureSearchService } from '@azure/arm-search';
import type { Subscription } from '../resources/subscription';
import type { ResourceGroup } from '../resources/resource-group';
import { SearchIndex } from './search-index';
import { SearchIndexerManager } from './search-indexer-manager';

export interface FieldOptions {
    key?: boolean;
    filterable?: boolean;
    sortable?: boolean;
    facetable?: boolean;
    hidden?: boolean;
}

export interface SearchableFieldOptions extends FieldOptions {
    analyzerName?: string;
    searchAnalyzerName?: string;
    indexAnalyzerName?: string;
}

/**
 * Represents an Azure AI Search Service.
 */
export class SearchService {
    private subscription: Subscription;
    private resourceGroup: ResourceGroup;
    private searchService: AzureSearchService;
    private indexClient: SearchIndexClient | null = null;
    private adminKey: string | null = null;

    constructor(
        subscription: Subscription,
        resourceGroup: ResourceGroup,
        searchService: AzureSearchService
    ) {
        this.subscription = subscription;
        this.resourceGroup = resourceGroup;
        this.searchService = searchService;
    }

    /**
     * Get the search service name.
     */
    getName(): string {
        return this.searchService.name || '';
    }

    /**
     * Get the admin key for the search service.
     */
    async getAdminKey(): Promise<string> {
        if (this.adminKey) {
            return this.adminKey;
        }

        const searchMgmtClient = new SearchManagementClient(
            this.subscription.getIdentity().getCredential(),
            this.subscription.subscriptionId
        );

        const keys = await searchMgmtClient.adminKeys.get(
            this.resourceGroup.getName(),
            this.getName()
        );

        if (!keys.primaryKey) {
            throw new Error(`Failed to get admin key for search service ${this.getName()}`);
        }

        this.adminKey = keys.primaryKey;
        return this.adminKey;
    }

    /**
     * Get an Azure Key Credential for the search service.
     */
    async getCredential(): Promise<AzureKeyCredential> {
        return new AzureKeyCredential(await this.getAdminKey());
    }

    /**
     * Get the service endpoint URL.
     */
    getServiceEndpoint(): string {
        return `https://${this.getName()}.search.windows.net`;
    }

    /**
     * Get the SearchIndexClient.
     */
    async getIndexClient(): Promise<SearchIndexClient> {
        if (!this.indexClient) {
            this.indexClient = new SearchIndexClient(
                this.getServiceEndpoint(),
                await this.getCredential()
            );
        }
        return this.indexClient;
    }

    /**
     * Get all indexes in the search service.
     */
    async getIndexes(): Promise<AzureSearchIndex[]> {
        const client = await this.getIndexClient();
        const indexes: AzureSearchIndex[] = [];
        for await (const index of client.listIndexes()) {
            indexes.push(index);
        }
        return indexes;
    }

    /**
     * Get a specific index by name.
     *
     * @param indexName - Name of the index
     * @returns SearchIndex wrapper or null if not found
     */
    async getIndex(indexName: string): Promise<SearchIndex | null> {
        const client = await this.getIndexClient();
        try {
            const index = await client.getIndex(indexName);
            if (index && index.name === indexName) {
                return new SearchIndex(this, index.name, index.fields, index.vectorSearch);
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Create a simple field for the search index.
     *
     * @param fieldName - Name of the field
     * @param fieldType - Type of the field (e.g., 'Edm.String', 'Edm.Int32', 'Edm.Double', 'Edm.Boolean')
     * @param options - Field options
     * @returns SearchField configuration
     */
    addSimpleField(
        fieldName: string,
        fieldType: string,
        options: FieldOptions = {}
    ): SearchField {
        return {
            name: fieldName,
            type: fieldType,
            key: options.key,
            filterable: options.filterable,
            sortable: options.sortable,
            facetable: options.facetable,
            hidden: options.hidden,
        } as SearchField;
    }

    /**
     * Create a searchable field for the search index.
     *
     * @param fieldName - Name of the field
     * @param options - Field options including analyzer settings
     * @returns SearchField configuration
     */
    addSearchableField(
        fieldName: string,
        options: SearchableFieldOptions & { collection?: boolean } = {}
    ): SearchField {
        return {
            name: fieldName,
            type: options.collection ? 'Collection(Edm.String)' : 'Edm.String',
            searchable: true,
            key: options.key,
            filterable: options.filterable,
            sortable: options.sortable,
            facetable: options.facetable,
            hidden: options.hidden,
            analyzerName: options.analyzerName,
            searchAnalyzerName: options.searchAnalyzerName,
            indexAnalyzerName: options.indexAnalyzerName,
        } as SearchField;
    }

    /**
     * Create a search field (including vector fields) for the search index.
     *
     * @param fieldName - Name of the field
     * @param fieldType - Type of the field
     * @param options - Additional field options
     * @returns SearchField configuration
     */
    addSearchField(
        fieldName: string,
        fieldType: string,
        options: {
            searchable?: boolean;
            vectorSearchDimensions?: number;
            vectorSearchProfileName?: string;
        } = {}
    ): SearchField {
        return {
            name: fieldName,
            type: fieldType,
            searchable: options.searchable,
            vectorSearchDimensions: options.vectorSearchDimensions,
            vectorSearchProfileName: options.vectorSearchProfileName,
        } as SearchField;
    }

    /**
     * Create or update an index.
     *
     * @param indexName - Name of the index
     * @param fields - Array of search fields
     * @param vectorSearch - Optional vector search configuration
     * @returns SearchIndex wrapper
     */
    createOrUpdateIndex(
        indexName: string,
        fields: SearchField[],
        vectorSearch?: VectorSearch
    ): SearchIndex {
        return new SearchIndex(this, indexName, fields, vectorSearch);
    }

    /**
     * Add semantic configuration to an index.
     *
     * @param indexName - Name of the index
     * @param options - Semantic configuration options
     * @returns Promise resolving to updated Azure index
     */
    async addSemanticConfiguration(
        indexName: string,
        options: {
            titleField?: string;
            contentFields?: string[];
            keywordFields?: string[];
            semanticConfigName?: string;
        } = {}
    ): Promise<AzureSearchIndex> {
        const {
            titleField = 'title',
            contentFields = ['content'],
            keywordFields = ['tags'],
            semanticConfigName = 'default-semantic-config',
        } = options;

        const client = await this.getIndexClient();
        const index = await client.getIndex(indexName);

        const prioritizedFields: SemanticPrioritizedFields = {
            titleField: { name: titleField },
            contentFields: contentFields.map((f) => ({ name: f })),
            keywordsFields: keywordFields.map((f) => ({ name: f })),
        };

        const semanticConfig: SemanticConfiguration = {
            name: semanticConfigName,
            prioritizedFields,
        };

        const semanticSearch: SemanticSearch = {
            configurations: [semanticConfig],
        };

        index.semanticSearch = semanticSearch;

        return client.createOrUpdateIndex(index);
    }

    /**
     * Get a SearchIndexerClient for working with indexers.
     */
    async getIndexerClient(): Promise<SearchIndexerClient> {
        return new SearchIndexerClient(this.getServiceEndpoint(), await this.getCredential());
    }

    /**
     * Create a SearchIndexerManager for working with indexers, data sources, and skillsets.
     */
    createIndexerManager(): SearchIndexerManager {
        return new SearchIndexerManager(this);
    }
}

import {
    SearchClient,
    SearchIndex as AzureSearchIndex,
    SearchField,
    VectorSearch,
    SearchOptions,
    SearchResult,
    IndexDocumentsResult,
} from '@azure/search-documents';
import type { SearchService } from './search-service';

export interface BatchProcessOptions<T> {
    data: T[];
    batchSize?: number;
    processItem: (item: T) => Promise<Record<string, unknown>>;
}

export interface HybridSearchOptions {
    query: string;
    vectorField: string;
    vector: number[];
    top?: number;
    filter?: string;
    select?: string[];
}

/**
 * Represents a Search Index in Azure AI Search.
 */
export class SearchIndex {
    private searchService: SearchService;
    private indexName: string;
    private fields: SearchField[];
    private vectorSearch: VectorSearch | null;
    private azureIndex: AzureSearchIndex | null = null;

    constructor(
        searchService: SearchService,
        indexName: string,
        fields: SearchField[],
        vectorSearch?: VectorSearch
    ) {
        this.searchService = searchService;
        this.indexName = indexName;
        this.fields = fields;
        this.vectorSearch = vectorSearch || null;
    }

    /**
     * Get the index name.
     */
    getName(): string {
        return this.indexName;
    }

    /**
     * Get the fields of the index.
     */
    getFields(): SearchField[] {
        return this.fields;
    }

    /**
     * Get the vector search configuration.
     */
    getVectorSearch(): VectorSearch | null {
        return this.vectorSearch;
    }

    /**
     * Create or update the index in Azure.
     */
    async save(): Promise<AzureSearchIndex> {
        const client = await this.searchService.getIndexClient();

        const indexDefinition: AzureSearchIndex = {
            name: this.indexName,
            fields: this.fields,
            vectorSearch: this.vectorSearch || undefined,
        };

        this.azureIndex = await client.createOrUpdateIndex(indexDefinition);
        return this.azureIndex;
    }

    /**
     * Get a SearchClient for this index.
     *
     * @param indexName - Optional index name (defaults to this index)
     * @returns SearchClient instance
     */
    async getSearchClient(indexName?: string): Promise<SearchClient<Record<string, unknown>>> {
        const credential = await this.searchService.getCredential();
        return new SearchClient<Record<string, unknown>>(
            this.searchService.getServiceEndpoint(),
            indexName || this.indexName,
            credential
        );
    }

    /**
     * Extend the index schema with new fields.
     *
     * @param newFields - New fields to add to the index
     * @returns True if successful
     */
    async extendIndexSchema(newFields: SearchField[]): Promise<boolean> {
        const client = await this.searchService.getIndexClient();
        const existingIndex = await client.getIndex(this.indexName);

        // Add new fields
        const existingFieldNames = new Set(existingIndex.fields.map((f) => f.name));
        for (const field of newFields) {
            if (!existingFieldNames.has(field.name)) {
                existingIndex.fields.push(field);
            }
        }

        await client.createOrUpdateIndex(existingIndex);
        this.fields = existingIndex.fields;
        return true;
    }

    /**
     * Process and upload data in batches.
     *
     * @param options - Batch processing options
     * @returns Tuple of [successful count, failed count]
     */
    async processDataInBatches<T>(
        options: BatchProcessOptions<T>
    ): Promise<[number, number]> {
        const { data, batchSize = 100, processItem } = options;
        const searchClient = await this.getSearchClient();

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const documents: Record<string, unknown>[] = [];

            for (const item of batch) {
                try {
                    const doc = await processItem(item);
                    documents.push(doc);
                } catch {
                    failCount++;
                }
            }

            if (documents.length > 0) {
                try {
                    const result = await searchClient.uploadDocuments(documents);
                    successCount += result.results.filter((r) => r.succeeded).length;
                    failCount += result.results.filter((r) => !r.succeeded).length;
                } catch {
                    failCount += documents.length;
                }
            }
        }

        return [successCount, failCount];
    }

    /**
     * Upload documents to the index.
     *
     * @param documents - Documents to upload
     * @param indexName - Optional target index name
     * @returns Upload results
     */
    async uploadRows(
        documents: Record<string, unknown>[],
        indexName?: string
    ): Promise<IndexDocumentsResult> {
        const searchClient = await this.getSearchClient(indexName);
        return searchClient.uploadDocuments(documents);
    }

    /**
     * Copy data from one index to another.
     *
     * @param sourceIndexName - Source index name
     * @param targetIndexName - Target index name
     * @param fieldsToCopy - Optional specific fields to copy
     * @param batchSize - Batch size for copying
     * @returns Tuple of [successful count, failed count]
     */
    async copyIndexData(
        sourceIndexName: string,
        targetIndexName: string,
        fieldsToCopy?: string[],
        batchSize = 100
    ): Promise<[number, number]> {
        const sourceClient = await this.getSearchClient(sourceIndexName);
        const targetClient = await this.getSearchClient(targetIndexName);

        let successCount = 0;
        let failCount = 0;

        // Search all documents
        const searchResults = await sourceClient.search('*', {
            select: fieldsToCopy,
            top: 1000, // Adjust as needed
        });

        const documents: Record<string, unknown>[] = [];
        for await (const result of searchResults.results) {
            documents.push(result.document);
        }

        // Upload in batches
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            try {
                const result = await targetClient.uploadDocuments(batch);
                successCount += result.results.filter((r) => r.succeeded).length;
                failCount += result.results.filter((r) => !r.succeeded).length;
            } catch {
                failCount += batch.length;
            }
        }

        return [successCount, failCount];
    }

    /**
     * Copy the index structure to create a new index.
     *
     * @param fieldsToCopy - Optional specific fields to copy
     * @param newIndexName - Name for the new index
     * @returns The new Azure index
     */
    async copyIndexStructure(
        fieldsToCopy?: string[],
        newIndexName?: string
    ): Promise<AzureSearchIndex> {
        const client = await this.searchService.getIndexClient();
        const existingIndex = await client.getIndex(this.indexName);

        let fieldsToCopySet: Set<string> | null = null;
        if (fieldsToCopy) {
            fieldsToCopySet = new Set(fieldsToCopy);
        }

        const newFields = existingIndex.fields.filter(
            (f) => !fieldsToCopySet || fieldsToCopySet.has(f.name)
        );

        const newIndex: AzureSearchIndex = {
            name: newIndexName || `${this.indexName}-copy`,
            fields: newFields,
            vectorSearch: existingIndex.vectorSearch,
            semanticSearch: existingIndex.semanticSearch,
        };

        return client.createOrUpdateIndex(newIndex);
    }

    /**
     * Perform a search query.
     *
     * @param options - Search options
     * @returns Search results array
     */
    async performSearch(
        options: SearchOptions<Record<string, unknown>> & { query: string }
    ): Promise<SearchResult<Record<string, unknown>>[]> {
        const searchClient = await this.getSearchClient();
        const results = await searchClient.search(options.query, options);
        const searchResults: SearchResult<Record<string, unknown>>[] = [];
        for await (const result of results.results) {
            searchResults.push(result);
        }
        return searchResults;
    }

    /**
     * Perform a hybrid search (text + vector).
     *
     * @param options - Hybrid search options
     * @returns Array of search results
     */
    async performHybridSearch(options: HybridSearchOptions): Promise<SearchResult<Record<string, unknown>>[]> {
        const searchClient = await this.getSearchClient();

        const searchOptions: SearchOptions<Record<string, unknown>> = {
            top: options.top || 10,
            filter: options.filter,
            select: options.select,
            vectorSearchOptions: {
                queries: [
                    {
                        kind: 'vector',
                        fields: [options.vectorField],
                        vector: options.vector,
                        kNearestNeighborsCount: options.top || 10,
                    },
                ],
            },
        };

        const results = await searchClient.search(options.query, searchOptions);

        const searchResults: SearchResult<Record<string, unknown>>[] = [];
        for await (const result of results.results) {
            searchResults.push(result);
        }

        return searchResults;
    }

    /**
     * Delete the index.
     */
    async delete(): Promise<void> {
        const client = await this.searchService.getIndexClient();
        await client.deleteIndex(this.indexName);
    }
}

import { SearchIndexer, SearchIndexerStatus } from '@azure/search-documents';
import type { SearchIndexerManager } from './search-indexer-manager';

/**
 * Represents an indexer in Azure AI Search.
 */
export class Indexer {
    private manager: SearchIndexerManager;
    private indexer: SearchIndexer;

    constructor(manager: SearchIndexerManager, indexer: SearchIndexer) {
        this.manager = manager;
        this.indexer = indexer;
    }

    /**
     * Get the indexer name.
     */
    getName(): string {
        return this.indexer.name;
    }

    /**
     * Get the target index name.
     */
    getTargetIndexName(): string {
        return this.indexer.targetIndexName;
    }

    /**
     * Get the data source name.
     */
    getDataSourceName(): string {
        return this.indexer.dataSourceName;
    }

    /**
     * Get the skillset name.
     */
    getSkillsetName(): string | undefined {
        return this.indexer.skillsetName;
    }

    /**
     * Get the underlying indexer object.
     */
    getIndexer(): SearchIndexer {
        return this.indexer;
    }

    /**
     * Run the indexer.
     */
    async run(): Promise<void> {
        const client = await this.manager.getClient();
        await client.runIndexer(this.getName());
    }

    /**
     * Reset the indexer.
     */
    async reset(): Promise<void> {
        const client = await this.manager.getClient();
        await client.resetIndexer(this.getName());
    }

    /**
     * Get the indexer status.
     */
    async getStatus(): Promise<SearchIndexerStatus> {
        const client = await this.manager.getClient();
        return client.getIndexerStatus(this.getName());
    }

    /**
     * Update the indexer.
     *
     * @param updates - Partial updates to apply
     * @returns Updated Indexer
     */
    async update(updates: Partial<Omit<SearchIndexer, 'name'>>): Promise<Indexer> {
        const client = await this.manager.getClient();

        const updatedIndexer: SearchIndexer = {
            ...this.indexer,
            ...updates,
        };

        const result = await client.createOrUpdateIndexer(updatedIndexer);
        this.indexer = result;
        return this;
    }

    /**
     * Delete this indexer.
     */
    async delete(): Promise<void> {
        await this.manager.deleteIndexer(this.getName());
    }
}

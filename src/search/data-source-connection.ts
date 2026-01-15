import { SearchIndexerDataSourceConnection } from '@azure/search-documents';
import type { SearchIndexerManager } from './search-indexer-manager';

/**
 * Represents a data source connection in Azure AI Search.
 */
export class DataSourceConnection {
    private manager: SearchIndexerManager;
    private dataSource: SearchIndexerDataSourceConnection;

    constructor(manager: SearchIndexerManager, dataSource: SearchIndexerDataSourceConnection) {
        this.manager = manager;
        this.dataSource = dataSource;
    }

    /**
     * Get the data source name.
     */
    getName(): string {
        return this.dataSource.name;
    }

    /**
     * Get the data source type.
     */
    getType(): string {
        return this.dataSource.type;
    }

    /**
     * Get the underlying data source connection object.
     */
    getDataSource(): SearchIndexerDataSourceConnection {
        return this.dataSource;
    }

    /**
     * Update the data source connection.
     *
     * @param updates - Partial updates to apply
     * @returns Updated DataSourceConnection
     */
    async update(
        updates: Partial<Omit<SearchIndexerDataSourceConnection, 'name'>>
    ): Promise<DataSourceConnection> {
        const client = await this.manager.getClient();

        const updatedDataSource: SearchIndexerDataSourceConnection = {
            ...this.dataSource,
            ...updates,
        };

        const result = await client.createOrUpdateDataSourceConnection(updatedDataSource);
        this.dataSource = result;
        return this;
    }

    /**
     * Delete this data source connection.
     */
    async delete(): Promise<void> {
        await this.manager.deleteDataSourceConnection(this.getName());
    }
}

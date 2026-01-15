import {
    SearchIndexerClient,
    SearchIndexer,
    SearchIndexerDataSourceConnection,
    SearchIndexerSkillset,
    SearchIndexerDataContainer,
    IndexingSchedule,
    FieldMapping,
    IndexingParameters,
    SearchIndexerSkill,
} from '@azure/search-documents';
import type { SearchService } from './search-service';
import { DataSourceConnection } from './data-source-connection';
import { Indexer } from './indexer';
import { Skillset } from './skillset';

export interface CreateDataSourceOptions {
    name: string;
    type: 'azureblob' | 'azuretable' | 'azuresql' | 'cosmosdb';
    connectionString: string;
    container: SearchIndexerDataContainer;
}

export interface CreateIndexerOptions {
    name: string;
    dataSourceName: string;
    targetIndexName: string;
    skillsetName?: string;
    schedule?: IndexingSchedule;
    fieldMappings?: FieldMapping[];
    outputFieldMappings?: FieldMapping[];
    parameters?: IndexingParameters;
}

export interface CreateSkillsetOptions {
    name: string;
    skills: SearchIndexerSkill[];
    description?: string;
}

/**
 * Manager for Azure AI Search indexers, data sources, and skillsets.
 */
export class SearchIndexerManager {
    private searchService: SearchService;
    private indexerClient: SearchIndexerClient | null = null;

    constructor(searchService: SearchService) {
        this.searchService = searchService;
    }

    /**
     * Get the SearchIndexerClient.
     */
    async getClient(): Promise<SearchIndexerClient> {
        if (!this.indexerClient) {
            this.indexerClient = await this.searchService.getIndexerClient();
        }
        return this.indexerClient;
    }

    // Data Source Connection methods

    /**
     * Get all data source connections.
     */
    async getDataSourceConnections(): Promise<DataSourceConnection[]> {
        const client = await this.getClient();
        const dataSources = await client.listDataSourceConnections();
        return dataSources.map((ds) => new DataSourceConnection(this, ds));
    }

    /**
     * Get a data source connection by name.
     *
     * @param name - Name of the data source
     * @returns DataSourceConnection or null if not found
     */
    async getDataSourceConnection(name: string): Promise<DataSourceConnection | null> {
        const client = await this.getClient();
        try {
            const dataSource = await client.getDataSourceConnection(name);
            return new DataSourceConnection(this, dataSource);
        } catch {
            return null;
        }
    }

    /**
     * Create a new data source connection.
     *
     * @param options - Data source options
     * @returns Created DataSourceConnection
     */
    async createDataSourceConnection(
        options: CreateDataSourceOptions
    ): Promise<DataSourceConnection> {
        const client = await this.getClient();

        const dataSource: SearchIndexerDataSourceConnection = {
            name: options.name,
            type: options.type,
            connectionString: options.connectionString,
            container: options.container,
        };

        const result = await client.createDataSourceConnection(dataSource);
        return new DataSourceConnection(this, result);
    }

    /**
     * Delete a data source connection.
     *
     * @param name - Name of the data source to delete
     */
    async deleteDataSourceConnection(name: string): Promise<void> {
        const client = await this.getClient();
        await client.deleteDataSourceConnection(name);
    }

    // Indexer methods

    /**
     * Get all indexers.
     */
    async getIndexers(): Promise<Indexer[]> {
        const client = await this.getClient();
        const indexers = await client.listIndexers();
        return indexers.map((indexer) => new Indexer(this, indexer));
    }

    /**
     * Get an indexer by name.
     *
     * @param name - Name of the indexer
     * @returns Indexer or null if not found
     */
    async getIndexer(name: string): Promise<Indexer | null> {
        const client = await this.getClient();
        try {
            const indexer = await client.getIndexer(name);
            return new Indexer(this, indexer);
        } catch {
            return null;
        }
    }

    /**
     * Create a new indexer.
     *
     * @param options - Indexer options
     * @returns Created Indexer
     */
    async createIndexer(options: CreateIndexerOptions): Promise<Indexer> {
        const client = await this.getClient();

        const indexer: SearchIndexer = {
            name: options.name,
            dataSourceName: options.dataSourceName,
            targetIndexName: options.targetIndexName,
            skillsetName: options.skillsetName,
            schedule: options.schedule,
            fieldMappings: options.fieldMappings,
            outputFieldMappings: options.outputFieldMappings,
            parameters: options.parameters,
        };

        const result = await client.createIndexer(indexer);
        return new Indexer(this, result);
    }

    /**
     * Delete an indexer.
     *
     * @param name - Name of the indexer to delete
     */
    async deleteIndexer(name: string): Promise<void> {
        const client = await this.getClient();
        await client.deleteIndexer(name);
    }

    // Skillset methods

    /**
     * Get all skillsets.
     */
    async getSkillsets(): Promise<Skillset[]> {
        const client = await this.getClient();
        const skillsets = await client.listSkillsets();
        return skillsets.map((skillset) => new Skillset(this, skillset));
    }

    /**
     * Get a skillset by name.
     *
     * @param name - Name of the skillset
     * @returns Skillset or null if not found
     */
    async getSkillset(name: string): Promise<Skillset | null> {
        const client = await this.getClient();
        try {
            const skillset = await client.getSkillset(name);
            return new Skillset(this, skillset);
        } catch {
            return null;
        }
    }

    /**
     * Create a new skillset.
     *
     * @param options - Skillset options
     * @returns Created Skillset
     */
    async createSkillset(options: CreateSkillsetOptions): Promise<Skillset> {
        const client = await this.getClient();

        const skillset: SearchIndexerSkillset = {
            name: options.name,
            skills: options.skills,
            description: options.description,
        };

        const result = await client.createSkillset(skillset);
        return new Skillset(this, result);
    }

    /**
     * Delete a skillset.
     *
     * @param name - Name of the skillset to delete
     */
    async deleteSkillset(name: string): Promise<void> {
        const client = await this.getClient();
        await client.deleteSkillset(name);
    }
}

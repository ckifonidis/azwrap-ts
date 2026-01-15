import { TableClient, TableServiceClient, TableEntity } from '@azure/data-tables';
import * as fs from 'fs';
import type { StorageAccount } from './storage-account';

/**
 * Represents Azure Table Storage operations.
 */
export class Table {
    private storageAccount: StorageAccount;
    private tableServiceClient: TableServiceClient;

    constructor(storageAccount: StorageAccount) {
        this.storageAccount = storageAccount;
        this.tableServiceClient = TableServiceClient.fromConnectionString(
            storageAccount.getConnectionString()
        );
    }

    /**
     * Get the TableServiceClient.
     */
    getServiceClient(): TableServiceClient {
        return this.tableServiceClient;
    }

    /**
     * Get a TableClient for a specific table.
     *
     * @param tableName - Name of the table
     * @returns TableClient instance
     */
    getTableClient(tableName: string): TableClient {
        return TableClient.fromConnectionString(
            this.storageAccount.getConnectionString(),
            tableName
        );
    }

    /**
     * List all tables in the storage account.
     */
    async getTables(): Promise<string[]> {
        const tables: string[] = [];
        for await (const table of this.tableServiceClient.listTables()) {
            if (table.name) {
                tables.push(table.name);
            }
        }
        return tables;
    }

    /**
     * Create a new table.
     *
     * @param tableName - Name of the table to create
     * @returns TableClient for the created table
     */
    async createTable(tableName: string): Promise<TableClient> {
        await this.tableServiceClient.createTable(tableName);
        return this.getTableClient(tableName);
    }

    /**
     * Delete a table.
     *
     * @param tableName - Name of the table to delete
     * @returns The name of the deleted table
     */
    async deleteTable(tableName: string): Promise<string> {
        await this.tableServiceClient.deleteTable(tableName);
        return tableName;
    }

    /**
     * Get all entities from a table.
     *
     * @param tableName - Name of the table
     * @returns Promise resolving to array of entities
     */
    async getEntities<T extends object = Record<string, unknown>>(
        tableName: string
    ): Promise<T[]> {
        const tableClient = this.getTableClient(tableName);
        const entities: T[] = [];

        for await (const entity of tableClient.listEntities<TableEntity<T>>()) {
            entities.push(entity as unknown as T);
        }

        return entities;
    }

    /**
     * Upload entities from a CSV file to a table.
     *
     * @param csvPath - Path to the CSV file
     * @param tableName - Name of the table
     * @param tableSchema - Array of column names
     * @param delimiter - CSV delimiter (default: ',')
     * @returns Status message
     */
    async uploadEntitiesFromCsv(
        csvPath: string,
        tableName: string,
        tableSchema: string[],
        delimiter = ','
    ): Promise<string> {
        const tableClient = this.getTableClient(tableName);
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim());

        // Skip header if present
        const dataLines = lines[0].split(delimiter).length === tableSchema.length ? lines : lines.slice(1);

        let uploadedCount = 0;

        for (const line of dataLines) {
            const values = line.split(delimiter);
            if (values.length !== tableSchema.length) {
                continue;
            }

            const entity: { partitionKey: string; rowKey: string; [key: string]: string } = {
                partitionKey: 'default',
                rowKey: String(Date.now()) + '-' + Math.random().toString(36).substr(2, 9),
            };

            tableSchema.forEach((col, idx) => {
                entity[col] = values[idx].trim();
            });

            await tableClient.createEntity(entity as TableEntity<Record<string, string>>);
            uploadedCount++;
        }

        return `Uploaded ${uploadedCount} entities to table ${tableName}`;
    }

    /**
     * Delete entities matching criteria from a CSV file.
     *
     * @param csvPath - Path to the CSV file with keys
     * @param tableName - Name of the table
     * @param tableSchema - Array of column names (must include partitionKey and rowKey)
     * @param delimiter - CSV delimiter (default: ',')
     * @returns Status message
     */
    async deleteEntitiesFromCsv(
        csvPath: string,
        tableName: string,
        tableSchema: string[],
        delimiter = ','
    ): Promise<string> {
        const tableClient = this.getTableClient(tableName);
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim());

        const partitionKeyIdx = tableSchema.indexOf('partitionKey');
        const rowKeyIdx = tableSchema.indexOf('rowKey');

        if (partitionKeyIdx === -1 || rowKeyIdx === -1) {
            throw new Error('tableSchema must include partitionKey and rowKey');
        }

        let deletedCount = 0;

        for (const line of lines.slice(1)) {
            // Skip header
            const values = line.split(delimiter);
            if (values.length !== tableSchema.length) {
                continue;
            }

            const partitionKey = values[partitionKeyIdx].trim();
            const rowKey = values[rowKeyIdx].trim();

            try {
                await tableClient.deleteEntity(partitionKey, rowKey);
                deletedCount++;
            } catch {
                // Entity might not exist, continue
            }
        }

        return `Deleted ${deletedCount} entities from table ${tableName}`;
    }

    /**
     * Add a single entity to a table.
     *
     * @param tableName - Name of the table
     * @param entity - Entity to add
     */
    async addEntity<T extends object>(
        tableName: string,
        entity: T & { partitionKey: string; rowKey: string }
    ): Promise<void> {
        const tableClient = this.getTableClient(tableName);
        await tableClient.createEntity(entity);
    }

    /**
     * Update an entity in a table.
     *
     * @param tableName - Name of the table
     * @param entity - Entity to update
     */
    async updateEntity<T extends object>(
        tableName: string,
        entity: T & { partitionKey: string; rowKey: string }
    ): Promise<void> {
        const tableClient = this.getTableClient(tableName);
        await tableClient.updateEntity(entity, 'Merge');
    }

    /**
     * Delete an entity from a table.
     *
     * @param tableName - Name of the table
     * @param partitionKey - Partition key of the entity
     * @param rowKey - Row key of the entity
     */
    async deleteEntity(
        tableName: string,
        partitionKey: string,
        rowKey: string
    ): Promise<void> {
        const tableClient = this.getTableClient(tableName);
        await tableClient.deleteEntity(partitionKey, rowKey);
    }
}

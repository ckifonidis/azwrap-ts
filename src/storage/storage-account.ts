import {
    BlobServiceClient,
    ContainerClient,
    ContainerItem,
    PublicAccessType,
} from '@azure/storage-blob';
import { StorageAccount as AzureStorageAccount } from '@azure/arm-storage';
import type { ResourceGroup } from '../resources/resource-group';
import { ResourceNotFoundError } from '../errors';
import { Container } from './container';
import { Table } from './table';

/**
 * Validate container name according to Azure Storage naming rules.
 */
export function validateContainerName(containerName: string): boolean {
    if (!containerName || containerName.length < 3 || containerName.length > 63) {
        throw new Error('Container name must be between 3-63 characters');
    }

    if (containerName !== containerName.toLowerCase()) {
        throw new Error('Container name must be lowercase');
    }

    if (!/^[a-z0-9-]+$/.test(containerName)) {
        throw new Error(
            'Container name can only contain lowercase letters, numbers, and hyphens'
        );
    }

    if (
        containerName.startsWith('-') ||
        containerName.endsWith('-') ||
        containerName.includes('--')
    ) {
        throw new Error(
            'Container name cannot start or end with hyphens or contain consecutive hyphens'
        );
    }

    return true;
}

/**
 * Represents an Azure Storage Account with blob and table operations.
 */
export class StorageAccount {
    private resourceGroup: ResourceGroup;
    private storageAccount: AzureStorageAccount;
    private storageKey: string;
    private connectionString: string;

    constructor(resourceGroup: ResourceGroup, storageAccount: AzureStorageAccount) {
        this.resourceGroup = resourceGroup;
        this.storageAccount = storageAccount;
        this.storageKey = '';
        this.connectionString = '';
    }

    /**
     * Initialize the storage account by fetching the access key.
     * Must be called after construction.
     */
    async initialize(): Promise<void> {
        const client = this.resourceGroup.getStorageManagementClient();
        const keys = await client.storageAccounts.listKeys(
            this.resourceGroup.getName(),
            this.getName()
        );

        if (!keys.keys || keys.keys.length === 0 || !keys.keys[0].value) {
            throw new Error(`Failed to get storage keys for account ${this.getName()}`);
        }

        this.storageKey = keys.keys[0].value;
        this.connectionString = `DefaultEndpointsProtocol=https;AccountName=${this.getName()};AccountKey=${this.storageKey};EndpointSuffix=core.windows.net`;
    }

    /**
     * Static factory method to create and initialize a StorageAccount.
     */
    static async create(
        resourceGroup: ResourceGroup,
        storageAccount: AzureStorageAccount
    ): Promise<StorageAccount> {
        const account = new StorageAccount(resourceGroup, storageAccount);
        await account.initialize();
        return account;
    }

    /**
     * Get the storage account name.
     */
    getName(): string {
        return this.storageAccount.name || '';
    }

    /**
     * Get the connection string.
     */
    getConnectionString(): string {
        return this.connectionString;
    }

    /**
     * Get the BlobServiceClient.
     */
    getBlobServiceClient(): BlobServiceClient {
        return BlobServiceClient.fromConnectionString(this.connectionString);
    }

    /**
     * Get a ContainerClient for the specified container.
     */
    getContainerClient(containerName: string): ContainerClient {
        return this.getBlobServiceClient().getContainerClient(containerName);
    }

    /**
     * Get a Table client for this storage account.
     */
    getTablesClient(): Table {
        return new Table(this);
    }

    /**
     * List all containers in the storage account.
     */
    async getContainers(): Promise<ContainerItem[]> {
        const client = this.getBlobServiceClient();
        const containers: ContainerItem[] = [];

        for await (const container of client.listContainers()) {
            containers.push(container);
        }

        return containers;
    }

    /**
     * Get a specific container by name.
     *
     * @param containerName - Name of the container
     * @returns Promise resolving to Container wrapper
     */
    async getContainer(containerName: string): Promise<Container> {
        const client = this.getBlobServiceClient();
        const containerClient = client.getContainerClient(containerName);

        // Check if container exists
        const exists = await containerClient.exists();
        if (!exists) {
            throw new ResourceNotFoundError(`Container with name ${containerName} not found.`);
        }

        return new Container(this, containerClient);
    }

    /**
     * Convert public access level string to Azure enum.
     */
    private static getAccessLevel(publicAccessLevel?: string): PublicAccessType | undefined {
        if (!publicAccessLevel) {
            return undefined;
        }

        const level = publicAccessLevel.toLowerCase();
        if (level === 'container') {
            return 'container';
        } else if (level === 'blob') {
            return 'blob';
        } else {
            throw new Error("public_access_level must be 'container', 'blob', or undefined");
        }
    }

    /**
     * Create a new container in the storage account.
     *
     * @param containerName - Name of the container to create
     * @param publicAccessLevel - Optional level of public access ('container', 'blob', or undefined)
     * @returns Promise resolving to created Container wrapper
     */
    async createContainer(
        containerName: string,
        publicAccessLevel?: 'container' | 'blob'
    ): Promise<Container> {
        validateContainerName(containerName);

        const accessLevel = StorageAccount.getAccessLevel(publicAccessLevel);
        const blobServiceClient = this.getBlobServiceClient();

        const containerClient = await blobServiceClient.createContainer(containerName, {
            access: accessLevel,
        });

        return new Container(this, containerClient.containerClient);
    }

    /**
     * Delete a container from the storage account.
     *
     * @param containerName - Name of the container to delete
     * @param force - If true, deletes even if not empty
     * @returns Promise resolving to true if deleted successfully
     */
    async deleteContainer(containerName: string, force = false): Promise<boolean> {
        const blobServiceClient = this.getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Check if container exists
        const exists = await containerClient.exists();
        if (!exists) {
            throw new ResourceNotFoundError(`Container with name ${containerName} not found.`);
        }

        // Check if container is empty when force is false
        if (!force) {
            const iterator = containerClient.listBlobsFlat().byPage({ maxPageSize: 1 });
            const response = await iterator.next();
            if (response.value && response.value.segment.blobItems.length > 0) {
                throw new Error(
                    `Container '${containerName}' is not empty. Set force=true to delete anyway.`
                );
            }
        }

        await containerClient.delete();
        return true;
    }
}

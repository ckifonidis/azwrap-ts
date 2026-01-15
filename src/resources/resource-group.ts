import { ResourceGroup as AzureResourceGroup, GenericResource } from '@azure/arm-resources';
import { SearchManagementClient } from '@azure/arm-search';
import { StorageManagementClient } from '@azure/arm-storage';
import { Account } from '@azure/arm-cognitiveservices';
import type { Subscription } from './subscription';
import { ResourceNotFoundError } from '../errors';

/**
 * Represents an Azure Resource Group with resource management capabilities.
 */
export class ResourceGroup {
    private subscription: Subscription;
    private azureResourceGroup: AzureResourceGroup;

    constructor(subscription: Subscription, azureResourceGroup: AzureResourceGroup) {
        this.subscription = subscription;
        this.azureResourceGroup = azureResourceGroup;
    }

    /**
     * Get the resource group name.
     */
    getName(): string {
        return this.azureResourceGroup.name || '';
    }

    /**
     * Get the resource group location.
     */
    getLocation(): string {
        return this.azureResourceGroup.location || '';
    }

    /**
     * Get the underlying subscription.
     */
    getSubscription(): Subscription {
        return this.subscription;
    }

    /**
     * Get all resources in the resource group.
     */
    async getResources(): Promise<GenericResource[]> {
        const resources: GenericResource[] = [];
        const resourceClient = this.subscription.getResourceClient();
        for await (const resource of resourceClient.resources.listByResourceGroup(this.getName())) {
            resources.push(resource);
        }
        return resources;
    }

    /**
     * Get the storage management client.
     */
    getStorageManagementClient(): StorageManagementClient {
        return this.subscription.getStorageManagementClient();
    }

    /**
     * Create a new search service in this resource group.
     *
     * @param name - Name for the search service
     * @param location - Azure region location
     * @param sku - SKU tier (default: 'basic')
     * @returns Promise resolving to SearchService wrapper
     */
    async createSearchService(
        name: string,
        location: string,
        sku: 'free' | 'basic' | 'standard' | 'standard2' | 'standard3' = 'basic'
    ): Promise<import('../search/search-service').SearchService> {
        const searchMgmtClient = new SearchManagementClient(
            this.subscription.getIdentity().getCredential(),
            this.subscription.subscriptionId
        );

        const poller = await searchMgmtClient.services.beginCreateOrUpdate(
            this.getName(),
            name,
            {
                location,
                sku: { name: sku },
            }
        );

        const searchService = await poller.pollUntilDone();
        const { SearchService } = await import('../search/search-service');
        return new SearchService(this.subscription, this, searchService);
    }

    /**
     * Get a storage account by name.
     *
     * @param accountName - Name of the storage account
     * @returns Promise resolving to StorageAccount wrapper
     * @throws ResourceNotFoundError if not found
     */
    async getStorageAccount(
        accountName: string
    ): Promise<import('../storage/storage-account').StorageAccount> {
        const storageClient = this.getStorageManagementClient();
        try {
            const account = await storageClient.storageAccounts.getProperties(
                this.getName(),
                accountName
            );
            if (!account) {
                throw new ResourceNotFoundError(
                    `Storage account with name ${accountName} not found.`
                );
            }
            const { StorageAccount } = await import('../storage/storage-account');
            return new StorageAccount(this, account);
        } catch (error) {
            if (error instanceof ResourceNotFoundError) {
                throw error;
            }
            throw new ResourceNotFoundError(
                `Storage account with name ${accountName} not found. ${error instanceof Error ? error.message : ''}`
            );
        }
    }

    /**
     * Create a new storage account.
     *
     * @param accountName - Name for the storage account
     * @param location - Azure region location
     * @returns Promise resolving to created StorageAccount wrapper
     */
    async createStorageAccount(
        accountName: string,
        location: string
    ): Promise<import('../storage/storage-account').StorageAccount> {
        const storageClient = this.getStorageManagementClient();

        const poller = await storageClient.storageAccounts.beginCreate(
            this.getName(),
            accountName,
            {
                sku: { name: 'Standard_LRS' },
                kind: 'StorageV2',
                location,
            }
        );

        const account = await poller.pollUntilDone();
        const { StorageAccount } = await import('../storage/storage-account');
        return new StorageAccount(this, account);
    }

    /**
     * Get an AI (OpenAI) service by name.
     *
     * @param serviceName - Name of the AI service
     * @returns Promise resolving to AIService wrapper or null if not found
     */
    async getAIService(
        serviceName: string
    ): Promise<import('../ai/ai-service').AIService | null> {
        const cognitiveClient = this.subscription.getCognitiveClient();
        const accounts: Account[] = [];

        for await (const account of cognitiveClient.accounts.listByResourceGroup(this.getName())) {
            accounts.push(account);
        }

        for (const account of accounts) {
            if (
                account.kind?.toLowerCase() === 'openai' &&
                account.name?.toLowerCase() === serviceName.toLowerCase()
            ) {
                const { AIService } = await import('../ai/ai-service');
                return new AIService(this, cognitiveClient, account);
            }
        }

        return null;
    }

    /**
     * Get a Document Intelligence service by name.
     *
     * @param serviceName - Name of the Document Intelligence service
     * @returns Promise resolving to DocumentIntelligenceService wrapper or null if not found
     */
    async getDocumentIntelligenceService(
        serviceName: string
    ): Promise<import('../document-intelligence/document-intelligence-service').DocumentIntelligenceService | null> {
        const cognitiveClient = this.subscription.getCognitiveClient();
        const accounts: Account[] = [];

        for await (const account of cognitiveClient.accounts.listByResourceGroup(this.getName())) {
            accounts.push(account);
        }

        for (const account of accounts) {
            const kind = account.kind?.toLowerCase();
            if (
                (kind === 'formrecognizer' || kind === 'documentintelligence') &&
                account.name?.toLowerCase() === serviceName.toLowerCase()
            ) {
                const { DocumentIntelligenceService } = await import(
                    '../document-intelligence/document-intelligence-service'
                );
                return new DocumentIntelligenceService(this, cognitiveClient, account);
            }
        }

        return null;
    }

    /**
     * Get all cognitive services in the resource group.
     */
    async getCognitiveServices(): Promise<Account[]> {
        const cognitiveClient = this.subscription.getCognitiveClient();
        const accounts: Account[] = [];

        for await (const account of cognitiveClient.accounts.listByResourceGroup(this.getName())) {
            accounts.push(account);
        }

        return accounts;
    }
}

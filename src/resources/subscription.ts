import { ResourceManagementClient, ResourceGroup as AzureResourceGroup } from '@azure/arm-resources';
import { StorageManagementClient, StorageAccount as AzureStorageAccount } from '@azure/arm-storage';
import { SearchManagementClient, SearchService as AzureSearchService } from '@azure/arm-search';
import { CognitiveServicesManagementClient } from '@azure/arm-cognitiveservices';
import { Subscription as AzureSubscription } from '@azure/arm-subscriptions';
import type { Identity } from '../identity';
import { ResourceGroup } from './resource-group';

/**
 * Represents an Azure Subscription with resource management capabilities.
 */
export class Subscription {
    private identity: Identity;
    private subscription: AzureSubscription;
    private resourceClient: ResourceManagementClient;
    private storageClient: StorageManagementClient;

    public readonly subscriptionId: string;

    constructor(identity: Identity, subscription: AzureSubscription, subscriptionId: string) {
        this.identity = identity;
        this.subscription = subscription;
        this.subscriptionId = subscriptionId;
        this.resourceClient = new ResourceManagementClient(
            identity.getCredential(),
            subscriptionId
        );
        this.storageClient = new StorageManagementClient(identity.getCredential(), subscriptionId);
    }

    /**
     * Get the underlying Identity.
     */
    getIdentity(): Identity {
        return this.identity;
    }

    /**
     * Get the subscription display name.
     */
    getDisplayName(): string | undefined {
        return this.subscription.displayName;
    }

    /**
     * Get a resource group by name.
     *
     * @param groupName - Name of the resource group
     * @returns Promise resolving to ResourceGroup wrapper
     * @throws Error if resource group not found
     */
    async getResourceGroup(groupName: string): Promise<ResourceGroup> {
        for await (const group of this.resourceClient.resourceGroups.list()) {
            if (group.name?.toLowerCase() === groupName.toLowerCase()) {
                return new ResourceGroup(this, group);
            }
        }
        throw new Error(`Resource group with name ${groupName} not found.`);
    }

    /**
     * Create a new resource group.
     *
     * @param groupName - Name for the new resource group
     * @param location - Azure region location
     * @returns Promise resolving to created ResourceGroup wrapper
     */
    async createResourceGroup(groupName: string, location: string): Promise<ResourceGroup> {
        const result = await this.resourceClient.resourceGroups.createOrUpdate(groupName, {
            location,
        });
        if (!result) {
            throw new Error(`Failed to create resource group with name ${groupName}.`);
        }
        return new ResourceGroup(this, result);
    }

    /**
     * List all resource groups in the subscription.
     */
    async listResourceGroups(): Promise<AzureResourceGroup[]> {
        const groups: AzureResourceGroup[] = [];
        for await (const group of this.resourceClient.resourceGroups.list()) {
            groups.push(group);
        }
        return groups;
    }

    /**
     * Get all search services in the subscription.
     */
    async getSearchServices(): Promise<AzureSearchService[]> {
        const searchMgmtClient = new SearchManagementClient(
            this.identity.getCredential(),
            this.subscriptionId
        );
        const services: AzureSearchService[] = [];
        for await (const service of searchMgmtClient.services.listBySubscription()) {
            services.push(service);
        }
        return services;
    }

    /**
     * Get a specific search service by name.
     *
     * @param serviceName - Name of the search service
     * @returns Promise resolving to SearchService wrapper
     * @throws Error if service not found
     */
    async getSearchService(serviceName: string): Promise<import('../search/search-service').SearchService> {
        const services = await this.getSearchServices();
        for (const service of services) {
            if (service.name === serviceName) {
                // Extract resource group name from service ID
                const resourceGroupName = service.id?.split('/')[4];
                if (!resourceGroupName) {
                    throw new Error(`Could not determine resource group for service ${serviceName}`);
                }
                const resourceGroup = await this.getResourceGroup(resourceGroupName);
                const { SearchService } = await import('../search/search-service');
                return new SearchService(this, resourceGroup, service);
            }
        }
        throw new Error(`Search service with name ${serviceName} not found.`);
    }

    /**
     * Get the storage management client.
     */
    getStorageManagementClient(): StorageManagementClient {
        return this.storageClient;
    }

    /**
     * Get all storage accounts in the subscription.
     */
    async getStorageAccounts(): Promise<AzureStorageAccount[]> {
        const accounts: AzureStorageAccount[] = [];
        for await (const account of this.storageClient.storageAccounts.list()) {
            accounts.push(account);
        }
        return accounts;
    }

    /**
     * Get the Cognitive Services management client.
     */
    getCognitiveClient(): CognitiveServicesManagementClient {
        return new CognitiveServicesManagementClient(
            this.identity.getCredential(),
            this.subscriptionId
        );
    }

    /**
     * Get the Resource Management client.
     */
    getResourceClient(): ResourceManagementClient {
        return this.resourceClient;
    }
}

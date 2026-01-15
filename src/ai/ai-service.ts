import {
    CognitiveServicesManagementClient,
    Account,
    Deployment,
} from '@azure/arm-cognitiveservices';
import type { ResourceGroup } from '../resources/resource-group';
import { OpenAIClient } from './openai-client';

export interface ModelDetails {
    kind?: string;
    name?: string;
    format?: string;
    version?: string;
    skuName?: string;
}

export interface DeploymentDetails {
    name: string;
    status: string;
    model?: unknown;
    scaleSettings?: {
        scaleType?: string;
        capacity?: number;
    };
}

export interface CreateDeploymentOptions {
    deploymentName: string;
    modelFormat: string;
    modelName: string;
    modelVersion: string;
    skuName?: string;
    skuCapacity?: number;
}

/**
 * Represents an Azure OpenAI Service.
 */
export class AIService {
    private resourceGroup: ResourceGroup;
    private cognitiveClient: CognitiveServicesManagementClient;
    private azureAccount: Account;

    constructor(
        resourceGroup: ResourceGroup,
        cognitiveClient: CognitiveServicesManagementClient,
        azureAccount: Account
    ) {
        this.resourceGroup = resourceGroup;
        this.cognitiveClient = cognitiveClient;
        this.azureAccount = azureAccount;
    }

    /**
     * Get the service name.
     */
    getName(): string {
        return this.azureAccount.name || '';
    }

    /**
     * Get the service endpoint.
     */
    getEndpoint(): string {
        return `https://${this.getName()}.openai.azure.com/`;
    }

    /**
     * Get the service location.
     */
    getLocation(): string {
        return this.azureAccount.location || '';
    }

    /**
     * Get the underlying Azure account.
     */
    getAccount(): Account {
        return this.azureAccount;
    }

    /**
     * Get the API keys for this service.
     */
    async getKeys(): Promise<{ key1?: string; key2?: string }> {
        const keys = await this.cognitiveClient.accounts.listKeys(
            this.resourceGroup.getName(),
            this.getName()
        );
        return {
            key1: keys.key1,
            key2: keys.key2,
        };
    }

    /**
     * Get an OpenAI client for this service.
     *
     * @param apiVersion - API version to use
     * @returns OpenAIClient instance
     */
    async getOpenAIClient(apiVersion = '2024-08-01-preview'): Promise<OpenAIClient> {
        const keys = await this.getKeys();
        if (!keys.key1) {
            throw new Error(`Failed to get API key for service ${this.getName()}`);
        }

        // Dynamic import to avoid requiring openai if not used
        const { AzureOpenAI } = await import('openai');

        const openaiClient = new AzureOpenAI({
            apiKey: keys.key1,
            endpoint: this.getEndpoint(),
            apiVersion: apiVersion,
        });

        return new OpenAIClient(this, openaiClient as unknown as import('openai').default);
    }

    /**
     * List available models.
     *
     * @param location - Azure location (defaults to service location)
     * @returns Array of available models
     */
    async getModels(location?: string): Promise<unknown[]> {
        const azureLocation = location || this.getLocation();
        const models: unknown[] = [];

        for await (const model of this.cognitiveClient.models.list(azureLocation)) {
            models.push(model);
        }

        return models;
    }

    /**
     * Get details for a specific model.
     *
     * @param model - The model object
     * @returns Model details dictionary
     */
    static getModelDetails(model: unknown): ModelDetails {
        const m = model as {
            kind?: string;
            skuName?: string;
            model?: {
                name?: string;
                format?: string;
                version?: string;
            };
        };

        return {
            kind: m.kind,
            name: m.model?.name,
            format: m.model?.format,
            version: m.model?.version,
            skuName: m.skuName,
        };
    }

    /**
     * List all deployments for this service.
     */
    async getDeployments(): Promise<Deployment[]> {
        const deployments: Deployment[] = [];

        for await (const deployment of this.cognitiveClient.deployments.list(
            this.resourceGroup.getName(),
            this.getName()
        )) {
            deployments.push(deployment);
        }

        return deployments;
    }

    /**
     * Get a specific deployment by name.
     *
     * @param deploymentName - Name of the deployment
     * @returns Deployment object
     */
    async getDeployment(deploymentName: string): Promise<Deployment> {
        return this.cognitiveClient.deployments.get(
            this.resourceGroup.getName(),
            this.getName(),
            deploymentName
        );
    }

    /**
     * Get details for a specific deployment.
     *
     * @param deployment - The deployment object
     * @returns Deployment details dictionary
     */
    static getDeploymentDetails(deployment: Deployment): DeploymentDetails {
        const details: DeploymentDetails = {
            name: deployment.name || 'name not found',
            status: 'unknown',
        };

        if (deployment.properties) {
            const props = deployment.properties;
            if (props.model) {
                details.model = props.model;
            }
            if (props.provisioningState) {
                details.status = props.provisioningState;
            }
            if (props.scaleSettings) {
                details.scaleSettings = {
                    scaleType: props.scaleSettings.scaleType,
                    capacity: props.scaleSettings.capacity,
                };
            }
        }

        return details;
    }

    /**
     * Create a new deployment.
     *
     * @param options - Deployment options
     * @returns Created deployment
     */
    async createDeployment(options: CreateDeploymentOptions): Promise<Deployment> {
        const poller = await this.cognitiveClient.deployments.beginCreateOrUpdate(
            this.resourceGroup.getName(),
            this.getName(),
            options.deploymentName,
            {
                properties: {
                    model: {
                        format: options.modelFormat,
                        name: options.modelName,
                        version: options.modelVersion,
                    },
                },
                sku: {
                    name: options.skuName || 'Standard',
                    capacity: options.skuCapacity || 1,
                },
            }
        );

        return poller.pollUntilDone();
    }

    /**
     * Delete a deployment.
     *
     * @param deploymentName - Name of the deployment to delete
     * @returns True if deleted successfully
     */
    async deleteDeployment(deploymentName: string): Promise<boolean> {
        const poller = await this.cognitiveClient.deployments.beginDelete(
            this.resourceGroup.getName(),
            this.getName(),
            deploymentName
        );

        await poller.pollUntilDone();
        return true;
    }
}

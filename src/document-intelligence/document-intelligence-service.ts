import {
    CognitiveServicesManagementClient,
    Account,
} from '@azure/arm-cognitiveservices';
import { AzureKeyCredential } from '@azure/core-auth';
import type { ResourceGroup } from '../resources/resource-group';
import { DocumentAnalysisClientWrapper } from './document-analysis-client';

/**
 * Azure Document Intelligence service wrapper.
 *
 * Provides document analysis capabilities through the Document Intelligence API.
 */
export class DocumentIntelligenceService {
    private resourceGroup: ResourceGroup;
    private cognitiveClient: CognitiveServicesManagementClient;
    private _credential: AzureKeyCredential | null = null;

    public readonly name: string;
    public readonly location: string;
    public readonly endpoint: string;
    public readonly kind: string;
    public readonly sku: string;
    public readonly id: string;

    constructor(
        resourceGroup: ResourceGroup,
        cognitiveClient: CognitiveServicesManagementClient,
        azureAccount: Account
    ) {
        this.resourceGroup = resourceGroup;
        this.cognitiveClient = cognitiveClient;

        this.name = azureAccount.name || '';
        this.location = azureAccount.location || '';
        this.endpoint = `https://${azureAccount.name}.cognitiveservices.azure.com/`;
        this.kind = azureAccount.kind || '';
        this.sku = azureAccount.sku?.name || 'unknown';
        this.id = azureAccount.id || '';
    }

    /**
     * Get the service name.
     */
    getName(): string {
        return this.name;
    }

    /**
     * Get the Azure resource ID.
     */
    getId(): string {
        return this.id;
    }

    /**
     * Get the service location.
     */
    getLocation(): string {
        return this.location;
    }

    /**
     * Get the service kind (FormRecognizer or DocumentIntelligence).
     */
    getKind(): string {
        return this.kind;
    }

    /**
     * Get the SKU name.
     */
    getSku(): string {
        return this.sku;
    }

    /**
     * Get the service endpoint URL.
     */
    getEndpoint(): string {
        return this.endpoint;
    }

    /**
     * Get the API keys for this service.
     */
    async getKeys(): Promise<{ primary?: string; secondary?: string }> {
        const keys = await this.cognitiveClient.accounts.listKeys(
            this.resourceGroup.getName(),
            this.name
        );
        return {
            primary: keys.key1,
            secondary: keys.key2,
        };
    }

    /**
     * Get an Azure Key Credential for this service.
     * The credential is cached after first retrieval.
     */
    async getCredential(): Promise<AzureKeyCredential> {
        if (!this._credential) {
            const keys = await this.getKeys();
            if (!keys.primary) {
                throw new Error(`Failed to get API key for service ${this.name}`);
            }
            this._credential = new AzureKeyCredential(keys.primary);
        }
        return this._credential;
    }

    /**
     * Get a Document Analysis client for analyzing documents.
     */
    async getDocumentAnalysisClient(): Promise<DocumentAnalysisClientWrapper> {
        const { DocumentAnalysisClient } = await import('@azure/ai-form-recognizer');
        const credential = await this.getCredential();

        const client = new DocumentAnalysisClient(this.endpoint, credential);
        return new DocumentAnalysisClientWrapper(this, client);
    }
}

import {
    ClientSecretCredential,
    DefaultAzureCredential,
    TokenCredential,
} from '@azure/identity';
import { SubscriptionClient, Subscription as AzureSubscription } from '@azure/arm-subscriptions';
import { AuthenticationError } from '../errors';
import type { IdentityOptions } from '../types';

// Forward declaration for Subscription (will be imported dynamically to avoid circular deps)
import type { Subscription } from '../resources/subscription';

/**
 * Azure Identity for authentication.
 *
 * Two authentication methods are supported, both implementing TokenCredential:
 * 1. Default authentication (when no arguments provided):
 *    - Uses DefaultAzureCredential for automatic authentication
 * 2. Service Principal authentication (when any argument provided):
 *    - Requires all three: tenantId, clientId, clientSecret
 *    - Uses ClientSecretCredential
 */
export class Identity {
    private credential: TokenCredential;
    private subscriptionClient: SubscriptionClient;

    public readonly tenantId?: string;
    public readonly clientId?: string;

    private constructor(credential: TokenCredential, options?: IdentityOptions) {
        this.credential = credential;
        this.tenantId = options?.tenantId;
        this.clientId = options?.clientId;
        this.subscriptionClient = new SubscriptionClient(credential);
    }

    /**
     * Create a new Identity instance with credential validation.
     *
     * @param options - Optional credentials for Service Principal auth
     * @returns Promise resolving to validated Identity instance
     * @throws AuthenticationError if credentials are invalid
     */
    static async create(options?: IdentityOptions): Promise<Identity> {
        let credential: TokenCredential;

        // Use DefaultAzureCredential when all parameters are undefined
        if (!options?.tenantId && !options?.clientId && !options?.clientSecret) {
            credential = new DefaultAzureCredential();
        } else {
            // Require all parameters for ClientSecretCredential
            if (!options.tenantId || !options.clientId || !options.clientSecret) {
                throw new AuthenticationError(
                    'For client credential auth, all three parameters (tenantId, clientId, clientSecret) are required'
                );
            }

            credential = new ClientSecretCredential(
                options.tenantId,
                options.clientId,
                options.clientSecret
            );
        }

        // Validate credentials by fetching a token
        try {
            const token = await credential.getToken('https://management.azure.com/.default');
            if (!token) {
                throw new AuthenticationError('Failed to get token. Check your credentials.');
            }
        } catch (error) {
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError(
                `Failed to authenticate: ${error instanceof Error ? error.message : String(error)}`
            );
        }

        return new Identity(credential, options);
    }

    /**
     * Get the underlying TokenCredential.
     */
    getCredential(): TokenCredential {
        return this.credential;
    }

    /**
     * Get all subscriptions accessible with this identity.
     */
    async getSubscriptions(): Promise<AzureSubscription[]> {
        const subscriptions: AzureSubscription[] = [];
        for await (const subscription of this.subscriptionClient.subscriptions.list()) {
            subscriptions.push(subscription);
        }
        return subscriptions;
    }

    /**
     * Get a specific subscription by ID.
     *
     * @param subscriptionId - The subscription ID to find
     * @returns Promise resolving to Subscription wrapper
     * @throws Error if subscription not found
     */
    async getSubscription(subscriptionId: string): Promise<Subscription> {
        const subscriptions = await this.getSubscriptions();
        const sub = subscriptions.find((s) => s.subscriptionId === subscriptionId);

        if (!sub) {
            throw new Error(`Subscription with ID ${subscriptionId} not found.`);
        }

        // Dynamic import to avoid circular dependency
        const { Subscription } = await import('../resources/subscription');
        return new Subscription(this, sub, subscriptionId);
    }
}

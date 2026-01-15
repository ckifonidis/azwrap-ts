import { config } from 'dotenv';

// Load environment variables from .env.test if it exists
config({ path: '.env.test' });
config(); // Also try .env

/**
 * Test configuration loaded from environment variables.
 */
export const testConfig = {
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
    resourceGroupName: process.env.AZURE_RESOURCE_GROUP_NAME,
    resourceLocation: process.env.AZURE_RESOURCE_LOCATION,
    storageAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    storageContainerName: process.env.AZURE_STORAGE_CONTAINER_NAME,
    searchServiceName: process.env.AZURE_SEARCH_SERVICE_NAME,
    openaiServiceName: process.env.AZURE_OPENAI_SERVICE_NAME,
};

/**
 * Check if credentials are available for integration tests.
 */
export function hasCredentials(): boolean {
    return !!(testConfig.tenantId && testConfig.clientId && testConfig.clientSecret);
}

/**
 * Skip test if credentials are not available.
 */
export function skipIfNoCredentials(): void {
    if (!hasCredentials()) {
        console.log('Skipping test: Azure credentials not configured');
    }
}

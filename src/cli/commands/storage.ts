import { Command } from 'commander';
import { Identity } from '../../identity';
import { loadConfig } from '../../config';
import { printOutput, printError, printSuccess } from '../utils';
import type { OutputFormat } from '../../types';

export function createStorageCommands(): Command {
    const storage = new Command('storage').description('Manage Azure Blob Storage');

    // Container commands
    const container = storage
        .command('container')
        .description('Manage blob containers');

    container
        .command('list')
        .description('List all containers in a storage account')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-g, --resource-group <name>', 'Resource group name')
        .option('-a, --account <name>', 'Storage account name')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'text')
        .action(
            async (options: {
                subscription?: string;
                resourceGroup?: string;
                account?: string;
                output: OutputFormat;
            }) => {
                try {
                    const config = loadConfig();
                    const identity = await Identity.create({
                        tenantId: config.tenantId,
                        clientId: config.clientId,
                        clientSecret: config.clientSecret,
                    });

                    const subscriptionId = options.subscription || config.subscriptionId;
                    const resourceGroupName = options.resourceGroup || config.resourceGroup;
                    const accountName = options.account || config.storageAccountName;

                    if (!subscriptionId || !resourceGroupName || !accountName) {
                        throw new Error('Subscription ID, resource group, and storage account are required');
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const resourceGroup = await subscription.getResourceGroup(resourceGroupName);
                    const storageAccount = await resourceGroup.getStorageAccount(accountName);
                    const containers = await storageAccount.getContainers();

                    const data = containers.map((c) => ({
                        name: c.name,
                        lastModified: c.properties?.lastModified,
                    }));

                    printOutput(data, options.output);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    container
        .command('create <name>')
        .description('Create a new container')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-g, --resource-group <name>', 'Resource group name')
        .option('-a, --account <name>', 'Storage account name')
        .option('-p, --public-access <level>', 'Public access level (container, blob)')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'text')
        .action(
            async (
                name: string,
                options: {
                    subscription?: string;
                    resourceGroup?: string;
                    account?: string;
                    publicAccess?: 'container' | 'blob';
                    output: OutputFormat;
                }
            ) => {
                try {
                    const config = loadConfig();
                    const identity = await Identity.create({
                        tenantId: config.tenantId,
                        clientId: config.clientId,
                        clientSecret: config.clientSecret,
                    });

                    const subscriptionId = options.subscription || config.subscriptionId;
                    const resourceGroupName = options.resourceGroup || config.resourceGroup;
                    const accountName = options.account || config.storageAccountName;

                    if (!subscriptionId || !resourceGroupName || !accountName) {
                        throw new Error('Subscription ID, resource group, and storage account are required');
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const resourceGroup = await subscription.getResourceGroup(resourceGroupName);
                    const storageAccount = await resourceGroup.getStorageAccount(accountName);
                    const containerObj = await storageAccount.createContainer(name, options.publicAccess);

                    printSuccess(`Container '${containerObj.getName()}' created successfully`);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    container
        .command('delete <name>')
        .description('Delete a container')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-g, --resource-group <name>', 'Resource group name')
        .option('-a, --account <name>', 'Storage account name')
        .option('-f, --force', 'Force delete even if not empty')
        .action(
            async (
                name: string,
                options: {
                    subscription?: string;
                    resourceGroup?: string;
                    account?: string;
                    force?: boolean;
                }
            ) => {
                try {
                    const config = loadConfig();
                    const identity = await Identity.create({
                        tenantId: config.tenantId,
                        clientId: config.clientId,
                        clientSecret: config.clientSecret,
                    });

                    const subscriptionId = options.subscription || config.subscriptionId;
                    const resourceGroupName = options.resourceGroup || config.resourceGroup;
                    const accountName = options.account || config.storageAccountName;

                    if (!subscriptionId || !resourceGroupName || !accountName) {
                        throw new Error('Subscription ID, resource group, and storage account are required');
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const resourceGroup = await subscription.getResourceGroup(resourceGroupName);
                    const storageAccount = await resourceGroup.getStorageAccount(accountName);
                    await storageAccount.deleteContainer(name, options.force);

                    printSuccess(`Container '${name}' deleted successfully`);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    // Blob commands
    const blob = storage.command('blob').description('Manage blobs');

    blob.command('list')
        .description('List blobs in a container')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-g, --resource-group <name>', 'Resource group name')
        .option('-a, --account <name>', 'Storage account name')
        .option('-c, --container <name>', 'Container name')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'text')
        .action(
            async (options: {
                subscription?: string;
                resourceGroup?: string;
                account?: string;
                container?: string;
                output: OutputFormat;
            }) => {
                try {
                    const config = loadConfig();
                    const identity = await Identity.create({
                        tenantId: config.tenantId,
                        clientId: config.clientId,
                        clientSecret: config.clientSecret,
                    });

                    const subscriptionId = options.subscription || config.subscriptionId;
                    const resourceGroupName = options.resourceGroup || config.resourceGroup;
                    const accountName = options.account || config.storageAccountName;
                    const containerName = options.container || config.storageContainerName;

                    if (!subscriptionId || !resourceGroupName || !accountName || !containerName) {
                        throw new Error(
                            'Subscription ID, resource group, storage account, and container are required'
                        );
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const resourceGroup = await subscription.getResourceGroup(resourceGroupName);
                    const storageAccount = await resourceGroup.getStorageAccount(accountName);
                    const containerObj = await storageAccount.getContainer(containerName);
                    const blobs = await containerObj.getBlobNames();

                    printOutput(blobs.map((name) => ({ name })), options.output);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    return storage;
}

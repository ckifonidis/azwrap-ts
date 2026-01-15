import { Command } from 'commander';
import { Identity } from '../../identity';
import { loadConfig } from '../../config';
import { printOutput, printError } from '../utils';
import type { OutputFormat } from '../../types';

export function createSearchCommands(): Command {
    const search = new Command('search').description('Manage Azure AI Search');

    // Service commands
    search
        .command('list-services')
        .description('List all search services in a subscription')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'text')
        .action(async (options: { subscription?: string; output: OutputFormat }) => {
            try {
                const config = loadConfig();
                const identity = await Identity.create({
                    tenantId: config.tenantId,
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                });

                const subscriptionId = options.subscription || config.subscriptionId;
                if (!subscriptionId) {
                    throw new Error('Subscription ID is required');
                }

                const subscription = await identity.getSubscription(subscriptionId);
                const services = await subscription.getSearchServices();

                const data = services.map((s) => ({
                    name: s.name,
                    location: s.location,
                    sku: s.sku?.name,
                    status: s.status,
                }));

                printOutput(data, options.output);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });

    // Index commands
    const index = search.command('index').description('Manage search indexes');

    index
        .command('list')
        .description('List all indexes in a search service')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-n, --service-name <name>', 'Search service name')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'text')
        .action(
            async (options: {
                subscription?: string;
                serviceName?: string;
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
                    const serviceName = options.serviceName || config.searchServiceName;

                    if (!subscriptionId || !serviceName) {
                        throw new Error('Subscription ID and search service name are required');
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const searchService = await subscription.getSearchService(serviceName);
                    const indexes = await searchService.getIndexes();

                    const data = indexes.map((i) => ({
                        name: i.name,
                        fields: i.fields?.length || 0,
                    }));

                    printOutput(data, options.output);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    index
        .command('get <indexName>')
        .description('Get details of a specific index')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-n, --service-name <name>', 'Search service name')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'json')
        .action(
            async (
                indexName: string,
                options: {
                    subscription?: string;
                    serviceName?: string;
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
                    const serviceName = options.serviceName || config.searchServiceName;

                    if (!subscriptionId || !serviceName) {
                        throw new Error('Subscription ID and search service name are required');
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const searchService = await subscription.getSearchService(serviceName);
                    const searchIndex = await searchService.getIndex(indexName);

                    if (!searchIndex) {
                        throw new Error(`Index '${indexName}' not found`);
                    }

                    const data = {
                        name: searchIndex.getName(),
                        fields: searchIndex.getFields().map((f) => ({
                            name: f.name,
                            type: f.type,
                            searchable: f.searchable,
                            filterable: f.filterable,
                        })),
                    };

                    printOutput(data, options.output);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    // Indexer commands
    const indexer = search.command('indexer').description('Manage search indexers');

    indexer
        .command('list')
        .description('List all indexers in a search service')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-n, --service-name <name>', 'Search service name')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'text')
        .action(
            async (options: {
                subscription?: string;
                serviceName?: string;
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
                    const serviceName = options.serviceName || config.searchServiceName;

                    if (!subscriptionId || !serviceName) {
                        throw new Error('Subscription ID and search service name are required');
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const searchService = await subscription.getSearchService(serviceName);
                    const manager = searchService.createIndexerManager();
                    const indexers = await manager.getIndexers();

                    const data = indexers.map((i) => ({
                        name: i.getName(),
                        targetIndex: i.getTargetIndexName(),
                        dataSource: i.getDataSourceName(),
                    }));

                    printOutput(data, options.output);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    indexer
        .command('run <indexerName>')
        .description('Run an indexer')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-n, --service-name <name>', 'Search service name')
        .action(
            async (
                indexerName: string,
                options: { subscription?: string; serviceName?: string }
            ) => {
                try {
                    const config = loadConfig();
                    const identity = await Identity.create({
                        tenantId: config.tenantId,
                        clientId: config.clientId,
                        clientSecret: config.clientSecret,
                    });

                    const subscriptionId = options.subscription || config.subscriptionId;
                    const serviceName = options.serviceName || config.searchServiceName;

                    if (!subscriptionId || !serviceName) {
                        throw new Error('Subscription ID and search service name are required');
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const searchService = await subscription.getSearchService(serviceName);
                    const manager = searchService.createIndexerManager();
                    const indexerObj = await manager.getIndexer(indexerName);

                    if (!indexerObj) {
                        throw new Error(`Indexer '${indexerName}' not found`);
                    }

                    await indexerObj.run();
                    console.log(`Indexer '${indexerName}' started successfully`);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    return search;
}

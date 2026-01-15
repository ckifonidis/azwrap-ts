import { Command } from 'commander';
import { Identity } from '../../identity';
import { loadConfig } from '../../config';
import { printOutput, printError } from '../utils';
import type { OutputFormat } from '../../types';

export function createDocumentCommands(): Command {
    const document = new Command('document').description(
        'Manage Azure Document Intelligence'
    );

    document
        .command('analyze <file>')
        .description('Analyze a document')
        .option('-m, --model <id>', 'Model ID to use', 'prebuilt-layout')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-g, --resource-group <name>', 'Resource group name')
        .option('-n, --service-name <name>', 'Document Intelligence service name')
        .option('-o, --output <format>', 'Output format (text, json)', 'json')
        .action(
            async (
                file: string,
                options: {
                    model: string;
                    subscription?: string;
                    resourceGroup?: string;
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
                    const resourceGroupName = options.resourceGroup || config.resourceGroup;

                    if (!subscriptionId || !resourceGroupName || !options.serviceName) {
                        throw new Error(
                            'Subscription ID, resource group, and service name are required'
                        );
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const resourceGroup = await subscription.getResourceGroup(resourceGroupName);
                    const diService = await resourceGroup.getDocumentIntelligenceService(
                        options.serviceName
                    );

                    if (!diService) {
                        throw new Error(
                            `Document Intelligence service '${options.serviceName}' not found`
                        );
                    }

                    const client = await diService.getDocumentAnalysisClient();

                    // Check if it's a URL or file path
                    let result;
                    if (file.startsWith('http://') || file.startsWith('https://')) {
                        result = await client.analyzeDocumentFromUrl(options.model, file);
                    } else {
                        result = await client.analyzeDocument(options.model, file);
                    }

                    printOutput(result, options.output);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    document
        .command('analyze-layout <file>')
        .description('Analyze document layout')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-g, --resource-group <name>', 'Resource group name')
        .option('-n, --service-name <name>', 'Document Intelligence service name')
        .option('-o, --output <format>', 'Output format (text, json)', 'json')
        .action(
            async (
                file: string,
                options: {
                    subscription?: string;
                    resourceGroup?: string;
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
                    const resourceGroupName = options.resourceGroup || config.resourceGroup;

                    if (!subscriptionId || !resourceGroupName || !options.serviceName) {
                        throw new Error(
                            'Subscription ID, resource group, and service name are required'
                        );
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const resourceGroup = await subscription.getResourceGroup(resourceGroupName);
                    const diService = await resourceGroup.getDocumentIntelligenceService(
                        options.serviceName
                    );

                    if (!diService) {
                        throw new Error(
                            `Document Intelligence service '${options.serviceName}' not found`
                        );
                    }

                    const client = await diService.getDocumentAnalysisClient();

                    // Check if it's a URL or file path
                    let result;
                    if (file.startsWith('http://') || file.startsWith('https://')) {
                        result = await client.analyzeLayoutFromUrl(file);
                    } else {
                        result = await client.analyzeLayout(file);
                    }

                    printOutput(result, options.output);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    return document;
}

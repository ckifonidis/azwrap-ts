import { Command } from 'commander';
import { Identity } from '../../identity';
import { loadConfig } from '../../config';
import { printOutput, printError } from '../utils';
import { AIService } from '../../ai';
import type { OutputFormat } from '../../types';

export function createAICommands(): Command {
    const ai = new Command('ai').description('Manage Azure OpenAI services');

    ai.command('list-deployments')
        .description('List all deployments in an OpenAI service')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-g, --resource-group <name>', 'Resource group name')
        .option('-n, --service-name <name>', 'OpenAI service name')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'text')
        .action(
            async (options: {
                subscription?: string;
                resourceGroup?: string;
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
                    const resourceGroupName = options.resourceGroup || config.resourceGroup;
                    const serviceName = options.serviceName || config.openaiServiceName;

                    if (!subscriptionId || !resourceGroupName || !serviceName) {
                        throw new Error(
                            'Subscription ID, resource group, and service name are required'
                        );
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const resourceGroup = await subscription.getResourceGroup(resourceGroupName);
                    const aiService = await resourceGroup.getAIService(serviceName);

                    if (!aiService) {
                        throw new Error(`AI service '${serviceName}' not found`);
                    }

                    const deployments = await aiService.getDeployments();
                    const data = deployments.map((d) => AIService.getDeploymentDetails(d));

                    printOutput(data, options.output);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    ai.command('chat')
        .description('Send a chat completion request')
        .requiredOption('-m, --model <deployment>', 'Model deployment name')
        .requiredOption('-p, --prompt <text>', 'User prompt')
        .option('-S, --system <text>', 'System prompt')
        .option('-t, --temperature <number>', 'Temperature (0-1)', '0.7')
        .option('--max-tokens <number>', 'Maximum tokens', '800')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-g, --resource-group <name>', 'Resource group name')
        .option('-n, --service-name <name>', 'OpenAI service name')
        .option('--api-version <version>', 'API version', '2024-02-01')
        .action(
            async (options: {
                model: string;
                prompt: string;
                system?: string;
                temperature: string;
                maxTokens: string;
                subscription?: string;
                resourceGroup?: string;
                serviceName?: string;
                apiVersion: string;
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
                    const serviceName = options.serviceName || config.openaiServiceName;

                    if (!subscriptionId || !resourceGroupName || !serviceName) {
                        throw new Error(
                            'Subscription ID, resource group, and service name are required'
                        );
                    }

                    const subscription = await identity.getSubscription(subscriptionId);
                    const resourceGroup = await subscription.getResourceGroup(resourceGroupName);
                    const aiService = await resourceGroup.getAIService(serviceName);

                    if (!aiService) {
                        throw new Error(`AI service '${serviceName}' not found`);
                    }

                    const openaiClient = await aiService.getOpenAIClient(options.apiVersion);
                    const result = await openaiClient.complete(
                        options.prompt,
                        options.model,
                        options.system
                    );

                    console.log(result);
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    return ai;
}

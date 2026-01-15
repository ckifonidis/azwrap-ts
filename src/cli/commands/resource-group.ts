import { Command } from 'commander';
import { Identity } from '../../identity';
import { loadConfig } from '../../config';
import { printOutput, printError, printSuccess } from '../utils';
import type { OutputFormat } from '../../types';

export function createResourceGroupCommands(): Command {
    const resourceGroup = new Command('resource-group')
        .alias('rg')
        .description('Manage Azure resource groups');

    resourceGroup
        .command('list')
        .description('List all resource groups in a subscription')
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
                const groups = await subscription.listResourceGroups();
                const data = groups.map((group) => ({
                    name: group.name,
                    location: group.location,
                }));

                printOutput(data, options.output);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });

    resourceGroup
        .command('get <name>')
        .description('Get details of a specific resource group')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'text')
        .action(async (name: string, options: { subscription?: string; output: OutputFormat }) => {
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
                const group = await subscription.getResourceGroup(name);
                const data = {
                    name: group.getName(),
                    location: group.getLocation(),
                };

                printOutput(data, options.output);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });

    resourceGroup
        .command('create <name>')
        .description('Create a new resource group')
        .requiredOption('-l, --location <location>', 'Azure region')
        .option('-s, --subscription <id>', 'Subscription ID')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'text')
        .action(
            async (
                name: string,
                options: { location: string; subscription?: string; output: OutputFormat }
            ) => {
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
                    const group = await subscription.createResourceGroup(name, options.location);

                    printSuccess(`Resource group '${group.getName()}' created successfully`);
                    printOutput(
                        {
                            name: group.getName(),
                            location: group.getLocation(),
                        },
                        options.output
                    );
                } catch (error) {
                    printError(error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }
        );

    return resourceGroup;
}

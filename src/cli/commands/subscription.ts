import { Command } from 'commander';
import { Identity } from '../../identity';
import { loadConfig } from '../../config';
import { printOutput, printError } from '../utils';
import type { OutputFormat } from '../../types';

export function createSubscriptionCommands(): Command {
    const subscription = new Command('subscription').description('Manage Azure subscriptions');

    subscription
        .command('list')
        .description('List all accessible subscriptions')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'text')
        .action(async (options: { output: OutputFormat }) => {
            try {
                const config = loadConfig();
                const identity = await Identity.create({
                    tenantId: config.tenantId,
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                });

                const subscriptions = await identity.getSubscriptions();
                const data = subscriptions.map((sub) => ({
                    id: sub.subscriptionId,
                    name: sub.displayName,
                    state: sub.state,
                }));

                printOutput(data, options.output);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });

    subscription
        .command('get <subscriptionId>')
        .description('Get details of a specific subscription')
        .option('-o, --output <format>', 'Output format (text, json, table)', 'text')
        .action(async (subscriptionId: string, options: { output: OutputFormat }) => {
            try {
                const config = loadConfig();
                const identity = await Identity.create({
                    tenantId: config.tenantId,
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                });

                const sub = await identity.getSubscription(subscriptionId);
                const data = {
                    id: sub.subscriptionId,
                    name: sub.getDisplayName(),
                };

                printOutput(data, options.output);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });

    return subscription;
}

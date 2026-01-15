import { Command } from 'commander';
import { createSubscriptionCommands } from './commands/subscription';
import { createResourceGroupCommands } from './commands/resource-group';
import { createStorageCommands } from './commands/storage';
import { createSearchCommands } from './commands/search';
import { createAICommands } from './commands/ai';
import { createDocumentCommands } from './commands/document';

/**
 * Create the main CLI program.
 */
export function createProgram(): Command {
    const program = new Command();

    program
        .name('azwrap')
        .description('Azure SDK wrapper CLI - simplifies interaction with Azure services')
        .version('0.1.0');

    // Global options
    program
        .option('-v, --verbose', 'Enable verbose output')
        .option('-q, --quiet', 'Suppress non-error output')
        .option('--config <path>', 'Path to configuration file');

    // Add command groups
    program.addCommand(createSubscriptionCommands());
    program.addCommand(createResourceGroupCommands());
    program.addCommand(createStorageCommands());
    program.addCommand(createSearchCommands());
    program.addCommand(createAICommands());
    program.addCommand(createDocumentCommands());

    return program;
}

/**
 * Main CLI entry point.
 */
export async function main(): Promise<void> {
    const program = createProgram();
    await program.parseAsync(process.argv);
}

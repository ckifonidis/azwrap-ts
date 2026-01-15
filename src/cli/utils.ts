import type { OutputFormat } from '../types';

/**
 * Format output based on the specified format.
 *
 * @param data - Data to format
 * @param format - Output format (text, json, table)
 * @returns Formatted string
 */
export function formatOutput(data: unknown, format: OutputFormat = 'text'): string {
    switch (format) {
        case 'json':
            return JSON.stringify(data, null, 2);
        case 'table':
            return formatAsTable(data);
        case 'text':
        default:
            return formatAsText(data);
    }
}

/**
 * Format data as text.
 */
function formatAsText(data: unknown): string {
    if (Array.isArray(data)) {
        return data.map((item, index) => `${index + 1}. ${formatValue(item)}`).join('\n');
    }

    if (typeof data === 'object' && data !== null) {
        return Object.entries(data)
            .map(([key, value]) => `${key}: ${formatValue(value)}`)
            .join('\n');
    }

    return String(data);
}

/**
 * Format a single value for text output.
 */
function formatValue(value: unknown): string {
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }
    return String(value);
}

/**
 * Format data as a table.
 */
function formatAsTable(data: unknown): string {
    if (!Array.isArray(data) || data.length === 0) {
        return formatAsText(data);
    }

    // Get all unique keys from the data
    const keys = new Set<string>();
    for (const item of data) {
        if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach((key) => keys.add(key));
        }
    }

    if (keys.size === 0) {
        return formatAsText(data);
    }

    const columns = Array.from(keys);

    // Calculate column widths
    const widths: Record<string, number> = {};
    for (const col of columns) {
        widths[col] = col.length;
    }

    for (const item of data) {
        if (typeof item === 'object' && item !== null) {
            for (const col of columns) {
                const value = String((item as Record<string, unknown>)[col] || '');
                widths[col] = Math.max(widths[col], value.length);
            }
        }
    }

    // Build table
    const lines: string[] = [];

    // Header
    const header = columns.map((col) => col.padEnd(widths[col])).join(' | ');
    lines.push(header);

    // Separator
    const separator = columns.map((col) => '-'.repeat(widths[col])).join('-+-');
    lines.push(separator);

    // Rows
    for (const item of data) {
        if (typeof item === 'object' && item !== null) {
            const row = columns
                .map((col) => {
                    const value = String((item as Record<string, unknown>)[col] || '');
                    return value.padEnd(widths[col]);
                })
                .join(' | ');
            lines.push(row);
        }
    }

    return lines.join('\n');
}

/**
 * Print output to console.
 */
export function printOutput(data: unknown, format: OutputFormat = 'text'): void {
    console.log(formatOutput(data, format));
}

/**
 * Print error message.
 */
export function printError(message: string): void {
    console.error(`Error: ${message}`);
}

/**
 * Print success message.
 */
export function printSuccess(message: string): void {
    console.log(`Success: ${message}`);
}

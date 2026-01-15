import type { DocumentAnalysisClient, AnalyzeResult } from '@azure/ai-form-recognizer';
import * as fs from 'fs';
import type { DocumentIntelligenceService } from './document-intelligence-service';
import type { AnalyzeOptions } from '../types';

export interface PageResult {
    pageNumber: number;
    lines: Array<{
        content: string;
        boundingBox?: number[];
    }>;
    tables: Array<{
        rowCount: number;
        columnCount: number;
        cells: Array<{
            rowIndex: number;
            columnIndex: number;
            content: string;
            kind?: string;
        }>;
    }>;
}

export interface AnalysisResult {
    content: string;
    pages: PageResult[];
    keyValuePairs?: Array<{
        key: string;
        value: string;
    }>;
}

export interface BatchAnalysisResult {
    documentPath?: string;
    documentUrl?: string;
    status: 'success' | 'error';
    result?: AnalysisResult;
    error?: string;
}

/**
 * Wrapper for the Document Analysis Client.
 */
export class DocumentAnalysisClientWrapper {
    private documentIntelligenceService: DocumentIntelligenceService;
    private client: DocumentAnalysisClient;

    constructor(
        documentIntelligenceService: DocumentIntelligenceService,
        client: DocumentAnalysisClient
    ) {
        this.documentIntelligenceService = documentIntelligenceService;
        this.client = client;
    }

    /**
     * Get the parent service.
     */
    getService(): DocumentIntelligenceService {
        return this.documentIntelligenceService;
    }

    /**
     * Get the underlying client.
     */
    getClient(): DocumentAnalysisClient {
        return this.client;
    }

    /**
     * Serialize an analysis result to a structured format.
     */
    private serializeResult(result: AnalyzeResult<unknown>): AnalysisResult {
        const serialized: AnalysisResult = {
            content: result.content || '',
            pages: [],
        };

        // Add page information
        if (result.pages) {
            for (const page of result.pages) {
                const pageDict: PageResult = {
                    pageNumber: page.pageNumber,
                    lines: [],
                    tables: [],
                };

                // Add text lines
                if (page.lines) {
                    for (const line of page.lines) {
                        pageDict.lines.push({
                            content: line.content,
                            boundingBox: line.polygon
                                ? line.polygon.flatMap((p) => [p.x, p.y])
                                : undefined,
                        });
                    }
                }

                // Add tables from the page
                if (result.tables) {
                    for (const table of result.tables) {
                        // Check if table is on this page
                        if (
                            table.boundingRegions &&
                            table.boundingRegions[0]?.pageNumber === page.pageNumber
                        ) {
                            const tableDict = {
                                rowCount: table.rowCount,
                                columnCount: table.columnCount,
                                cells: table.cells.map((cell) => ({
                                    rowIndex: cell.rowIndex,
                                    columnIndex: cell.columnIndex,
                                    content: cell.content,
                                    kind: cell.kind,
                                })),
                            };
                            pageDict.tables.push(tableDict);
                        }
                    }
                }

                serialized.pages.push(pageDict);
            }
        }

        // Add key-value pairs if available
        if (result.keyValuePairs && result.keyValuePairs.length > 0) {
            serialized.keyValuePairs = [];
            for (const kv of result.keyValuePairs) {
                if (kv.key?.content && kv.value?.content) {
                    serialized.keyValuePairs.push({
                        key: kv.key.content,
                        value: kv.value.content,
                    });
                }
            }
        }

        return serialized;
    }

    /**
     * Analyze a document from a file path.
     *
     * @param modelId - Model ID to use for analysis
     * @param documentPath - Path to the document file
     * @param options - Analysis options
     * @returns Analysis result
     */
    async analyzeDocument(
        modelId: string,
        documentPath: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        const documentContent = fs.readFileSync(documentPath);

        const poller = await this.client.beginAnalyzeDocument(modelId, documentContent, {
            pages: options?.pages,
            locale: options?.locale,
        });

        const result = await poller.pollUntilDone();
        return this.serializeResult(result);
    }

    /**
     * Analyze a document from a URL.
     *
     * @param modelId - Model ID to use for analysis
     * @param documentUrl - URL of the document
     * @param options - Analysis options
     * @returns Analysis result
     */
    async analyzeDocumentFromUrl(
        modelId: string,
        documentUrl: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        const poller = await this.client.beginAnalyzeDocumentFromUrl(modelId, documentUrl, {
            pages: options?.pages,
            locale: options?.locale,
        });

        const result = await poller.pollUntilDone();
        return this.serializeResult(result);
    }

    // Prebuilt model methods

    /**
     * Analyze document layout.
     */
    async analyzeLayout(
        documentPath: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocument('prebuilt-layout', documentPath, options);
    }

    /**
     * Analyze document layout from URL.
     */
    async analyzeLayoutFromUrl(
        documentUrl: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocumentFromUrl('prebuilt-layout', documentUrl, options);
    }

    /**
     * Analyze a receipt.
     */
    async analyzeReceipt(
        documentPath: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocument('prebuilt-receipt', documentPath, options);
    }

    /**
     * Analyze a receipt from URL.
     */
    async analyzeReceiptFromUrl(
        documentUrl: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocumentFromUrl('prebuilt-receipt', documentUrl, options);
    }

    /**
     * Analyze an invoice.
     */
    async analyzeInvoice(
        documentPath: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocument('prebuilt-invoice', documentPath, options);
    }

    /**
     * Analyze an invoice from URL.
     */
    async analyzeInvoiceFromUrl(
        documentUrl: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocumentFromUrl('prebuilt-invoice', documentUrl, options);
    }

    /**
     * Analyze an ID document.
     */
    async analyzeIdDocument(
        documentPath: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocument('prebuilt-idDocument', documentPath, options);
    }

    /**
     * Analyze an ID document from URL.
     */
    async analyzeIdDocumentFromUrl(
        documentUrl: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocumentFromUrl('prebuilt-idDocument', documentUrl, options);
    }

    /**
     * Analyze a business card.
     */
    async analyzeBusinessCard(
        documentPath: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocument('prebuilt-businessCard', documentPath, options);
    }

    /**
     * Analyze a business card from URL.
     */
    async analyzeBusinessCardFromUrl(
        documentUrl: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocumentFromUrl('prebuilt-businessCard', documentUrl, options);
    }

    // Custom model methods

    /**
     * Analyze a document using a custom model.
     */
    async analyzeCustomDocument(
        customModelId: string,
        documentPath: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocument(customModelId, documentPath, options);
    }

    /**
     * Analyze a document from URL using a custom model.
     */
    async analyzeCustomDocumentFromUrl(
        customModelId: string,
        documentUrl: string,
        options?: AnalyzeOptions
    ): Promise<AnalysisResult> {
        return this.analyzeDocumentFromUrl(customModelId, documentUrl, options);
    }

    // Batch methods

    /**
     * Analyze multiple documents from file paths.
     *
     * @param modelId - Model ID to use
     * @param documentPaths - Array of document file paths
     * @param options - Analysis options
     * @returns Array of batch results
     */
    async analyzeBatchDocuments(
        modelId: string,
        documentPaths: string[],
        options?: AnalyzeOptions
    ): Promise<BatchAnalysisResult[]> {
        const results: BatchAnalysisResult[] = [];

        for (const documentPath of documentPaths) {
            try {
                const result = await this.analyzeDocument(modelId, documentPath, options);
                results.push({
                    documentPath,
                    status: 'success',
                    result,
                });
            } catch (error) {
                results.push({
                    documentPath,
                    status: 'error',
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return results;
    }

    /**
     * Analyze multiple documents from URLs.
     *
     * @param modelId - Model ID to use
     * @param documentUrls - Array of document URLs
     * @param options - Analysis options
     * @returns Array of batch results
     */
    async analyzeBatchDocumentsFromUrls(
        modelId: string,
        documentUrls: string[],
        options?: AnalyzeOptions
    ): Promise<BatchAnalysisResult[]> {
        const results: BatchAnalysisResult[] = [];

        for (const documentUrl of documentUrls) {
            try {
                const result = await this.analyzeDocumentFromUrl(modelId, documentUrl, options);
                results.push({
                    documentUrl,
                    status: 'success',
                    result,
                });
            } catch (error) {
                results.push({
                    documentUrl,
                    status: 'error',
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return results;
    }
}

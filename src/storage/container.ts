import {
    ContainerClient,
    BlobProperties,
    BlockBlobClient,
} from '@azure/storage-blob';
import * as fs from 'fs';
import * as path from 'path';
import type { StorageAccount } from './storage-account';
import { BlobType, blobTypeFromExtension, isTextType } from './blob-type';
import type { UploadOptions } from '../types';

/**
 * Represents an Azure Blob Container with blob operations.
 */
export class Container {
    private storageAccount: StorageAccount;
    private containerClient: ContainerClient;

    // Reference to BlobType enum for convenience
    static readonly BlobType = BlobType;

    constructor(storageAccount: StorageAccount, containerClient: ContainerClient) {
        this.storageAccount = storageAccount;
        this.containerClient = containerClient;
    }

    /**
     * Get the container name.
     */
    getName(): string {
        return this.containerClient.containerName;
    }

    /**
     * Get the underlying ContainerClient.
     */
    getClient(): ContainerClient {
        return this.containerClient;
    }

    /**
     * Get the parent storage account.
     */
    getStorageAccount(): StorageAccount {
        return this.storageAccount;
    }

    /**
     * Get all blob names in the container.
     */
    async getBlobNames(): Promise<string[]> {
        const names: string[] = [];
        for await (const blob of this.containerClient.listBlobsFlat()) {
            names.push(blob.name);
        }
        return names;
    }

    /**
     * Get all blobs with their properties.
     */
    async getBlobs(): Promise<BlobProperties[]> {
        const blobs: BlobProperties[] = [];
        for await (const blob of this.containerClient.listBlobsFlat()) {
            blobs.push(blob as unknown as BlobProperties);
        }
        return blobs;
    }

    /**
     * Get the content of a specific blob.
     *
     * @param blobName - Name of the blob to retrieve
     * @returns Promise resolving to blob content (Buffer for binary, string for text, object for JSON)
     */
    async getBlobContent(blobName: string): Promise<Buffer | string | object> {
        const blobClient = this.containerClient.getBlobClient(blobName);
        const downloadResponse = await blobClient.download();

        if (!downloadResponse.readableStreamBody) {
            throw new Error(`Failed to download blob: ${blobName}`);
        }

        // Read stream into buffer
        const chunks: Buffer[] = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(Buffer.from(chunk));
        }
        const content = Buffer.concat(chunks);

        // Determine blob type
        const blobType = this.getBlobType(blobName);

        if (!blobType) {
            // Return raw buffer if type cannot be determined
            return content;
        }

        // Process based on MIME type
        if (blobType === BlobType.APP_JSON) {
            // Parse JSON content
            return JSON.parse(content.toString('utf-8'));
        } else if (isTextType(blobType)) {
            // Return as text
            return content.toString('utf-8');
        }

        // Return raw buffer for binary types
        return content;
    }

    /**
     * Get the BlobType for a blob based on its name/extension.
     */
    getBlobType(blobName: string): BlobType | null {
        const ext = path.extname(blobName);
        return blobTypeFromExtension(ext);
    }

    /**
     * Get metadata for all blobs in the container.
     */
    async getBlobMetadata(): Promise<Record<string, { lastModified?: Date; size?: number; etag?: string }>> {
        const metadata: Record<string, { lastModified?: Date; size?: number; etag?: string }> = {};

        for await (const blob of this.containerClient.listBlobsFlat({ includeMetadata: true })) {
            metadata[blob.name] = {
                lastModified: blob.properties.lastModified,
                size: blob.properties.contentLength,
                etag: blob.properties.etag,
            };
        }

        return metadata;
    }

    /**
     * Delete a blob from the container.
     *
     * @param blobName - Name of the blob to delete
     * @returns Promise resolving to true if deleted successfully
     */
    async deleteBlob(blobName: string): Promise<boolean> {
        const blobClient = this.containerClient.getBlobClient(blobName);
        await blobClient.delete();
        return true;
    }

    /**
     * Find blobs by filename pattern (case insensitive by default).
     *
     * @param filename - Filename or pattern to search for
     * @param caseSensitive - Whether the search should be case sensitive
     * @returns Promise resolving to array of matching blob properties
     */
    async findBlobsByFilename(
        filename: string,
        caseSensitive = false
    ): Promise<BlobProperties[]> {
        const matchingBlobs: BlobProperties[] = [];
        const searchTerm = caseSensitive ? filename : filename.toLowerCase();

        for await (const blob of this.containerClient.listBlobsFlat()) {
            const blobName = caseSensitive ? blob.name : blob.name.toLowerCase();
            if (blobName.includes(searchTerm)) {
                matchingBlobs.push(blob as unknown as BlobProperties);
            }
        }

        return matchingBlobs;
    }

    /**
     * Upload a file to the container.
     *
     * @param localFilePath - Path to the local file
     * @param destinationBlobName - Name for the blob (defaults to filename)
     * @param options - Upload options
     * @returns Promise resolving to the block blob client
     */
    async uploadFile(
        localFilePath: string,
        destinationBlobName?: string,
        options?: UploadOptions
    ): Promise<BlockBlobClient> {
        const blobName = destinationBlobName || path.basename(localFilePath);
        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

        // Determine content type
        let contentType = options?.contentType;
        if (!contentType) {
            const blobType = blobTypeFromExtension(path.extname(localFilePath));
            contentType = blobType || 'application/octet-stream';
        }

        // Read file and upload
        const fileContent = fs.readFileSync(localFilePath);
        await blockBlobClient.upload(fileContent, fileContent.length, {
            blobHTTPHeaders: {
                blobContentType: contentType,
            },
            metadata: options?.metadata,
        });

        return blockBlobClient;
    }

    /**
     * Upload data directly to a blob.
     *
     * @param data - Data to upload (Buffer, string, or object for JSON)
     * @param blobName - Name for the blob
     * @param options - Upload options
     * @returns Promise resolving to the block blob client
     */
    async uploadData(
        data: Buffer | string | object,
        blobName: string,
        options?: UploadOptions
    ): Promise<BlockBlobClient> {
        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

        let content: Buffer;
        let contentType = options?.contentType || 'application/octet-stream';

        if (typeof data === 'string') {
            content = Buffer.from(data, 'utf-8');
            if (!options?.contentType) {
                contentType = 'text/plain';
            }
        } else if (Buffer.isBuffer(data)) {
            content = data;
        } else {
            // Assume it's an object - serialize to JSON
            content = Buffer.from(JSON.stringify(data), 'utf-8');
            if (!options?.contentType) {
                contentType = 'application/json';
            }
        }

        await blockBlobClient.upload(content, content.length, {
            blobHTTPHeaders: {
                blobContentType: contentType,
            },
            metadata: options?.metadata,
        });

        return blockBlobClient;
    }

    /**
     * Get the folder structure of blobs in the container.
     *
     * @returns Promise resolving to a tree structure of folders and files
     */
    async getFolderStructure(): Promise<Record<string, string[]>> {
        const structure: Record<string, string[]> = {};

        for await (const blob of this.containerClient.listBlobsFlat()) {
            const parts = blob.name.split('/');
            const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
            const filename = parts[parts.length - 1];

            if (!structure[folder]) {
                structure[folder] = [];
            }
            structure[folder].push(filename);
        }

        return structure;
    }

    /**
     * Check if a blob exists.
     *
     * @param blobName - Name of the blob to check
     * @returns Promise resolving to true if exists
     */
    async blobExists(blobName: string): Promise<boolean> {
        const blobClient = this.containerClient.getBlobClient(blobName);
        return blobClient.exists();
    }
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from '../src/storage/container';
import { BlobType } from '../src/storage/blob-type';

describe('Container', () => {
    let container: Container;
    let mockStorageAccount: { getName: () => string };
    let mockContainerClient: {
        containerName: string;
        getBlobClient: ReturnType<typeof vi.fn>;
        getBlockBlobClient: ReturnType<typeof vi.fn>;
        listBlobsFlat: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockStorageAccount = {
            getName: () => 'teststorageaccount',
        };

        mockContainerClient = {
            containerName: 'test-container',
            getBlobClient: vi.fn(),
            getBlockBlobClient: vi.fn(),
            listBlobsFlat: vi.fn(),
        };

        container = new Container(
            mockStorageAccount as never,
            mockContainerClient as never
        );
    });

    describe('getName', () => {
        it('should return the container name', () => {
            expect(container.getName()).toBe('test-container');
        });
    });

    describe('getClient', () => {
        it('should return the underlying container client', () => {
            expect(container.getClient()).toBe(mockContainerClient);
        });
    });

    describe('getStorageAccount', () => {
        it('should return the parent storage account', () => {
            expect(container.getStorageAccount()).toBe(mockStorageAccount);
        });
    });

    describe('getBlobNames', () => {
        it('should return all blob names', async () => {
            mockContainerClient.listBlobsFlat.mockImplementation(async function* () {
                yield { name: 'file1.txt' };
                yield { name: 'file2.json' };
                yield { name: 'folder/file3.pdf' };
            });

            const names = await container.getBlobNames();

            expect(names).toEqual(['file1.txt', 'file2.json', 'folder/file3.pdf']);
        });

        it('should return empty array for empty container', async () => {
            mockContainerClient.listBlobsFlat.mockImplementation(async function* () {
                // yields nothing
            });

            const names = await container.getBlobNames();

            expect(names).toEqual([]);
        });
    });

    describe('getBlobs', () => {
        it('should return all blobs with properties', async () => {
            mockContainerClient.listBlobsFlat.mockImplementation(async function* () {
                yield { name: 'file1.txt', properties: { contentLength: 100 } };
                yield { name: 'file2.json', properties: { contentLength: 200 } };
            });

            const blobs = await container.getBlobs();

            expect(blobs).toHaveLength(2);
        });
    });

    describe('getBlobType', () => {
        it('should return correct BlobType for known extensions', () => {
            expect(container.getBlobType('document.txt')).toBe(BlobType.TEXT_PLAIN);
            expect(container.getBlobType('data.json')).toBe(BlobType.APP_JSON);
            expect(container.getBlobType('report.pdf')).toBe(BlobType.APP_PDF);
            expect(container.getBlobType('image.png')).toBe(BlobType.IMAGE_PNG);
        });

        it('should return null for unknown extensions', () => {
            expect(container.getBlobType('file.xyz')).toBeNull();
            expect(container.getBlobType('file.unknown')).toBeNull();
        });

        it('should handle files without extensions', () => {
            expect(container.getBlobType('README')).toBeNull();
        });

        it('should handle nested paths', () => {
            expect(container.getBlobType('folder/subfolder/file.json')).toBe(BlobType.APP_JSON);
        });
    });

    describe('getBlobContent', () => {
        it('should return JSON object for .json files', async () => {
            const mockData = { key: 'value' };
            const mockBlobClient = {
                download: vi.fn().mockResolvedValue({
                    readableStreamBody: (async function* () {
                        yield Buffer.from(JSON.stringify(mockData));
                    })(),
                }),
            };
            mockContainerClient.getBlobClient.mockReturnValue(mockBlobClient);

            const content = await container.getBlobContent('data.json');

            expect(content).toEqual(mockData);
        });

        it('should return string for text files', async () => {
            const mockBlobClient = {
                download: vi.fn().mockResolvedValue({
                    readableStreamBody: (async function* () {
                        yield Buffer.from('Hello, World!');
                    })(),
                }),
            };
            mockContainerClient.getBlobClient.mockReturnValue(mockBlobClient);

            const content = await container.getBlobContent('file.txt');

            expect(content).toBe('Hello, World!');
        });

        it('should return buffer for binary files', async () => {
            const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
            const mockBlobClient = {
                download: vi.fn().mockResolvedValue({
                    readableStreamBody: (async function* () {
                        yield binaryData;
                    })(),
                }),
            };
            mockContainerClient.getBlobClient.mockReturnValue(mockBlobClient);

            const content = await container.getBlobContent('image.png');

            expect(Buffer.isBuffer(content)).toBe(true);
        });

        it('should throw error when download fails', async () => {
            const mockBlobClient = {
                download: vi.fn().mockResolvedValue({
                    readableStreamBody: null,
                }),
            };
            mockContainerClient.getBlobClient.mockReturnValue(mockBlobClient);

            await expect(container.getBlobContent('file.txt')).rejects.toThrow(
                'Failed to download blob'
            );
        });
    });

    describe('getBlobMetadata', () => {
        it('should return metadata for all blobs', async () => {
            const lastModified = new Date();
            mockContainerClient.listBlobsFlat.mockImplementation(function (options?: { includeMetadata?: boolean }) {
                return (async function* () {
                    if (options?.includeMetadata) {
                        yield {
                            name: 'file1.txt',
                            properties: {
                                lastModified,
                                contentLength: 100,
                                etag: '"abc123"',
                            },
                        };
                    }
                })();
            });

            const metadata = await container.getBlobMetadata();

            expect(metadata['file1.txt']).toEqual({
                lastModified,
                size: 100,
                etag: '"abc123"',
            });
        });
    });

    describe('deleteBlob', () => {
        it('should delete a blob successfully', async () => {
            const mockBlobClient = {
                delete: vi.fn().mockResolvedValue({}),
            };
            mockContainerClient.getBlobClient.mockReturnValue(mockBlobClient);

            const result = await container.deleteBlob('file.txt');

            expect(result).toBe(true);
            expect(mockBlobClient.delete).toHaveBeenCalled();
        });
    });

    describe('findBlobsByFilename', () => {
        beforeEach(() => {
            mockContainerClient.listBlobsFlat.mockImplementation(async function* () {
                yield { name: 'report.pdf', properties: {} };
                yield { name: 'Report_2024.pdf', properties: {} };
                yield { name: 'data.json', properties: {} };
                yield { name: 'REPORT_final.PDF', properties: {} };
            });
        });

        it('should find blobs by filename (case insensitive)', async () => {
            const results = await container.findBlobsByFilename('report');

            expect(results).toHaveLength(3);
        });

        it('should find blobs by filename (case sensitive)', async () => {
            const results = await container.findBlobsByFilename('Report', true);

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Report_2024.pdf');
        });

        it('should return empty array when no matches', async () => {
            const results = await container.findBlobsByFilename('nonexistent');

            expect(results).toEqual([]);
        });
    });

    describe('uploadData', () => {
        let mockBlockBlobClient: {
            upload: ReturnType<typeof vi.fn>;
        };

        beforeEach(() => {
            mockBlockBlobClient = {
                upload: vi.fn().mockResolvedValue({}),
            };
            mockContainerClient.getBlockBlobClient.mockReturnValue(mockBlockBlobClient);
        });

        it('should upload string data', async () => {
            await container.uploadData('Hello, World!', 'greeting.txt');

            expect(mockBlockBlobClient.upload).toHaveBeenCalled();
            const [content, length, options] = mockBlockBlobClient.upload.mock.calls[0];
            expect(content.toString()).toBe('Hello, World!');
            expect(length).toBe(13);
            expect(options.blobHTTPHeaders.blobContentType).toBe('text/plain');
        });

        it('should upload buffer data', async () => {
            const buffer = Buffer.from([1, 2, 3, 4]);
            await container.uploadData(buffer, 'data.bin');

            expect(mockBlockBlobClient.upload).toHaveBeenCalled();
            const [content, length] = mockBlockBlobClient.upload.mock.calls[0];
            expect(Buffer.isBuffer(content)).toBe(true);
            expect(length).toBe(4);
        });

        it('should upload object as JSON', async () => {
            await container.uploadData({ key: 'value' }, 'data.json');

            expect(mockBlockBlobClient.upload).toHaveBeenCalled();
            const [content, , options] = mockBlockBlobClient.upload.mock.calls[0];
            expect(content.toString()).toBe('{"key":"value"}');
            expect(options.blobHTTPHeaders.blobContentType).toBe('application/json');
        });

        it('should use custom content type when provided', async () => {
            await container.uploadData('data', 'file.txt', {
                contentType: 'application/custom',
            });

            const [, , options] = mockBlockBlobClient.upload.mock.calls[0];
            expect(options.blobHTTPHeaders.blobContentType).toBe('application/custom');
        });

        it('should include metadata when provided', async () => {
            await container.uploadData('data', 'file.txt', {
                metadata: { author: 'test' },
            });

            const [, , options] = mockBlockBlobClient.upload.mock.calls[0];
            expect(options.metadata).toEqual({ author: 'test' });
        });
    });

    describe('getFolderStructure', () => {
        it('should return folder structure', async () => {
            mockContainerClient.listBlobsFlat.mockImplementation(async function* () {
                yield { name: 'root.txt' };
                yield { name: 'folder1/file1.txt' };
                yield { name: 'folder1/file2.txt' };
                yield { name: 'folder2/subfolder/file3.txt' };
            });

            const structure = await container.getFolderStructure();

            expect(structure['/']).toContain('root.txt');
            expect(structure['folder1']).toContain('file1.txt');
            expect(structure['folder1']).toContain('file2.txt');
            expect(structure['folder2/subfolder']).toContain('file3.txt');
        });
    });

    describe('blobExists', () => {
        it('should return true for existing blob', async () => {
            const mockBlobClient = {
                exists: vi.fn().mockResolvedValue(true),
            };
            mockContainerClient.getBlobClient.mockReturnValue(mockBlobClient);

            const exists = await container.blobExists('file.txt');

            expect(exists).toBe(true);
        });

        it('should return false for non-existing blob', async () => {
            const mockBlobClient = {
                exists: vi.fn().mockResolvedValue(false),
            };
            mockContainerClient.getBlobClient.mockReturnValue(mockBlobClient);

            const exists = await container.blobExists('nonexistent.txt');

            expect(exists).toBe(false);
        });
    });

    describe('static BlobType reference', () => {
        it('should expose BlobType enum', () => {
            expect(Container.BlobType).toBe(BlobType);
            expect(Container.BlobType.TEXT_PLAIN).toBe('text/plain');
        });
    });
});

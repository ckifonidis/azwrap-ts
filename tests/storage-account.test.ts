import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageAccount, validateContainerName } from '../src/storage/storage-account';
import { ResourceNotFoundError } from '../src/errors';

// Mock Azure Storage clients
const mockContainerClient = {
    containerName: 'test-container',
    exists: vi.fn(),
    delete: vi.fn(),
    listBlobsFlat: vi.fn(),
};

const mockBlobServiceClient = {
    getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
    listContainers: vi.fn(),
    createContainer: vi.fn(),
};

vi.mock('@azure/storage-blob', () => ({
    BlobServiceClient: {
        fromConnectionString: vi.fn().mockImplementation(() => mockBlobServiceClient),
    },
    ContainerClient: vi.fn(),
}));

describe('StorageAccount', () => {
    let storageAccount: StorageAccount;
    let mockResourceGroup: {
        getName: () => string;
        getStorageManagementClient: () => {
            storageAccounts: {
                listKeys: () => Promise<{ keys: Array<{ value: string }> }>;
            };
        };
    };
    let mockAzureStorageAccount: { name: string };

    beforeEach(() => {
        vi.clearAllMocks();

        mockResourceGroup = {
            getName: () => 'test-resource-group',
            getStorageManagementClient: () => ({
                storageAccounts: {
                    listKeys: vi.fn().mockResolvedValue({
                        keys: [{ value: 'test-storage-key' }],
                    }),
                },
            }),
        };

        mockAzureStorageAccount = {
            name: 'teststorageaccount',
        };

        storageAccount = new StorageAccount(
            mockResourceGroup as never,
            mockAzureStorageAccount as never
        );
    });

    describe('getName', () => {
        it('should return the storage account name', () => {
            expect(storageAccount.getName()).toBe('teststorageaccount');
        });

        it('should return empty string if name is undefined', () => {
            const accountWithoutName = new StorageAccount(
                mockResourceGroup as never,
                {} as never
            );
            expect(accountWithoutName.getName()).toBe('');
        });
    });

    describe('initialize', () => {
        it('should fetch and store the storage key', async () => {
            await storageAccount.initialize();

            const connectionString = storageAccount.getConnectionString();
            expect(connectionString).toContain('teststorageaccount');
            expect(connectionString).toContain('test-storage-key');
        });

        it('should throw error when no keys available', async () => {
            const mockRGNoKeys = {
                getName: () => 'test-resource-group',
                getStorageManagementClient: () => ({
                    storageAccounts: {
                        listKeys: vi.fn().mockResolvedValue({ keys: [] }),
                    },
                }),
            };

            const account = new StorageAccount(
                mockRGNoKeys as never,
                mockAzureStorageAccount as never
            );

            await expect(account.initialize()).rejects.toThrow('Failed to get storage keys');
        });
    });

    describe('static create', () => {
        it('should create and initialize a storage account', async () => {
            const account = await StorageAccount.create(
                mockResourceGroup as never,
                mockAzureStorageAccount as never
            );

            expect(account.getName()).toBe('teststorageaccount');
            expect(account.getConnectionString()).toContain('test-storage-key');
        });
    });

    describe('getConnectionString', () => {
        it('should return empty string before initialization', () => {
            expect(storageAccount.getConnectionString()).toBe('');
        });

        it('should return valid connection string after initialization', async () => {
            await storageAccount.initialize();

            const connStr = storageAccount.getConnectionString();
            expect(connStr).toContain('DefaultEndpointsProtocol=https');
            expect(connStr).toContain('AccountName=teststorageaccount');
            expect(connStr).toContain('AccountKey=test-storage-key');
            expect(connStr).toContain('EndpointSuffix=core.windows.net');
        });
    });

    describe('getContainers', () => {
        it('should list all containers', async () => {
            await storageAccount.initialize();

            mockBlobServiceClient.listContainers.mockImplementation(async function* () {
                yield { name: 'container1' };
                yield { name: 'container2' };
            });

            const containers = await storageAccount.getContainers();

            expect(containers).toHaveLength(2);
            expect(containers[0].name).toBe('container1');
            expect(containers[1].name).toBe('container2');
        });
    });

    describe('getContainer', () => {
        it('should return a container that exists', async () => {
            await storageAccount.initialize();
            mockContainerClient.exists.mockResolvedValue(true);

            const container = await storageAccount.getContainer('test-container');

            expect(container.getName()).toBe('test-container');
        });

        it('should throw ResourceNotFoundError for non-existent container', async () => {
            await storageAccount.initialize();
            mockContainerClient.exists.mockResolvedValue(false);

            await expect(
                storageAccount.getContainer('non-existent')
            ).rejects.toThrow(ResourceNotFoundError);
        });
    });

    describe('createContainer', () => {
        it('should create a container with valid name', async () => {
            await storageAccount.initialize();
            mockBlobServiceClient.createContainer.mockResolvedValue({
                containerClient: mockContainerClient,
            });

            const container = await storageAccount.createContainer('new-container');

            expect(container).toBeDefined();
            expect(mockBlobServiceClient.createContainer).toHaveBeenCalledWith(
                'new-container',
                { access: undefined }
            );
        });

        it('should create a container with blob access', async () => {
            await storageAccount.initialize();
            mockBlobServiceClient.createContainer.mockResolvedValue({
                containerClient: mockContainerClient,
            });

            await storageAccount.createContainer('public-container', 'blob');

            expect(mockBlobServiceClient.createContainer).toHaveBeenCalledWith(
                'public-container',
                { access: 'blob' }
            );
        });

        it('should throw error for invalid container name', async () => {
            await storageAccount.initialize();

            await expect(
                storageAccount.createContainer('Invalid_Name')
            ).rejects.toThrow();
        });
    });

    describe('deleteContainer', () => {
        it('should delete an empty container', async () => {
            await storageAccount.initialize();
            mockContainerClient.exists.mockResolvedValue(true);
            mockContainerClient.listBlobsFlat.mockReturnValue({
                byPage: () => ({
                    next: vi.fn().mockResolvedValue({
                        value: { segment: { blobItems: [] } },
                    }),
                }),
            });
            mockContainerClient.delete.mockResolvedValue({});

            const result = await storageAccount.deleteContainer('test-container');

            expect(result).toBe(true);
        });

        it('should throw error when deleting non-empty container without force', async () => {
            await storageAccount.initialize();
            mockContainerClient.exists.mockResolvedValue(true);
            mockContainerClient.listBlobsFlat.mockReturnValue({
                byPage: () => ({
                    next: vi.fn().mockResolvedValue({
                        value: { segment: { blobItems: [{ name: 'blob1' }] } },
                    }),
                }),
            });

            await expect(
                storageAccount.deleteContainer('test-container')
            ).rejects.toThrow('not empty');
        });

        it('should delete non-empty container with force=true', async () => {
            await storageAccount.initialize();
            mockContainerClient.exists.mockResolvedValue(true);
            mockContainerClient.delete.mockResolvedValue({});

            const result = await storageAccount.deleteContainer('test-container', true);

            expect(result).toBe(true);
        });

        it('should throw ResourceNotFoundError for non-existent container', async () => {
            await storageAccount.initialize();
            mockContainerClient.exists.mockResolvedValue(false);

            await expect(
                storageAccount.deleteContainer('non-existent')
            ).rejects.toThrow(ResourceNotFoundError);
        });
    });

    describe('getTablesClient', () => {
        it('should return a Table client', async () => {
            await storageAccount.initialize();
            const tableClient = storageAccount.getTablesClient();
            expect(tableClient).toBeDefined();
        });
    });
});

describe('validateContainerName (additional tests)', () => {
    it('should accept minimum valid length', () => {
        expect(validateContainerName('abc')).toBe(true);
    });

    it('should accept maximum valid length', () => {
        const maxName = 'a'.repeat(63);
        expect(validateContainerName(maxName)).toBe(true);
    });

    it('should accept names with numbers', () => {
        expect(validateContainerName('container123')).toBe(true);
        expect(validateContainerName('123container')).toBe(true);
    });

    it('should accept names with single hyphens', () => {
        expect(validateContainerName('my-container-name')).toBe(true);
    });
});

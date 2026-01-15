import { describe, it, expect } from 'vitest';
import {
    BlobType,
    blobTypeFromExtension,
    blobTypeFromMimeType,
    isTextType,
    validateContainerName,
} from '../src/storage';

describe('BlobType', () => {
    describe('blobTypeFromExtension', () => {
        it('should return correct BlobType for common extensions', () => {
            expect(blobTypeFromExtension('.txt')).toBe(BlobType.TEXT_PLAIN);
            expect(blobTypeFromExtension('.json')).toBe(BlobType.APP_JSON);
            expect(blobTypeFromExtension('.pdf')).toBe(BlobType.APP_PDF);
            expect(blobTypeFromExtension('.jpg')).toBe(BlobType.IMAGE_JPEG);
            expect(blobTypeFromExtension('.png')).toBe(BlobType.IMAGE_PNG);
            expect(blobTypeFromExtension('.docx')).toBe(BlobType.MS_WORD);
            expect(blobTypeFromExtension('.xlsx')).toBe(BlobType.MS_EXCEL);
        });

        it('should handle extensions without leading dot', () => {
            expect(blobTypeFromExtension('txt')).toBe(BlobType.TEXT_PLAIN);
            expect(blobTypeFromExtension('json')).toBe(BlobType.APP_JSON);
        });

        it('should return null for unknown extensions', () => {
            expect(blobTypeFromExtension('.unknown')).toBeNull();
            expect(blobTypeFromExtension('.xyz')).toBeNull();
        });

        it('should be case insensitive', () => {
            expect(blobTypeFromExtension('.TXT')).toBe(BlobType.TEXT_PLAIN);
            expect(blobTypeFromExtension('.JSON')).toBe(BlobType.APP_JSON);
        });
    });

    describe('blobTypeFromMimeType', () => {
        it('should return correct BlobType for MIME types', () => {
            expect(blobTypeFromMimeType('text/plain')).toBe(BlobType.TEXT_PLAIN);
            expect(blobTypeFromMimeType('application/json')).toBe(BlobType.APP_JSON);
            expect(blobTypeFromMimeType('application/pdf')).toBe(BlobType.APP_PDF);
            expect(blobTypeFromMimeType('image/jpeg')).toBe(BlobType.IMAGE_JPEG);
        });

        it('should handle MIME types with charset', () => {
            expect(blobTypeFromMimeType('text/plain; charset=utf-8')).toBe(BlobType.TEXT_PLAIN);
        });

        it('should return null for unknown MIME types', () => {
            expect(blobTypeFromMimeType('application/unknown')).toBeNull();
        });

        it('should return null for empty input', () => {
            expect(blobTypeFromMimeType('')).toBeNull();
        });
    });

    describe('isTextType', () => {
        it('should return true for text types', () => {
            expect(isTextType(BlobType.TEXT_PLAIN)).toBe(true);
            expect(isTextType(BlobType.TEXT_HTML)).toBe(true);
            expect(isTextType(BlobType.APP_JSON)).toBe(true);
            expect(isTextType(BlobType.TEXT_MARKDOWN)).toBe(true);
        });

        it('should return false for binary types', () => {
            expect(isTextType(BlobType.APP_PDF)).toBe(false);
            expect(isTextType(BlobType.IMAGE_JPEG)).toBe(false);
            expect(isTextType(BlobType.MS_WORD)).toBe(false);
        });
    });
});

describe('validateContainerName', () => {
    it('should accept valid container names', () => {
        expect(validateContainerName('mycontainer')).toBe(true);
        expect(validateContainerName('my-container')).toBe(true);
        expect(validateContainerName('container123')).toBe(true);
        expect(validateContainerName('abc')).toBe(true);
    });

    it('should reject names that are too short', () => {
        expect(() => validateContainerName('ab')).toThrow();
        expect(() => validateContainerName('a')).toThrow();
    });

    it('should reject names that are too long', () => {
        const longName = 'a'.repeat(64);
        expect(() => validateContainerName(longName)).toThrow();
    });

    it('should reject names with uppercase letters', () => {
        expect(() => validateContainerName('MyContainer')).toThrow();
        expect(() => validateContainerName('CONTAINER')).toThrow();
    });

    it('should reject names with invalid characters', () => {
        expect(() => validateContainerName('my_container')).toThrow();
        expect(() => validateContainerName('my.container')).toThrow();
        expect(() => validateContainerName('my container')).toThrow();
    });

    it('should reject names starting or ending with hyphen', () => {
        expect(() => validateContainerName('-container')).toThrow();
        expect(() => validateContainerName('container-')).toThrow();
    });

    it('should reject names with consecutive hyphens', () => {
        expect(() => validateContainerName('my--container')).toThrow();
    });
});

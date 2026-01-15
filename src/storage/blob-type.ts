/**
 * Enumeration of common MIME types for blobs in Azure Storage.
 */
export enum BlobType {
    // Text formats
    TEXT_PLAIN = 'text/plain',
    TEXT_CSV = 'text/csv',
    TEXT_HTML = 'text/html',
    TEXT_CSS = 'text/css',
    TEXT_JAVASCRIPT = 'text/javascript',
    TEXT_XML = 'text/xml',
    TEXT_MARKDOWN = 'text/markdown',

    // Application formats
    APP_JSON = 'application/json',
    APP_XML = 'application/xml',
    APP_PDF = 'application/pdf',
    APP_ZIP = 'application/zip',
    APP_GZIP = 'application/gzip',
    APP_OCTET_STREAM = 'application/octet-stream',

    // Microsoft Office formats
    MS_WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    MS_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    MS_POWERPOINT = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Image formats
    IMAGE_JPEG = 'image/jpeg',
    IMAGE_PNG = 'image/png',
    IMAGE_GIF = 'image/gif',
    IMAGE_SVG = 'image/svg+xml',
    IMAGE_WEBP = 'image/webp',
    IMAGE_TIFF = 'image/tiff',

    // Audio formats
    AUDIO_MP3 = 'audio/mpeg',
    AUDIO_WAV = 'audio/wav',
    AUDIO_OGG = 'audio/ogg',

    // Video formats
    VIDEO_MP4 = 'video/mp4',
    VIDEO_WEBM = 'video/webm',
    VIDEO_OGG = 'video/ogg',
}

/**
 * Extension to MIME type mapping.
 */
const extensionMap: Record<string, BlobType> = {
    '.txt': BlobType.TEXT_PLAIN,
    '.csv': BlobType.TEXT_CSV,
    '.html': BlobType.TEXT_HTML,
    '.htm': BlobType.TEXT_HTML,
    '.css': BlobType.TEXT_CSS,
    '.js': BlobType.TEXT_JAVASCRIPT,
    '.xml': BlobType.TEXT_XML,
    '.md': BlobType.TEXT_MARKDOWN,
    '.json': BlobType.APP_JSON,
    '.pdf': BlobType.APP_PDF,
    '.zip': BlobType.APP_ZIP,
    '.gz': BlobType.APP_GZIP,
    '.docx': BlobType.MS_WORD,
    '.xlsx': BlobType.MS_EXCEL,
    '.pptx': BlobType.MS_POWERPOINT,
    '.jpg': BlobType.IMAGE_JPEG,
    '.jpeg': BlobType.IMAGE_JPEG,
    '.png': BlobType.IMAGE_PNG,
    '.gif': BlobType.IMAGE_GIF,
    '.svg': BlobType.IMAGE_SVG,
    '.webp': BlobType.IMAGE_WEBP,
    '.tif': BlobType.IMAGE_TIFF,
    '.tiff': BlobType.IMAGE_TIFF,
    '.mp3': BlobType.AUDIO_MP3,
    '.wav': BlobType.AUDIO_WAV,
    '.ogg': BlobType.AUDIO_OGG,
    '.mp4': BlobType.VIDEO_MP4,
    '.webm': BlobType.VIDEO_WEBM,
    '.bin': BlobType.APP_OCTET_STREAM,
};

/**
 * MIME type alias mapping.
 */
const mimeAliasMap: Record<string, BlobType> = {
    // Text types with charset parameters
    'text/plain; charset=utf-8': BlobType.TEXT_PLAIN,
    'text/csv; charset=utf-8': BlobType.TEXT_CSV,
    'text/html; charset=utf-8': BlobType.TEXT_HTML,

    // Common aliases
    'application/javascript': BlobType.TEXT_JAVASCRIPT,
    'application/xhtml+xml': BlobType.TEXT_HTML,
    'text/xml; charset=utf-8': BlobType.TEXT_XML,
    'application/text': BlobType.TEXT_PLAIN,
    text: BlobType.TEXT_PLAIN,

    // Office document types
    'application/msword': BlobType.MS_WORD,
    'application/vnd.ms-word': BlobType.MS_WORD,
    'application/vnd.ms-excel': BlobType.MS_EXCEL,
    'application/excel': BlobType.MS_EXCEL,
    'application/vnd.ms-powerpoint': BlobType.MS_POWERPOINT,
    'application/powerpoint': BlobType.MS_POWERPOINT,

    // Image types
    'image/jpg': BlobType.IMAGE_JPEG, // Common misspelling

    // Document types
    'application/x-pdf': BlobType.APP_PDF,

    // Archives
    'application/x-zip-compressed': BlobType.APP_ZIP,
    'application/x-gzip': BlobType.APP_GZIP,
};

/**
 * Get BlobType from file extension.
 *
 * @param extension - The file extension (with or without leading dot)
 * @returns BlobType enum value or null if unknown extension
 */
export function blobTypeFromExtension(extension: string): BlobType | null {
    let ext = extension.toLowerCase();
    if (!ext.startsWith('.')) {
        ext = '.' + ext;
    }
    return extensionMap[ext] ?? null;
}

/**
 * Get BlobType from MIME type string.
 *
 * @param mimeType - The MIME type string (e.g., 'text/plain', 'application/pdf')
 * @returns BlobType enum value or null if unknown MIME type
 */
export function blobTypeFromMimeType(mimeType: string): BlobType | null {
    if (!mimeType) {
        return null;
    }

    const lowerMime = mimeType.toLowerCase();

    // Try to find a direct match with enum values
    for (const value of Object.values(BlobType)) {
        if (value.toLowerCase() === lowerMime) {
            return value as BlobType;
        }
    }

    // Check the alias map for exact matches
    if (lowerMime in mimeAliasMap) {
        return mimeAliasMap[lowerMime];
    }

    // Try to match just the main part before any parameters
    const baseMime = lowerMime.split(';')[0].trim();
    for (const value of Object.values(BlobType)) {
        if (value.toLowerCase() === baseMime) {
            return value as BlobType;
        }
    }

    // No match found
    return null;
}

/**
 * Get file extension from BlobType.
 *
 * @param blobType - The BlobType enum value
 * @returns The primary file extension for this type (with dot)
 */
export function extensionFromBlobType(blobType: BlobType): string {
    const reverseMap: Record<BlobType, string> = {
        [BlobType.TEXT_PLAIN]: '.txt',
        [BlobType.TEXT_CSV]: '.csv',
        [BlobType.TEXT_HTML]: '.html',
        [BlobType.TEXT_CSS]: '.css',
        [BlobType.TEXT_JAVASCRIPT]: '.js',
        [BlobType.TEXT_XML]: '.xml',
        [BlobType.TEXT_MARKDOWN]: '.md',
        [BlobType.APP_JSON]: '.json',
        [BlobType.APP_XML]: '.xml',
        [BlobType.APP_PDF]: '.pdf',
        [BlobType.APP_ZIP]: '.zip',
        [BlobType.APP_GZIP]: '.gz',
        [BlobType.APP_OCTET_STREAM]: '.bin',
        [BlobType.MS_WORD]: '.docx',
        [BlobType.MS_EXCEL]: '.xlsx',
        [BlobType.MS_POWERPOINT]: '.pptx',
        [BlobType.IMAGE_JPEG]: '.jpg',
        [BlobType.IMAGE_PNG]: '.png',
        [BlobType.IMAGE_GIF]: '.gif',
        [BlobType.IMAGE_SVG]: '.svg',
        [BlobType.IMAGE_WEBP]: '.webp',
        [BlobType.IMAGE_TIFF]: '.tiff',
        [BlobType.AUDIO_MP3]: '.mp3',
        [BlobType.AUDIO_WAV]: '.wav',
        [BlobType.AUDIO_OGG]: '.ogg',
        [BlobType.VIDEO_MP4]: '.mp4',
        [BlobType.VIDEO_WEBM]: '.webm',
        [BlobType.VIDEO_OGG]: '.ogg',
    };

    return reverseMap[blobType] || '.bin';
}

/**
 * Check if a BlobType is a text-based format.
 */
export function isTextType(blobType: BlobType): boolean {
    const textTypes = [
        BlobType.TEXT_PLAIN,
        BlobType.TEXT_CSV,
        BlobType.TEXT_HTML,
        BlobType.TEXT_CSS,
        BlobType.TEXT_JAVASCRIPT,
        BlobType.TEXT_XML,
        BlobType.TEXT_MARKDOWN,
        BlobType.APP_JSON,
        BlobType.APP_XML,
    ];
    return textTypes.includes(blobType);
}

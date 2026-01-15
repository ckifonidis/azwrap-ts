/**
 * Custom error class for Azure resource not found errors.
 * Extends the standard Error class to provide consistent error handling.
 */
export class ResourceNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ResourceNotFoundError';
        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ResourceNotFoundError);
        }
    }
}

/**
 * Error thrown when authentication fails.
 */
export class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AuthenticationError);
        }
    }
}

/**
 * Error thrown when required configuration is missing.
 */
export class ConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigurationError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ConfigurationError);
        }
    }
}

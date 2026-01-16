import { describe, it, expect } from 'vitest';
import {
    ResourceNotFoundError,
    AuthenticationError,
    ConfigurationError,
} from '../src/errors';

describe('Custom Errors', () => {
    describe('ResourceNotFoundError', () => {
        it('should have correct name', () => {
            const error = new ResourceNotFoundError('Resource not found');
            expect(error.name).toBe('ResourceNotFoundError');
        });

        it('should have correct message', () => {
            const message = 'Storage account xyz not found';
            const error = new ResourceNotFoundError(message);
            expect(error.message).toBe(message);
        });

        it('should be an instance of Error', () => {
            const error = new ResourceNotFoundError('test');
            expect(error).toBeInstanceOf(Error);
        });

        it('should have stack trace', () => {
            const error = new ResourceNotFoundError('test');
            expect(error.stack).toBeDefined();
        });
    });

    describe('AuthenticationError', () => {
        it('should have correct name', () => {
            const error = new AuthenticationError('Auth failed');
            expect(error.name).toBe('AuthenticationError');
        });

        it('should have correct message', () => {
            const message = 'Invalid credentials';
            const error = new AuthenticationError(message);
            expect(error.message).toBe(message);
        });

        it('should be an instance of Error', () => {
            const error = new AuthenticationError('test');
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('ConfigurationError', () => {
        it('should have correct name', () => {
            const error = new ConfigurationError('Config missing');
            expect(error.name).toBe('ConfigurationError');
        });

        it('should have correct message', () => {
            const message = 'Missing AZURE_TENANT_ID';
            const error = new ConfigurationError(message);
            expect(error.message).toBe(message);
        });

        it('should be an instance of Error', () => {
            const error = new ConfigurationError('test');
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('Error inheritance and catching', () => {
        it('should be catchable as Error', () => {
            const throwAndCatch = () => {
                try {
                    throw new ResourceNotFoundError('test');
                } catch (e) {
                    if (e instanceof Error) {
                        return e.name;
                    }
                    return 'not an error';
                }
            };
            expect(throwAndCatch()).toBe('ResourceNotFoundError');
        });

        it('should be distinguishable from other error types', () => {
            const errors = [
                new ResourceNotFoundError('not found'),
                new AuthenticationError('auth failed'),
                new ConfigurationError('config missing'),
            ];

            expect(errors[0]).toBeInstanceOf(ResourceNotFoundError);
            expect(errors[0]).not.toBeInstanceOf(AuthenticationError);
            expect(errors[1]).toBeInstanceOf(AuthenticationError);
            expect(errors[1]).not.toBeInstanceOf(ConfigurationError);
            expect(errors[2]).toBeInstanceOf(ConfigurationError);
            expect(errors[2]).not.toBeInstanceOf(ResourceNotFoundError);
        });
    });
});

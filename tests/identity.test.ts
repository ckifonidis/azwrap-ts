import { describe, it, expect, beforeAll } from 'vitest';
import { Identity } from '../src/identity';
import { AuthenticationError } from '../src/errors';
import { testConfig, hasCredentials } from './setup';

describe('Identity', () => {
    describe('initialization', () => {
        it('should throw error with partial credentials', async () => {
            await expect(
                Identity.create({
                    tenantId: 'test-tenant',
                    // Missing clientId and clientSecret
                })
            ).rejects.toThrow(AuthenticationError);
        });

        it('should fall back to DefaultAzureCredential with empty string credentials', async () => {
            // Empty strings are treated as "no credentials" and falls back to DefaultAzureCredential
            const identity = await Identity.create({
                tenantId: '',
                clientId: '',
                clientSecret: '',
            });
            expect(identity.getCredential()).toBeDefined();
            // Verify it's using DefaultAzureCredential (tenantId/clientId will be empty)
            expect(identity.tenantId).toBe('');
            expect(identity.clientId).toBe('');
        });

        it.skipIf(!hasCredentials())(
            'should create Identity with valid credentials',
            async () => {
                const identity = await Identity.create({
                    tenantId: testConfig.tenantId,
                    clientId: testConfig.clientId,
                    clientSecret: testConfig.clientSecret,
                });

                expect(identity.tenantId).toBe(testConfig.tenantId);
                expect(identity.clientId).toBe(testConfig.clientId);
                expect(identity.getCredential()).toBeDefined();
            }
        );
    });

    describe.skipIf(!hasCredentials())('subscriptions', () => {
        let identity: Identity;

        beforeAll(async () => {
            identity = await Identity.create({
                tenantId: testConfig.tenantId,
                clientId: testConfig.clientId,
                clientSecret: testConfig.clientSecret,
            });
        });

        it('should retrieve subscriptions', async () => {
            const subscriptions = await identity.getSubscriptions();
            expect(Array.isArray(subscriptions)).toBe(true);
        });

        it.skipIf(!testConfig.subscriptionId)(
            'should get specific subscription',
            async () => {
                const subscription = await identity.getSubscription(testConfig.subscriptionId!);
                expect(subscription.subscriptionId).toBe(testConfig.subscriptionId);
            }
        );

        it('should throw error for non-existent subscription', async () => {
            await expect(
                identity.getSubscription('non-existent-subscription-id')
            ).rejects.toThrow();
        });
    });
});

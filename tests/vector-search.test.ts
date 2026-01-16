import { describe, it, expect } from 'vitest';
import { getStdVectorSearch, getExhaustiveKnnVectorSearch } from '../src/search/vector-search';

describe('VectorSearch', () => {
    describe('getStdVectorSearch', () => {
        it('should return HNSW vector search with default options', () => {
            const result = getStdVectorSearch();

            expect(result.algorithms).toHaveLength(1);
            expect(result.algorithms![0].name).toBe('default-algorithm');
            expect(result.algorithms![0].kind).toBe('hnsw');

            expect(result.profiles).toHaveLength(1);
            expect(result.profiles![0].name).toBe('default-profile');
            expect(result.profiles![0].algorithmConfigurationName).toBe('default-algorithm');
        });

        it('should use default HNSW parameters', () => {
            const result = getStdVectorSearch();
            const algorithm = result.algorithms![0] as {
                parameters: { m: number; efConstruction: number; efSearch: number; metric: string };
            };

            expect(algorithm.parameters.m).toBe(4);
            expect(algorithm.parameters.efConstruction).toBe(400);
            expect(algorithm.parameters.efSearch).toBe(500);
            expect(algorithm.parameters.metric).toBe('cosine');
        });

        it('should allow custom algorithm and profile names', () => {
            const result = getStdVectorSearch({
                algorithmName: 'my-algorithm',
                profileName: 'my-profile',
            });

            expect(result.algorithms![0].name).toBe('my-algorithm');
            expect(result.profiles![0].name).toBe('my-profile');
            expect(result.profiles![0].algorithmConfigurationName).toBe('my-algorithm');
        });

        it('should allow custom HNSW parameters', () => {
            const result = getStdVectorSearch({
                connectionsPerNode: 16,
                neighborsListSize: 200,
                searchListSize: 300,
            });

            const algorithm = result.algorithms![0] as {
                parameters: { m: number; efConstruction: number; efSearch: number };
            };

            expect(algorithm.parameters.m).toBe(16);
            expect(algorithm.parameters.efConstruction).toBe(200);
            expect(algorithm.parameters.efSearch).toBe(300);
        });

        it('should allow different metrics', () => {
            const metrics: Array<'cosine' | 'euclidean' | 'dotProduct'> = [
                'cosine',
                'euclidean',
                'dotProduct',
            ];

            for (const metric of metrics) {
                const result = getStdVectorSearch({ metric });
                const algorithm = result.algorithms![0] as {
                    parameters: { metric: string };
                };
                expect(algorithm.parameters.metric).toBe(metric);
            }
        });
    });

    describe('getExhaustiveKnnVectorSearch', () => {
        it('should return exhaustive KNN vector search with default options', () => {
            const result = getExhaustiveKnnVectorSearch();

            expect(result.algorithms).toHaveLength(1);
            expect(result.algorithms![0].name).toBe('default-algorithm');
            expect(result.algorithms![0].kind).toBe('exhaustiveKnn');

            expect(result.profiles).toHaveLength(1);
            expect(result.profiles![0].name).toBe('default-profile');
            expect(result.profiles![0].algorithmConfigurationName).toBe('default-algorithm');
        });

        it('should use default cosine metric', () => {
            const result = getExhaustiveKnnVectorSearch();
            const algorithm = result.algorithms![0] as {
                parameters: { metric: string };
            };

            expect(algorithm.parameters.metric).toBe('cosine');
        });

        it('should allow custom algorithm and profile names', () => {
            const result = getExhaustiveKnnVectorSearch({
                algorithmName: 'custom-knn',
                profileName: 'custom-knn-profile',
            });

            expect(result.algorithms![0].name).toBe('custom-knn');
            expect(result.profiles![0].name).toBe('custom-knn-profile');
        });

        it('should allow different metrics', () => {
            const result = getExhaustiveKnnVectorSearch({ metric: 'euclidean' });
            const algorithm = result.algorithms![0] as {
                parameters: { metric: string };
            };

            expect(algorithm.parameters.metric).toBe('euclidean');
        });
    });
});

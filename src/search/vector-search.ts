import {
    VectorSearch,
    HnswAlgorithmConfiguration,
    ExhaustiveKnnAlgorithmConfiguration,
    VectorSearchProfile,
    ExhaustiveKnnParameters,
} from '@azure/search-documents';

export interface VectorSearchOptions {
    algorithmName?: string;
    profileName?: string;
    connectionsPerNode?: number;
    neighborsListSize?: number;
    searchListSize?: number;
    metric?: 'cosine' | 'euclidean' | 'dotProduct';
}

/**
 * Get a standard HNSW vector search configuration.
 *
 * @param options - Configuration options
 * @returns VectorSearch configuration
 */
export function getStdVectorSearch(options: VectorSearchOptions = {}): VectorSearch {
    const {
        algorithmName = 'default-algorithm',
        profileName = 'default-profile',
        connectionsPerNode = 4,
        neighborsListSize = 400,
        searchListSize = 500,
        metric = 'cosine',
    } = options;

    return {
        algorithms: [
            {
                name: algorithmName,
                kind: 'hnsw',
                parameters: {
                    m: connectionsPerNode,
                    efConstruction: neighborsListSize,
                    efSearch: searchListSize,
                    metric,
                },
            } as HnswAlgorithmConfiguration,
        ],
        profiles: [
            {
                name: profileName,
                algorithmConfigurationName: algorithmName,
            } as VectorSearchProfile,
        ],
    };
}

/**
 * Get an exhaustive KNN vector search configuration.
 *
 * @param options - Configuration options
 * @returns VectorSearch configuration
 */
export function getExhaustiveKnnVectorSearch(options: VectorSearchOptions = {}): VectorSearch {
    const {
        algorithmName = 'default-algorithm',
        profileName = 'default-profile',
        metric = 'cosine',
    } = options;

    return {
        algorithms: [
            {
                name: algorithmName,
                kind: 'exhaustiveKnn',
                parameters: {
                    metric,
                } as ExhaustiveKnnParameters,
            } as ExhaustiveKnnAlgorithmConfiguration,
        ],
        profiles: [
            {
                name: profileName,
                algorithmConfigurationName: algorithmName,
            } as VectorSearchProfile,
        ],
    };
}

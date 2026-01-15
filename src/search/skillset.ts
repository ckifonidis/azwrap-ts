import { SearchIndexerSkillset, SearchIndexerSkill } from '@azure/search-documents';
import type { SearchIndexerManager } from './search-indexer-manager';

/**
 * Represents a skillset in Azure AI Search.
 */
export class Skillset {
    private manager: SearchIndexerManager;
    private skillset: SearchIndexerSkillset;

    constructor(manager: SearchIndexerManager, skillset: SearchIndexerSkillset) {
        this.manager = manager;
        this.skillset = skillset;
    }

    /**
     * Get the skillset name.
     */
    getName(): string {
        return this.skillset.name;
    }

    /**
     * Get the skillset description.
     */
    getDescription(): string | undefined {
        return this.skillset.description;
    }

    /**
     * Get the skills in this skillset.
     */
    getSkills(): SearchIndexerSkill[] {
        return this.skillset.skills;
    }

    /**
     * Get the underlying skillset object.
     */
    getSkillset(): SearchIndexerSkillset {
        return this.skillset;
    }

    /**
     * Update the skillset.
     *
     * @param updates - Partial updates to apply
     * @returns Updated Skillset
     */
    async update(updates: Partial<Omit<SearchIndexerSkillset, 'name'>>): Promise<Skillset> {
        const client = await this.manager.getClient();

        const updatedSkillset: SearchIndexerSkillset = {
            ...this.skillset,
            ...updates,
        };

        const result = await client.createOrUpdateSkillset(updatedSkillset);
        this.skillset = result;
        return this;
    }

    /**
     * Delete this skillset.
     */
    async delete(): Promise<void> {
        await this.manager.deleteSkillset(this.getName());
    }
}

/**
 * TreeExecutor - Class-based tree command orchestration
 *
 * Refactored from tree.ts to use instance state instead of global state
 * and dependency injection for commands.
 */

import type { TreeExecutionConfig } from './types/config.js';
import { SimpleMutex } from './util/mutex.js';

/**
 * Published version tracking
 */
export interface PublishedVersion {
    packageName: string;
    version: string;
    publishTime: Date;
}

/**
 * Tree execution context for persistence
 */
export interface TreeExecutionContext {
    command: string;
    originalConfig: TreeExecutionConfig;
    publishedVersions: PublishedVersion[];
    completedPackages: string[];
    buildOrder: string[];
    startTime: Date;
    lastUpdateTime: Date;
}

/**
 * Command executor interface for dependency injection
 */
export interface CommandExecutor {
    execute(config: TreeExecutionConfig, mode?: string): Promise<any>;
}

/**
 * Command registry for built-in commands
 */
export interface CommandRegistry {
    updates?: CommandExecutor;
    commit?: CommandExecutor;
    link?: CommandExecutor;
    unlink?: CommandExecutor;
}

/**
 * TreeExecutor options
 */
export interface TreeExecutorOptions {
    /**
     * Command registry for dependency injection
     */
    commands?: CommandRegistry;

    /**
     * Custom logger (optional)
     */
    logger?: any;
}

/**
 * TreeExecutor - Orchestrates tree command execution
 *
 * This class encapsulates all state that was previously global,
 * making it testable and allowing multiple concurrent executions.
 */
export class TreeExecutor {
    // Instance state (previously global)
    private publishedVersions: PublishedVersion[] = [];
    private executionContext: TreeExecutionContext | null = null;
    private stateMutex: SimpleMutex;

    // Dependency injection
    private commands: CommandRegistry;
    private logger: any;

    constructor(options: TreeExecutorOptions = {}) {
        this.commands = options.commands || {};
        this.logger = options.logger;
        this.stateMutex = new SimpleMutex();
    }

    /**
     * Get published versions (thread-safe)
     */
    async getPublishedVersions(): Promise<PublishedVersion[]> {
        return await this.stateMutex.runExclusive(async () => {
            return [...this.publishedVersions];
        });
    }

    /**
     * Add published version (thread-safe)
     */
    async addPublishedVersion(version: PublishedVersion): Promise<void> {
        await this.stateMutex.runExclusive(async () => {
            this.publishedVersions.push(version);
        });
    }

    /**
     * Get execution context (thread-safe)
     * Returns a deep copy to prevent external modifications
     */
    async getExecutionContext(): Promise<TreeExecutionContext | null> {
        return await this.stateMutex.runExclusive(async () => {
            if (!this.executionContext) return null;

            // Return deep copy to prevent external modification
            return {
                ...this.executionContext,
                publishedVersions: [...this.executionContext.publishedVersions],
                completedPackages: [...this.executionContext.completedPackages],
                buildOrder: [...this.executionContext.buildOrder]
            };
        });
    }

    /**
     * Set execution context (thread-safe)
     */
    async setExecutionContext(context: TreeExecutionContext | null): Promise<void> {
        await this.stateMutex.runExclusive(async () => {
            this.executionContext = context;
        });
    }

    /**
     * Reset state (for testing)
     */
    async reset(): Promise<void> {
        await this.stateMutex.runExclusive(async () => {
            this.publishedVersions = [];
            this.executionContext = null;
        });
    }

    /**
     * Execute tree command
     *
     * This will be the main entry point, delegating to the execute function
     * from tree.ts but with instance state instead of global state.
     *
     * @param config - Tree execution configuration
     * @returns Result message
     */
    async execute(config: TreeExecutionConfig): Promise<string> {
        // Import the execute function from tree.ts
        // We'll need to refactor tree.ts to accept TreeExecutor instance
        const { execute } = await import('./tree.js');

        // For now, this is a placeholder
        // We'll refactor tree.ts to accept TreeExecutor in the next step
        return await execute(config);
    }

    /**
     * Get command executor
     */
    getCommand(name: keyof CommandRegistry): CommandExecutor | undefined {
        return this.commands[name];
    }

    /**
     * Set command executor (for testing/injection)
     */
    setCommand(name: keyof CommandRegistry, executor: CommandExecutor): void {
        this.commands[name] = executor;
    }
}

/**
 * Create a default TreeExecutor instance
 */
export function createTreeExecutor(options?: TreeExecutorOptions): TreeExecutor {
    return new TreeExecutor(options);
}


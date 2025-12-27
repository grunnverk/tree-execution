/**
 * Stub implementations for built-in commands
 * These are placeholders - kodrdriv will inject real implementations
 */

import type { TreeExecutionConfig } from '../types/config.js';
import type { CommandExecutor } from '../TreeExecutor.js';
import { getLogger } from './logger.js';

const logger = getLogger();

/**
 * Updates command stub
 */
export const Updates: CommandExecutor = {
    async execute(config: TreeExecutionConfig): Promise<void> {
        logger.warn('Updates command not implemented in tree-execution - this should be injected by kodrdriv');
        // Stub - no-op
        // In kodrdriv this updates inter-project dependencies
    }
};

/**
 * Commit command stub
 */
export const Commit: CommandExecutor = {
    async execute(config: TreeExecutionConfig): Promise<void> {
        logger.warn('Commit command not implemented in tree-execution - this should be injected by kodrdriv');
        // Stub - no-op
        // In kodrdriv this creates commits
    }
};

/**
 * Link command stub
 */
export const Link: CommandExecutor = {
    async execute(config: TreeExecutionConfig, mode?: string): Promise<any> {
        logger.warn('Link command not implemented in tree-execution - this should be injected by kodrdriv');
        // Stub - return empty result
        // In kodrdriv this links packages
        return { success: true, linked: [], alreadyLinked: [] };
    }
};

/**
 * Unlink command stub
 */
export const Unlink: CommandExecutor = {
    async execute(config: TreeExecutionConfig, mode?: string): Promise<any> {
        logger.warn('Unlink command not implemented in tree-execution - this should be injected by kodrdriv');
        // Stub - return empty result
        // In kodrdriv this unlinks packages
        return { success: true, unlinked: [], notLinked: [] };
    }
};


/**
 * Utility functions for tree.ts
 * These are stubs/inlines of kodrdriv utilities
 */

import type { TreeExecutionConfig } from '../types/config.js';

/**
 * Get output path - can accept config or directory string
 */
export function getOutputPath(configOrDir: TreeExecutionConfig | string, filename?: string): string {
    const baseDir = typeof configOrDir === 'string' 
        ? configOrDir 
        : (configOrDir.outputDirectory || 'output/kodrdriv');
    
    return filename ? `${baseDir}/${filename}` : baseDir;
}

/**
 * Simple performance timer
 */
export class PerformanceTimer {
    private startTime: number;
    private label: string;
    
    constructor(label: string) {
        this.label = label;
        this.startTime = Date.now();
    }
    
    end(): number {
        const duration = Date.now() - this.startTime;
        return duration;
    }
    
    getDuration(): number {
        return Date.now() - this.startTime;
    }
}

/**
 * Check if in git repository
 */
export async function isInGitRepository(dir: string): Promise<boolean> {
    // Simple check - could be enhanced
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
        await fs.access(path.join(dir, '.git'));
        return true;
    } catch {
        return false;
    }
}

/**
 * Run git command with lock (simplified version)
 */
export async function runGitWithLock<T>(
    fn: () => Promise<T>,
    _lockKey?: string
): Promise<T> {
    // Simplified - just run the function
    // In kodrdriv this uses a mutex to prevent concurrent git operations
    return await fn();
}

/**
 * Optimize precommit command (stub)
 */
export async function optimizePrecommitCommand(
    _packagePath: string,
    command: string
): Promise<{
    optimizedCommand: string;
    skipped: { clean?: boolean; test?: boolean };
    reasons: { clean?: string; test?: string };
}> {
    // Stub - return command as-is with no optimizations
    // In kodrdriv this optimizes test commands based on previous runs
    return {
        optimizedCommand: command,
        skipped: {},
        reasons: {}
    };
}

/**
 * Record test run (stub)
 */
export async function recordTestRun(
    _packagePath: string,
    _success?: boolean,
    _duration?: number
): Promise<void> {
    // Stub - no-op
    // In kodrdriv this records test results for optimization
}


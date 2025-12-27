/**
 * Mock helpers for testing
 */

import type { DependencyGraph, PackageInfo } from '@eldrforge/tree-core';
import type { ParallelExecutionCheckpoint, TreeExecutionConfig, ExecutionState } from '../../src/index.js';

/**
 * Create a mock dependency graph from a simple structure
 * 
 * @example
 * createMockGraph({
 *   'a': [],
 *   'b': ['a'],
 *   'c': ['a', 'b']
 * })
 */
export function createMockGraph(structure: Record<string, string[]>): DependencyGraph {
    const packages = new Map<string, PackageInfo>();
    const edges = new Map<string, Set<string>>();
    const reverseEdges = new Map<string, Set<string>>();

    // Create packages and edges
    for (const [name, deps] of Object.entries(structure)) {
        packages.set(name, {
            name,
            version: '1.0.0',
            path: `/test/${name}`,
            dependencies: deps
        });
        edges.set(name, new Set(deps));
    }

    // Build reverse edges
    for (const [pkg, _] of packages) {
        reverseEdges.set(pkg, new Set());
    }

    for (const [pkg, deps] of edges) {
        for (const dep of deps) {
            if (!reverseEdges.has(dep)) {
                reverseEdges.set(dep, new Set());
            }
            reverseEdges.get(dep)!.add(pkg);
        }
    }

    return { packages, edges, reverseEdges };
}

/**
 * Create a mock checkpoint with sensible defaults
 */
export function createMockCheckpoint(overrides: Partial<ParallelExecutionCheckpoint> = {}): ParallelExecutionCheckpoint {
    const now = new Date().toISOString();
    
    return {
        version: '1.0',
        executionId: 'test-exec-id',
        createdAt: now,
        lastUpdated: now,
        command: 'test command',
        originalConfig: {} as TreeExecutionConfig,
        dependencyGraph: {
            packages: [],
            edges: [],
            workspaceRoot: '/test'
        },
        buildOrder: [],
        executionMode: 'parallel',
        maxConcurrency: 4,
        state: {
            pending: [],
            ready: [],
            running: [],
            completed: [],
            failed: [],
            skipped: [],
            skippedNoChanges: []
        },
        publishedVersions: [],
        retryAttempts: {},
        lastRetryTime: {},
        packageStartTimes: {},
        packageEndTimes: {},
        packageDurations: {},
        totalStartTime: now,
        recoveryHints: [],
        canRecover: true,
        ...overrides
    };
}

/**
 * Create a mock execution state
 */
export function createMockState(overrides: Partial<ExecutionState> = {}): ExecutionState {
    return {
        pending: [],
        ready: [],
        running: [],
        completed: [],
        failed: [],
        skipped: [],
        skippedNoChanges: [],
        ...overrides
    };
}

/**
 * Mock graph patterns for common test scenarios
 */
export const MockGraphPatterns = {
    /**
     * Simple linear dependency: A -> B -> C
     */
    linear: () => createMockGraph({
        'c': [],
        'b': ['c'],
        'a': ['b']
    }),

    /**
     * Diamond dependency: A -> B,C -> D
     */
    diamond: () => createMockGraph({
        'd': [],
        'b': ['d'],
        'c': ['d'],
        'a': ['b', 'c']
    }),

    /**
     * Independent packages
     */
    independent: () => createMockGraph({
        'a': [],
        'b': [],
        'c': []
    }),

    /**
     * Complex multi-level
     */
    complex: () => createMockGraph({
        'shared': [],
        'utils': ['shared'],
        'core': ['shared', 'utils'],
        'api': ['core'],
        'cli': ['core', 'api']
    })
};


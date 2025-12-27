import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyChecker } from '../../src/execution/DependencyChecker.js';
import type { DependencyGraph, ExecutionState } from '../../src/index.js';

describe('DependencyChecker', () => {
    let checker: DependencyChecker;
    let graph: DependencyGraph;

    beforeEach(() => {
        // Create a simple dependency graph
        // A -> B -> C
        // D (no dependencies)
        graph = {
            packages: new Map([
                ['A', { name: 'A', version: '1.0.0', path: '/A', dependencies: ['B'] }],
                ['B', { name: 'B', version: '1.0.0', path: '/B', dependencies: ['C'] }],
                ['C', { name: 'C', version: '1.0.0', path: '/C', dependencies: [] }],
                ['D', { name: 'D', version: '1.0.0', path: '/D', dependencies: [] }]
            ]),
            edges: new Map([
                ['A', new Set(['B'])],
                ['B', new Set(['C'])],
                ['C', new Set([])],
                ['D', new Set([])]
            ]),
            reverseEdges: new Map([
                ['A', new Set([])],
                ['B', new Set(['A'])],
                ['C', new Set(['B'])],
                ['D', new Set([])]
            ])
        };

        checker = new DependencyChecker(graph);
    });

    describe('isReady', () => {
        it('should return true for package with no dependencies', () => {
            const state: ExecutionState = {
                pending: ['C', 'D'],
                ready: [],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            expect(checker.isReady('C', state)).toBe(true);
            expect(checker.isReady('D', state)).toBe(true);
        });

        it('should return false if dependencies not completed', () => {
            const state: ExecutionState = {
                pending: ['A', 'B'],
                ready: [],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            expect(checker.isReady('A', state)).toBe(false);
        });

        it('should return true if all dependencies completed', () => {
            const state: ExecutionState = {
                pending: ['A'],
                ready: [],
                running: [],
                completed: ['B', 'C'],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            expect(checker.isReady('A', state)).toBe(true);
        });

        it('should return false if any dependency failed', () => {
            const state: ExecutionState = {
                pending: ['B'],
                ready: [],
                running: [],
                completed: [],
                failed: [{ name: 'C', error: 'Test error', time: new Date(), retryable: false }],
                skipped: [],
                skippedNoChanges: []
            };

            // B depends on C, and C failed, so B should not be ready
            expect(checker.isReady('B', state)).toBe(false);
        });
    });

    describe('getDependentCount', () => {
        it('should return count of dependents', () => {
            // B has A depending on it
            expect(checker.getDependentCount('B')).toBe(1);
        });

        it('should return 0 for package with no dependents', () => {
            expect(checker.getDependentCount('A')).toBe(0);
        });

        it('should return 0 for unknown package', () => {
            expect(checker.getDependentCount('Unknown')).toBe(0);
        });
    });

    describe('getDepth', () => {
        it('should return depth for package', () => {
            // C has no dependencies, so depth 0
            expect(checker.getDepth('C')).toBeGreaterThanOrEqual(0);
        });

        it('should return higher depth for dependent packages', () => {
            const depthA = checker.getDepth('A');
            const depthC = checker.getDepth('C');
            
            // A depends on B which depends on C, so A should have higher depth
            expect(depthA).toBeGreaterThan(depthC);
        });
    });

    describe('complex dependency scenarios', () => {
        it('should handle diamond dependencies', () => {
            // A -> B -> D
            // A -> C -> D
            const complexGraph: DependencyGraph = {
                packages: new Map([
                    ['A', { name: 'A', version: '1.0.0', path: '/A', dependencies: ['B', 'C'] }],
                    ['B', { name: 'B', version: '1.0.0', path: '/B', dependencies: ['D'] }],
                    ['C', { name: 'C', version: '1.0.0', path: '/C', dependencies: ['D'] }],
                    ['D', { name: 'D', version: '1.0.0', path: '/D', dependencies: [] }]
                ]),
                edges: new Map([
                    ['A', new Set(['B', 'C'])],
                    ['B', new Set(['D'])],
                    ['C', new Set(['D'])],
                    ['D', new Set([])]
                ]),
                reverseEdges: new Map([
                    ['A', new Set([])],
                    ['B', new Set(['A'])],
                    ['C', new Set(['A'])],
                    ['D', new Set(['B', 'C'])]
                ])
            };

            const complexChecker = new DependencyChecker(complexGraph);

            const state: ExecutionState = {
                pending: ['A'],
                ready: [],
                running: [],
                completed: ['B', 'C', 'D'],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            expect(complexChecker.isReady('A', state)).toBe(true);
        });

        it('should handle circular dependencies gracefully', () => {
            // Create a circular dependency (shouldn't happen in real graphs, but test robustness)
            const circularGraph: DependencyGraph = {
                packages: new Map([
                    ['A', { name: 'A', version: '1.0.0', path: '/A', dependencies: ['B'] }],
                    ['B', { name: 'B', version: '1.0.0', path: '/B', dependencies: ['A'] }]
                ]),
                edges: new Map([
                    ['A', new Set(['B'])],
                    ['B', new Set(['A'])]
                ]),
                reverseEdges: new Map([
                    ['A', new Set(['B'])],
                    ['B', new Set(['A'])]
                ])
            };

            const circularChecker = new DependencyChecker(circularGraph);

            const state: ExecutionState = {
                pending: ['A', 'B'],
                ready: [],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            // Neither should be ready since they depend on each other
            expect(circularChecker.isReady('A', state)).toBe(false);
            expect(circularChecker.isReady('B', state)).toBe(false);
        });
    });
});


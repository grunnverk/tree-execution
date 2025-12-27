import { describe, it, expect, beforeEach } from 'vitest';
import { Scheduler } from '../../src/execution/Scheduler.js';
import { DependencyChecker } from '../../src/execution/DependencyChecker.js';
import type { DependencyGraph, ExecutionState } from '../../src/index.js';

describe('Scheduler', () => {
    let scheduler: Scheduler;
    let checker: DependencyChecker;
    let graph: DependencyGraph;

    beforeEach(() => {
        // Create dependency graph: A -> B -> C, D (independent)
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
        scheduler = new Scheduler(graph, checker);
    });

    describe('getNext', () => {
        it('should return empty when no slots available', () => {
            const state: ExecutionState = {
                pending: [],
                ready: ['C', 'D'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = scheduler.getNext(0, state);
            expect(next).toEqual([]);
        });

        it('should return empty when no ready packages', () => {
            const state: ExecutionState = {
                pending: ['A', 'B', 'C'],
                ready: [],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = scheduler.getNext(5, state);
            expect(next).toEqual([]);
        });

        it('should return ready packages', () => {
            const state: ExecutionState = {
                pending: [],
                ready: ['C', 'D'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = scheduler.getNext(2, state);
            expect(next).toHaveLength(2);
            expect(next).toContain('C');
            expect(next).toContain('D');
        });

        it('should respect available slots', () => {
            const state: ExecutionState = {
                pending: [],
                ready: ['C', 'D', 'A'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = scheduler.getNext(2, state);
            expect(next).toHaveLength(2);
        });

        it('should prioritize by dependent count', () => {
            const state: ExecutionState = {
                pending: [],
                ready: ['C', 'D'], // C has dependents (B->C), D has none
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = scheduler.getNext(1, state);

            // C should be prioritized because it has dependents
            expect(next).toHaveLength(1);
            expect(next[0]).toBe('C');
        });

        it('should handle all packages ready', () => {
            const state: ExecutionState = {
                pending: [],
                ready: ['A', 'B', 'C', 'D'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = scheduler.getNext(10, state);
            expect(next).toHaveLength(4);
        });
    });

    describe('priority calculation', () => {
        it('should prioritize packages that unblock more dependents', () => {
            // C unlocks B, which unlocks A
            // D unlocks nothing
            const state: ExecutionState = {
                pending: [],
                ready: ['C', 'D'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = scheduler.getNext(2, state);

            // C should come before D
            expect(next[0]).toBe('C');
            expect(next[1]).toBe('D');
        });

        it('should handle packages with same priority', () => {
            const sameGraph: DependencyGraph = {
                packages: new Map([
                    ['A', { name: 'A', version: '1.0.0', path: '/A', dependencies: [] }],
                    ['B', { name: 'B', version: '1.0.0', path: '/B', dependencies: [] }]
                ]),
                edges: new Map([
                    ['A', new Set([])],
                    ['B', new Set([])]
                ]),
                reverseEdges: new Map([
                    ['A', new Set([])],
                    ['B', new Set([])]
                ])
            };

            const sameChecker = new DependencyChecker(sameGraph);
            const sameScheduler = new Scheduler(sameGraph, sameChecker);

            const state: ExecutionState = {
                pending: [],
                ready: ['A', 'B'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = sameScheduler.getNext(2, state);
            expect(next).toHaveLength(2);
        });
    });

    describe('edge cases', () => {
        it('should handle negative slots', () => {
            const state: ExecutionState = {
                pending: [],
                ready: ['C', 'D'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = scheduler.getNext(-1, state);
            expect(next).toEqual([]);
        });

        it('should handle empty ready list', () => {
            const state: ExecutionState = {
                pending: ['A', 'B', 'C', 'D'],
                ready: [],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = scheduler.getNext(10, state);
            expect(next).toEqual([]);
        });

        it('should handle single package', () => {
            const state: ExecutionState = {
                pending: [],
                ready: ['C'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = scheduler.getNext(1, state);
            expect(next).toEqual(['C']);
        });
    });

    describe('complex scenarios', () => {
        it('should schedule in optimal order for diamond dependencies', () => {
            // A -> B -> D
            // A -> C -> D
            const diamondGraph: DependencyGraph = {
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

            const diamondChecker = new DependencyChecker(diamondGraph);
            const diamondScheduler = new Scheduler(diamondGraph, diamondChecker);

            const state: ExecutionState = {
                pending: [],
                ready: ['D'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const next = diamondScheduler.getNext(1, state);

            // D should be scheduled first (unlocks both B and C)
            expect(next).toEqual(['D']);
        });
    });
});


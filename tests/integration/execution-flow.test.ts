import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyChecker } from '../../src/execution/DependencyChecker.js';
import { Scheduler } from '../../src/execution/Scheduler.js';
import { ResourceMonitor } from '../../src/execution/ResourceMonitor.js';
import type { DependencyGraph, ExecutionState } from '../../src/index.js';

describe('Execution Flow Integration', () => {
    let graph: DependencyGraph;
    let checker: DependencyChecker;
    let scheduler: Scheduler;
    let monitor: ResourceMonitor;

    beforeEach(() => {
        // Create a realistic dependency graph
        // frontend -> shared
        // backend -> shared
        // cli -> frontend, backend
        graph = {
            packages: new Map([
                ['shared', { name: 'shared', version: '1.0.0', path: '/shared', dependencies: [] }],
                ['frontend', { name: 'frontend', version: '1.0.0', path: '/frontend', dependencies: ['shared'] }],
                ['backend', { name: 'backend', version: '1.0.0', path: '/backend', dependencies: ['shared'] }],
                ['cli', { name: 'cli', version: '1.0.0', path: '/cli', dependencies: ['frontend', 'backend'] }]
            ]),
            edges: new Map([
                ['shared', new Set([])],
                ['frontend', new Set(['shared'])],
                ['backend', new Set(['shared'])],
                ['cli', new Set(['frontend', 'backend'])]
            ]),
            reverseEdges: new Map([
                ['shared', new Set(['frontend', 'backend'])],
                ['frontend', new Set(['cli'])],
                ['backend', new Set(['cli'])],
                ['cli', new Set([])]
            ])
        };

        checker = new DependencyChecker(graph);
        scheduler = new Scheduler(graph, checker);
        monitor = new ResourceMonitor(2); // Max 2 concurrent
    });

    describe('simple execution flow', () => {
        it('should execute in correct order', async () => {
            let state: ExecutionState = {
                pending: ['shared', 'frontend', 'backend', 'cli'],
                ready: [],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            const executionOrder: string[] = [];

            // Simulate execution loop
            while (state.pending.length > 0 || state.ready.length > 0 || state.running.length > 0) {
                // Move ready packages to pending
                state.ready = state.pending.filter(pkg => checker.isReady(pkg, state));
                state.pending = state.pending.filter(pkg => !state.ready.includes(pkg));

                // Get next packages to schedule
                const available = monitor.getAvailableSlots();
                const next = scheduler.getNext(available, state);

                if (next.length === 0 && state.running.length === 0) {
                    break; // Nothing to do
                }

                // "Execute" packages
                for (const pkg of next) {
                    if (monitor.allocate()) {
                        executionOrder.push(pkg);
                        state.ready = state.ready.filter(p => p !== pkg);
                        state.running.push({
                            name: pkg,
                            startTime: new Date(),
                            isBuiltInCommand: false
                        });
                    }
                }

                // Simulate completion (immediately for this test)
                for (const running of state.running) {
                    state.completed.push(running.name);
                    monitor.release();
                }
                state.running = [];
            }

            // Verify execution order is valid (dependencies before dependents)
            expect(executionOrder).toContain('shared');
            expect(executionOrder).toContain('frontend');
            expect(executionOrder).toContain('backend');
            expect(executionOrder).toContain('cli');

            // shared must come before frontend and backend
            const sharedIdx = executionOrder.indexOf('shared');
            const frontendIdx = executionOrder.indexOf('frontend');
            const backendIdx = executionOrder.indexOf('backend');
            expect(sharedIdx).toBeLessThan(frontendIdx);
            expect(sharedIdx).toBeLessThan(backendIdx);

            // frontend and backend must come before cli
            const cliIdx = executionOrder.indexOf('cli');
            expect(frontendIdx).toBeLessThan(cliIdx);
            expect(backendIdx).toBeLessThan(cliIdx);
        });

        it('should handle parallel execution correctly', async () => {
            let state: ExecutionState = {
                pending: ['shared', 'frontend', 'backend', 'cli'],
                ready: [],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            // First batch: only shared is ready
            state.ready = state.pending.filter(pkg => checker.isReady(pkg, state));
            expect(state.ready).toEqual(['shared']);

            // Execute shared
            const next1 = scheduler.getNext(monitor.getAvailableSlots(), state);
            expect(next1).toEqual(['shared']);

            // Complete shared
            state.completed.push('shared');
            state.pending = state.pending.filter(p => p !== 'shared');
            state.ready = [];

            // Second batch: frontend and backend are now ready
            state.ready = state.pending.filter(pkg => checker.isReady(pkg, state));
            expect(state.ready).toContain('frontend');
            expect(state.ready).toContain('backend');
            expect(state.ready).toHaveLength(2);

            // Both can execute in parallel
            const next2 = scheduler.getNext(monitor.getAvailableSlots(), state);
            expect(next2).toHaveLength(2);

            // Complete both
            state.completed.push('frontend', 'backend');
            state.pending = state.pending.filter(p => !['frontend', 'backend'].includes(p));
            state.ready = [];

            // Third batch: cli is now ready
            state.ready = state.pending.filter(pkg => checker.isReady(pkg, state));
            expect(state.ready).toEqual(['cli']);
        });
    });

    describe('failure handling', () => {
        it('should skip dependent packages when dependency fails', () => {
            let state: ExecutionState = {
                pending: ['shared', 'frontend', 'backend', 'cli'],
                ready: ['shared'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            // Simulate shared failing
            state.failed.push({
                name: 'shared',
                error: 'Build failed',
                time: new Date(),
                retryable: false
            });
            state.pending = state.pending.filter(p => p !== 'shared');
            state.ready = [];

            // Check which packages are ready
            state.ready = state.pending.filter(pkg => checker.isReady(pkg, state));

            // frontend and backend should NOT be ready (depend on shared)
            expect(state.ready).not.toContain('frontend');
            expect(state.ready).not.toContain('backend');
            expect(state.ready).toHaveLength(0);

            // cli also depends on frontend/backend, so it's not ready either
            expect(checker.isReady('cli', state)).toBe(false);
        });

        it('should continue with independent packages after failure', () => {
            // Add an independent package
            const graphWithIndependent: DependencyGraph = {
                ...graph,
                packages: new Map([
                    ...graph.packages,
                    ['independent', { name: 'independent', version: '1.0.0', path: '/independent', dependencies: [] }]
                ]),
                edges: new Map([
                    ...graph.edges,
                    ['independent', new Set([])]
                ]),
                reverseEdges: new Map([
                    ...graph.reverseEdges,
                    ['independent', new Set([])]
                ])
            };

            const indepChecker = new DependencyChecker(graphWithIndependent);

            let state: ExecutionState = {
                pending: ['shared', 'independent'],
                ready: [],
                running: [],
                completed: [],
                failed: [{
                    name: 'shared',
                    error: 'Failed',
                    time: new Date(),
                    retryable: false
                }],
                skipped: [],
                skippedNoChanges: []
            };

            // independent should still be ready
            expect(indepChecker.isReady('independent', state)).toBe(true);
        });
    });

    describe('resource coordination', () => {
        it('should coordinate scheduler with resource monitor', () => {
            const state: ExecutionState = {
                pending: [],
                ready: ['shared', 'frontend', 'backend', 'cli'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            // Monitor has 2 slots
            expect(monitor.getAvailableSlots()).toBe(2);

            // Scheduler should respect available slots
            const next = scheduler.getNext(monitor.getAvailableSlots(), state);
            expect(next.length).toBeLessThanOrEqual(2);

            // Allocate resources
            for (const pkg of next) {
                expect(monitor.allocate()).toBe(true);
            }

            expect(monitor.getAvailableSlots()).toBe(2 - next.length);
        });

        it('should handle full resource utilization', () => {
            // Fill all slots
            monitor.allocate();
            monitor.allocate();
            expect(monitor.isFullyUtilized()).toBe(true);
            expect(monitor.getAvailableSlots()).toBe(0);

            const state: ExecutionState = {
                pending: [],
                ready: ['shared', 'frontend'],
                running: [],
                completed: [],
                failed: [],
                skipped: [],
                skippedNoChanges: []
            };

            // Should return empty because no slots
            const next = scheduler.getNext(monitor.getAvailableSlots(), state);
            expect(next).toEqual([]);
        });
    });
});


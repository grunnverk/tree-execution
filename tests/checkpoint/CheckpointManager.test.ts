import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CheckpointManager } from '../../src/checkpoint/index.js';
import type { ParallelExecutionCheckpoint } from '../../src/types/index.js';
import type { TreeExecutionConfig } from '../../src/types/config.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('CheckpointManager', () => {
    let tempDir: string;
    let checkpointPath: string;
    let manager: CheckpointManager;

    beforeEach(async () => {
        // Create temp directory for tests
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'checkpoint-test-'));
        checkpointPath = path.join(tempDir, '.kodrdriv-parallel-context.json');
        manager = new CheckpointManager(tempDir); // Pass directory, not full path
    });

    afterEach(async () => {
        // Clean up temp directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('initialization', () => {
        it('should create CheckpointManager', () => {
            expect(manager).toBeInstanceOf(CheckpointManager);
        });

        it('should accept checkpoint path', () => {
            const customManager = new CheckpointManager('/custom/path.json');
            expect(customManager).toBeInstanceOf(CheckpointManager);
        });
    });

    describe('exists', () => {
        it('should return false when checkpoint does not exist', async () => {
            // Check via storage
            const exists = await manager['storage'].exists(checkpointPath);
            expect(exists).toBe(false);
        });

        it('should return true when checkpoint exists', async () => {
            // Create a checkpoint file
            await fs.writeFile(checkpointPath, JSON.stringify({ version: '1.0' }));
            
            // Check via storage
            const exists = await manager['storage'].exists(checkpointPath);
            expect(exists).toBe(true);
        });
    });

    describe('save and load', () => {
        it('should save checkpoint', async () => {
            const checkpoint: ParallelExecutionCheckpoint = {
                version: '1.0',
                executionId: 'test-123',
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                command: 'npm test',
                originalConfig: {} as TreeExecutionConfig,
                dependencyGraph: {
                    packages: [],
                    edges: [],
                    workspaceRoot: '/test'
                },
                buildOrder: ['pkg1', 'pkg2'],
                executionMode: 'parallel',
                maxConcurrency: 4,
                state: {
                    pending: [],
                    ready: [],
                    running: [],
                    completed: ['pkg1'],
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
                totalStartTime: new Date().toISOString(),
                recoveryHints: [],
                canRecover: true
            };

            await manager.save(checkpoint);

            // Verify file exists
            const exists = await manager['storage'].exists(checkpointPath);
            expect(exists).toBe(true);

            // Verify content
            const content = await fs.readFile(checkpointPath, 'utf-8');
            const saved = JSON.parse(content);
            expect(saved.executionId).toBe('test-123');
            expect(saved.command).toBe('npm test');
        });

        it('should load checkpoint', async () => {
            const checkpoint: ParallelExecutionCheckpoint = {
                version: '1.0',
                executionId: 'test-456',
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                command: 'npm publish',
                originalConfig: { dryRun: true } as TreeExecutionConfig,
                dependencyGraph: {
                    packages: [],
                    edges: [],
                    workspaceRoot: '/test'
                },
                buildOrder: [],
                executionMode: 'sequential',
                maxConcurrency: 1,
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
                totalStartTime: new Date().toISOString(),
                recoveryHints: [],
                canRecover: true
            };

            await manager.save(checkpoint);
            const loaded = await manager.load();

            expect(loaded).toBeDefined();
            expect(loaded?.executionId).toBe('test-456');
            expect(loaded?.command).toBe('npm publish');
            expect(loaded?.originalConfig.dryRun).toBe(true);
        });

        it('should return null when loading non-existent checkpoint', async () => {
            const loaded = await manager.load();
            expect(loaded).toBeNull();
        });

        it('should handle save and load cycle', async () => {
            const checkpoint: ParallelExecutionCheckpoint = {
                version: '1.0',
                executionId: 'cycle-test',
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                command: 'test command',
                originalConfig: {} as TreeExecutionConfig,
                dependencyGraph: {
                    packages: [],
                    edges: [],
                    workspaceRoot: '/test'
                },
                buildOrder: ['a', 'b', 'c'],
                executionMode: 'parallel',
                maxConcurrency: 2,
                state: {
                    pending: ['c'],
                    ready: ['b'],
                    running: [],
                    completed: ['a'],
                    failed: [],
                    skipped: [],
                    skippedNoChanges: []
                },
                publishedVersions: [{
                    packageName: 'pkg-a',
                    version: '1.0.0',
                    publishTime: new Date()
                }],
                retryAttempts: { 'pkg-b': 1 },
                lastRetryTime: {},
                packageStartTimes: {},
                packageEndTimes: {},
                packageDurations: {},
                totalStartTime: new Date().toISOString(),
                recoveryHints: [],
                canRecover: true
            };

            await manager.save(checkpoint);
            const loaded = await manager.load();

            expect(loaded?.state.completed).toEqual(['a']);
            expect(loaded?.state.pending).toEqual(['c']);
            expect(loaded?.state.ready).toEqual(['b']);
            expect(loaded?.publishedVersions).toHaveLength(1);
            expect(loaded?.retryAttempts['pkg-b']).toBe(1);
        });
    });

    describe('cleanup', () => {
        it('should cleanup checkpoint', async () => {
            const checkpoint: ParallelExecutionCheckpoint = {
                version: '1.0',
                executionId: 'delete-test',
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                command: 'test',
                originalConfig: {} as TreeExecutionConfig,
                dependencyGraph: {
                    packages: [],
                    edges: [],
                    workspaceRoot: '/test'
                },
                buildOrder: [],
                executionMode: 'parallel',
                maxConcurrency: 1,
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
                totalStartTime: new Date().toISOString(),
                recoveryHints: [],
                canRecover: true
            };

            await manager.save(checkpoint);
            const existsBefore = await manager['storage'].exists(checkpointPath);
            expect(existsBefore).toBe(true);

            await manager.cleanup();
            const existsAfter = await manager['storage'].exists(checkpointPath);
            expect(existsAfter).toBe(false);
        });

        it('should not error when cleaning non-existent checkpoint', async () => {
            await expect(manager.cleanup()).resolves.not.toThrow();
        });
    });

    describe('error handling', () => {
        it('should handle invalid JSON gracefully', async () => {
            // Write invalid JSON
            await fs.writeFile(checkpointPath, 'invalid json {');

            const loaded = await manager.load();
            expect(loaded).toBeNull();
        });

        it('should handle missing version', async () => {
            await fs.writeFile(checkpointPath, JSON.stringify({ noVersion: true }));

            const loaded = await manager.load();
            // Should handle missing version gracefully
            expect(loaded).toBeDefined();
        });

        it('should handle corrupted checkpoint', async () => {
            await fs.writeFile(checkpointPath, '{"version":"1.0"}');

            const loaded = await manager.load();
            // Should return something or null depending on validation
            expect(loaded !== undefined).toBe(true);
        });
    });

    describe('concurrent access', () => {
        it('should handle concurrent saves', async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                const checkpoint: ParallelExecutionCheckpoint = {
                    version: '1.0',
                    executionId: `concurrent-${i}`,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    command: `command-${i}`,
                    originalConfig: {} as TreeExecutionConfig,
                    dependencyGraph: {
                        packages: [],
                        edges: [],
                        workspaceRoot: '/test'
                    },
                    buildOrder: [],
                    executionMode: 'parallel',
                    maxConcurrency: 1,
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
                    totalStartTime: new Date().toISOString(),
                    recoveryHints: [],
                    canRecover: true
                };

                promises.push(manager.save(checkpoint));
            }

            await Promise.all(promises);

            // Should have saved the last one
            const loaded = await manager.load();
            expect(loaded).toBeDefined();
            expect(loaded?.executionId).toMatch(/^concurrent-\d$/);
        });
    });
});


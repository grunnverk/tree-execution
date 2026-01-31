import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DynamicTaskPool } from '../../src/execution/DynamicTaskPool';
import type { DependencyGraph, PackageInfo } from '@grunnverk/tree-core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

/**
 * Integration test that verifies context isolation in parallel execution
 * This tests the actual bug we're fixing: repository mixing in parallel mode
 */
describe('Parallel Execution Context Isolation Integration', () => {
    let testDir1: string;
    let testDir2: string;
    let testDir3: string;

    beforeEach(() => {
        testDir1 = mkdtempSync(join(tmpdir(), 'kodrdriv-integration-1-'));
        testDir2 = mkdtempSync(join(tmpdir(), 'kodrdriv-integration-2-'));
        testDir3 = mkdtempSync(join(tmpdir(), 'kodrdriv-integration-3-'));
    });

    afterEach(() => {
        rmSync(testDir1, { recursive: true, force: true });
        rmSync(testDir2, { recursive: true, force: true });
        rmSync(testDir3, { recursive: true, force: true });
    });

    describe('DynamicTaskPool context creation', () => {
        it('should create isolated contexts for all packages in the graph', () => {
            // Setup: Create three git repos with different remotes
            execSync('git init', { cwd: testDir1 });
            execSync('git remote add origin git@github.com:org1/repo1.git', { cwd: testDir1 });
            writeFileSync(join(testDir1, 'package.json'), JSON.stringify({
                name: '@test/package1',
                version: '1.0.0'
            }));

            execSync('git init', { cwd: testDir2 });
            execSync('git remote add origin git@github.com:org2/repo2.git', { cwd: testDir2 });
            writeFileSync(join(testDir2, 'package.json'), JSON.stringify({
                name: '@test/package2',
                version: '1.0.0'
            }));

            execSync('git init', { cwd: testDir3 });
            execSync('git remote add origin git@github.com:org3/repo3.git', { cwd: testDir3 });
            writeFileSync(join(testDir3, 'package.json'), JSON.stringify({
                name: '@test/package3',
                version: '1.0.0'
            }));

            // Create dependency graph
            const packages = new Map<string, PackageInfo>([
                ['@test/package1', {
                    name: '@test/package1',
                    version: '1.0.0',
                    path: testDir1,
                    dependencies: [],
                    devDependencies: [],
                    peerDependencies: []
                }],
                ['@test/package2', {
                    name: '@test/package2',
                    version: '1.0.0',
                    path: testDir2,
                    dependencies: [],
                    devDependencies: [],
                    peerDependencies: []
                }],
                ['@test/package3', {
                    name: '@test/package3',
                    version: '1.0.0',
                    path: testDir3,
                    dependencies: [],
                    devDependencies: [],
                    peerDependencies: []
                }],
            ]);

            const graph: DependencyGraph = {
                packages,
                edges: new Map([
                    ['@test/package1', new Set()],
                    ['@test/package2', new Set()],
                    ['@test/package3', new Set()],
                ]),
                buildOrder: ['@test/package1', '@test/package2', '@test/package3']
            };

            // Create pool (this should create contexts)
            const pool = new DynamicTaskPool({
                graph,
                maxConcurrency: 3,
                command: 'npm test',
                config: {
                    dryRun: true,
                    debug: false,
                    verbose: false
                }
            });

            // Access the private packageContexts field to verify contexts were created
            const contexts = (pool as any).packageContexts;

            // Verify: Contexts exist and are isolated
            expect(contexts).toBeDefined();
            expect(contexts.size).toBe(3);

            const ctx1 = contexts.get('@test/package1');
            expect(ctx1).toBeDefined();
            expect(ctx1.repositoryOwner).toBe('org1');
            expect(ctx1.repositoryName).toBe('repo1');

            const ctx2 = contexts.get('@test/package2');
            expect(ctx2).toBeDefined();
            expect(ctx2.repositoryOwner).toBe('org2');
            expect(ctx2.repositoryName).toBe('repo2');

            const ctx3 = contexts.get('@test/package3');
            expect(ctx3).toBeDefined();
            expect(ctx3.repositoryOwner).toBe('org3');
            expect(ctx3.repositoryName).toBe('repo3');
        });

        it('should maintain context isolation even with working directory changes', () => {
            // Setup repos
            execSync('git init', { cwd: testDir1 });
            execSync('git remote add origin git@github.com:org1/repo1.git', { cwd: testDir1 });
            writeFileSync(join(testDir1, 'package.json'), JSON.stringify({
                name: '@test/package1',
                version: '1.0.0'
            }));

            execSync('git init', { cwd: testDir2 });
            execSync('git remote add origin git@github.com:org2/repo2.git', { cwd: testDir2 });
            writeFileSync(join(testDir2, 'package.json'), JSON.stringify({
                name: '@test/package2',
                version: '1.0.0'
            }));

            // Create graph
            const packages = new Map<string, PackageInfo>([
                ['@test/package1', {
                    name: '@test/package1',
                    version: '1.0.0',
                    path: testDir1,
                    dependencies: [],
                    devDependencies: [],
                    peerDependencies: []
                }],
                ['@test/package2', {
                    name: '@test/package2',
                    version: '1.0.0',
                    path: testDir2,
                    dependencies: [],
                    devDependencies: [],
                    peerDependencies: []
                }],
            ]);

            const graph: DependencyGraph = {
                packages,
                edges: new Map([
                    ['@test/package1', new Set()],
                    ['@test/package2', new Set()],
                ]),
                buildOrder: ['@test/package1', '@test/package2']
            };

            // Save original cwd
            const originalCwd = process.cwd();

            // Create pool while in testDir1
            process.chdir(testDir1);
            const pool = new DynamicTaskPool({
                graph,
                maxConcurrency: 2,
                command: 'npm test',
                config: { dryRun: true, debug: false, verbose: false }
            });

            // Change to testDir2
            process.chdir(testDir2);

            // Get contexts
            const contexts = (pool as any).packageContexts;

            // Verify: Contexts still have correct repository info
            // (not affected by working directory changes)
            const ctx1 = contexts.get('@test/package1');
            expect(ctx1.repositoryOwner).toBe('org1');
            expect(ctx1.repositoryName).toBe('repo1');

            const ctx2 = contexts.get('@test/package2');
            expect(ctx2.repositoryOwner).toBe('org2');
            expect(ctx2.repositoryName).toBe('repo2');

            // Restore original cwd
            process.chdir(originalCwd);
        });
    });

    describe('bug scenario reproduction', () => {
        it('should fix the original bug: kjerneverk packages using wrong repositories', () => {
            // This reproduces the exact bug scenario from the real monorepo

            // Setup: Simulate @kjerneverk/agentic and @kjerneverk/execution
            execSync('git init', { cwd: testDir1 });
            execSync('git remote add origin git@github.com:kjerneverk/agentic.git', { cwd: testDir1 });
            writeFileSync(join(testDir1, 'package.json'), JSON.stringify({
                name: '@kjerneverk/agentic',
                version: '0.0.21'
            }));

            execSync('git init', { cwd: testDir2 });
            execSync('git remote add origin git@github.com:kjerneverk/execution-openai.git', { cwd: testDir2 });
            writeFileSync(join(testDir2, 'package.json'), JSON.stringify({
                name: '@kjerneverk/execution',
                version: '0.0.21'
            }));

            // Create graph
            const packages = new Map<string, PackageInfo>([
                ['@kjerneverk/agentic', {
                    name: '@kjerneverk/agentic',
                    version: '0.0.21',
                    path: testDir1,
                    dependencies: [],
                    devDependencies: [],
                    peerDependencies: []
                }],
                ['@kjerneverk/execution', {
                    name: '@kjerneverk/execution',
                    version: '0.0.21',
                    path: testDir2,
                    dependencies: [],
                    devDependencies: [],
                    peerDependencies: []
                }],
            ]);

            const graph: DependencyGraph = {
                packages,
                edges: new Map([
                    ['@kjerneverk/agentic', new Set()],
                    ['@kjerneverk/execution', new Set()],
                ]),
                buildOrder: ['@kjerneverk/agentic', '@kjerneverk/execution']
            };

            // Create pool
            const pool = new DynamicTaskPool({
                graph,
                maxConcurrency: 2,
                command: 'kodrdriv publish',
                config: { dryRun: true, debug: false, verbose: false }
            });

            // Get contexts
            const contexts = (pool as any).packageContexts;

            // THE FIX: Each package should have its own repository
            const agenticCtx = contexts.get('@kjerneverk/agentic');
            expect(agenticCtx).toBeDefined();
            expect(agenticCtx.repositoryName).toBe('agentic');
            expect(agenticCtx.repositoryOwner).toBe('kjerneverk');
            expect(agenticCtx.repositoryUrl).toBe('https://github.com/kjerneverk/agentic');

            const executionCtx = contexts.get('@kjerneverk/execution');
            expect(executionCtx).toBeDefined();
            expect(executionCtx.repositoryName).toBe('execution-openai');
            expect(executionCtx.repositoryOwner).toBe('kjerneverk');
            expect(executionCtx.repositoryUrl).toBe('https://github.com/kjerneverk/execution-openai');

            // THE BUG WAS: Both would use execution-openai
            // THE FIX: Each uses its own repository
            expect(agenticCtx.repositoryName).not.toBe(executionCtx.repositoryName);
        });
    });

    describe('context validation in execution', () => {
        it('should validate contexts before execution', () => {
            // Setup
            execSync('git init', { cwd: testDir1 });
            execSync('git remote add origin git@github.com:test-org/test-repo.git', { cwd: testDir1 });
            writeFileSync(join(testDir1, 'package.json'), JSON.stringify({
                name: '@test/package',
                version: '1.0.0'
            }));

            const packages = new Map<string, PackageInfo>([
                ['@test/package', {
                    name: '@test/package',
                    version: '1.0.0',
                    path: testDir1,
                    dependencies: [],
                    devDependencies: [],
                    peerDependencies: []
                }],
            ]);

            const graph: DependencyGraph = {
                packages,
                edges: new Map([['@test/package', new Set()]]),
                buildOrder: ['@test/package']
            };

            // Create pool
            const pool = new DynamicTaskPool({
                graph,
                maxConcurrency: 1,
                command: 'npm test',
                config: { dryRun: true, debug: false, verbose: false }
            });

            // Get context
            const contexts = (pool as any).packageContexts;
            const ctx = contexts.get('@test/package');

            // Verify: Context validates successfully
            expect(() => ctx.validate()).not.toThrow();
        });
    });
});

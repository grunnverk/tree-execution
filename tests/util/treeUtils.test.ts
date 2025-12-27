import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getOutputPath,
    PerformanceTimer,
    isInGitRepository,
    runGitWithLock,
    optimizePrecommitCommand,
    recordTestRun
} from '../../src/util/treeUtils.js';
import type { TreeExecutionConfig } from '../../src/types/config.js';

describe('treeUtils', () => {
    describe('getOutputPath', () => {
        it('should return directory from config', () => {
            const config: TreeExecutionConfig = {
                outputDirectory: '/custom/output'
            };
            const path = getOutputPath(config);
            expect(path).toBe('/custom/output');
        });

        it('should return default directory if not specified', () => {
            const config: TreeExecutionConfig = {};
            const path = getOutputPath(config);
            expect(path).toBe('output/kodrdriv');
        });

        it('should accept directory string', () => {
            const path = getOutputPath('/my/dir');
            expect(path).toBe('/my/dir');
        });

        it('should append filename if provided', () => {
            const path = getOutputPath('/my/dir', 'file.txt');
            expect(path).toBe('/my/dir/file.txt');
        });

        it('should append filename with config', () => {
            const config: TreeExecutionConfig = {
                outputDirectory: '/custom'
            };
            const path = getOutputPath(config, 'test.json');
            expect(path).toBe('/custom/test.json');
        });
    });

    describe('PerformanceTimer', () => {
        it('should create a timer', () => {
            const timer = new PerformanceTimer('test');
            expect(timer).toBeInstanceOf(PerformanceTimer);
        });

        it('should measure duration', async () => {
            const timer = new PerformanceTimer('test');
            await new Promise(resolve => setTimeout(resolve, 50));
            const duration = timer.end();
            
            expect(duration).toBeGreaterThanOrEqual(40); // Allow some variance
            expect(duration).toBeLessThan(200);
        });

        it('should get duration without ending', async () => {
            const timer = new PerformanceTimer('test');
            await new Promise(resolve => setTimeout(resolve, 50));
            const duration = timer.getDuration();
            
            expect(duration).toBeGreaterThanOrEqual(40);
            expect(duration).toBeLessThan(200);
        });

        it('should continue tracking after getDuration', async () => {
            const timer = new PerformanceTimer('test');
            await new Promise(resolve => setTimeout(resolve, 30));
            
            const duration1 = timer.getDuration();
            await new Promise(resolve => setTimeout(resolve, 30));
            const duration2 = timer.getDuration();
            
            expect(duration2).toBeGreaterThan(duration1);
        });

        it('should end timer', async () => {
            const timer = new PerformanceTimer('test');
            await new Promise(resolve => setTimeout(resolve, 30));
            const duration = timer.end();
            
            expect(duration).toBeGreaterThanOrEqual(20);
        });
    });

    describe('isInGitRepository', () => {
        it('should return false for non-existent directory', async () => {
            const result = await isInGitRepository('/nonexistent/path/12345');
            expect(result).toBe(false);
        });

        it('should check for .git directory', async () => {
            // This test assumes we're running in a git repository
            const result = await isInGitRepository(process.cwd());
            expect(typeof result).toBe('boolean');
        });
    });

    describe('runGitWithLock', () => {
        it('should run function', async () => {
            let executed = false;
            await runGitWithLock(async () => {
                executed = true;
            });
            expect(executed).toBe(true);
        });

        it('should return function result', async () => {
            const result = await runGitWithLock(async () => {
                return 42;
            });
            expect(result).toBe(42);
        });

        it('should propagate errors', async () => {
            await expect(
                runGitWithLock(async () => {
                    throw new Error('Test error');
                })
            ).rejects.toThrow('Test error');
        });

        it('should work with synchronous functions', async () => {
            const result = await runGitWithLock(() => Promise.resolve('sync'));
            expect(result).toBe('sync');
        });
    });

    describe('optimizePrecommitCommand', () => {
        it('should return optimization result', async () => {
            const result = await optimizePrecommitCommand('/path/to/package', 'npm run precommit');
            
            expect(result).toBeDefined();
            expect(result.optimizedCommand).toBe('npm run precommit');
            expect(result.skipped).toBeDefined();
            expect(result.reasons).toBeDefined();
        });

        it('should return stub result with no optimizations', async () => {
            const result = await optimizePrecommitCommand('/path', 'npm test');
            
            expect(result.skipped).toEqual({});
            expect(result.reasons).toEqual({});
        });

        it('should preserve command', async () => {
            const command = 'npm run test -- --coverage';
            const result = await optimizePrecommitCommand('/path', command);
            
            expect(result.optimizedCommand).toBe(command);
        });
    });

    describe('recordTestRun', () => {
        it('should accept package path', async () => {
            await expect(recordTestRun('/path/to/package')).resolves.toBeUndefined();
        });

        it('should accept optional parameters', async () => {
            await expect(
                recordTestRun('/path/to/package', true, 1000)
            ).resolves.toBeUndefined();
        });

        it('should not throw errors', async () => {
            await expect(recordTestRun('/any/path')).resolves.not.toThrow();
        });
    });
});


import { describe, it, expect, beforeEach } from 'vitest';
import { TreeExecutor, createTreeExecutor, type CommandExecutor, type PublishedVersion } from '../src/TreeExecutor.js';
import type { TreeExecutionConfig } from '../src/types/config.js';

describe('TreeExecutor', () => {
    let executor: TreeExecutor;

    beforeEach(() => {
        executor = createTreeExecutor();
    });

    describe('constructor and factory', () => {
        it('should create a TreeExecutor instance', () => {
            expect(executor).toBeInstanceOf(TreeExecutor);
        });

        it('should create with createTreeExecutor factory', () => {
            const exec = createTreeExecutor();
            expect(exec).toBeInstanceOf(TreeExecutor);
        });

        it('should accept options', () => {
            const customLogger = { info: () => {}, debug: () => {}, error: () => {}, warn: () => {}, verbose: () => {}, silly: () => {} };
            const exec = createTreeExecutor({ logger: customLogger });
            expect(exec).toBeInstanceOf(TreeExecutor);
        });
    });

    describe('publishedVersions management', () => {
        it('should start with empty published versions', async () => {
            const versions = await executor.getPublishedVersions();
            expect(versions).toEqual([]);
        });

        it('should add published version', async () => {
            const version: PublishedVersion = {
                packageName: '@grunnverk/test',
                version: '1.0.0',
                publishTime: new Date()
            };

            await executor.addPublishedVersion(version);
            const versions = await executor.getPublishedVersions();

            expect(versions).toHaveLength(1);
            expect(versions[0].packageName).toBe('@grunnverk/test');
            expect(versions[0].version).toBe('1.0.0');
        });

        it('should add multiple published versions', async () => {
            await executor.addPublishedVersion({
                packageName: '@grunnverk/test1',
                version: '1.0.0',
                publishTime: new Date()
            });

            await executor.addPublishedVersion({
                packageName: '@grunnverk/test2',
                version: '2.0.0',
                publishTime: new Date()
            });

            const versions = await executor.getPublishedVersions();
            expect(versions).toHaveLength(2);
        });

        it('should return a copy of published versions (not modifiable)', async () => {
            await executor.addPublishedVersion({
                packageName: '@grunnverk/test',
                version: '1.0.0',
                publishTime: new Date()
            });

            const versions1 = await executor.getPublishedVersions();
            versions1.push({
                packageName: '@grunnverk/fake',
                version: '9.9.9',
                publishTime: new Date()
            });

            const versions2 = await executor.getPublishedVersions();
            expect(versions2).toHaveLength(1); // Should still be 1
        });
    });

    describe('executionContext management', () => {
        it('should start with null execution context', async () => {
            const context = await executor.getExecutionContext();
            expect(context).toBeNull();
        });

        it('should set and get execution context', async () => {
            const testContext = {
                command: 'publish',
                originalConfig: { dryRun: false } as TreeExecutionConfig,
                publishedVersions: [],
                completedPackages: [],
                buildOrder: [],
                startTime: new Date(),
                lastUpdateTime: new Date()
            };

            await executor.setExecutionContext(testContext);
            const context = await executor.getExecutionContext();

            expect(context).not.toBeNull();
            expect(context?.command).toBe('publish');
        });

        it('should return a copy of execution context (not modifiable)', async () => {
            const testContext = {
                command: 'publish',
                originalConfig: { dryRun: false } as TreeExecutionConfig,
                publishedVersions: [],
                completedPackages: ['pkg1'],
                buildOrder: [],
                startTime: new Date(),
                lastUpdateTime: new Date()
            };

            await executor.setExecutionContext(testContext);
            const context1 = await executor.getExecutionContext();
            context1!.completedPackages.push('fake-package');

            const context2 = await executor.getExecutionContext();
            expect(context2?.completedPackages).toHaveLength(1); // Should still be 1
        });

        it('should allow clearing execution context', async () => {
            const testContext = {
                command: 'publish',
                originalConfig: { dryRun: false } as TreeExecutionConfig,
                publishedVersions: [],
                completedPackages: [],
                buildOrder: [],
                startTime: new Date(),
                lastUpdateTime: new Date()
            };

            await executor.setExecutionContext(testContext);
            await executor.setExecutionContext(null);

            const context = await executor.getExecutionContext();
            expect(context).toBeNull();
        });
    });

    describe('reset', () => {
        it('should reset all state', async () => {
            // Add some state
            await executor.addPublishedVersion({
                packageName: '@grunnverk/test',
                version: '1.0.0',
                publishTime: new Date()
            });

            await executor.setExecutionContext({
                command: 'publish',
                originalConfig: {} as TreeExecutionConfig,
                publishedVersions: [],
                completedPackages: [],
                buildOrder: [],
                startTime: new Date(),
                lastUpdateTime: new Date()
            });

            // Reset
            await executor.reset();

            // Verify everything is cleared
            const versions = await executor.getPublishedVersions();
            const context = await executor.getExecutionContext();

            expect(versions).toEqual([]);
            expect(context).toBeNull();
        });
    });

    describe('command registry', () => {
        it('should return undefined for unregistered commands', () => {
            const cmd = executor.getCommand('commit');
            expect(cmd).toBeUndefined();
        });

        it('should set and get commands', () => {
            const mockCommand: CommandExecutor = {
                execute: async (config) => {
                    return 'executed';
                }
            };

            executor.setCommand('commit', mockCommand);
            const cmd = executor.getCommand('commit');

            expect(cmd).toBeDefined();
            expect(cmd).toBe(mockCommand);
        });

        it('should execute registered command', async () => {
            let executed = false;
            const mockCommand: CommandExecutor = {
                execute: async (config) => {
                    executed = true;
                    return 'success';
                }
            };

            executor.setCommand('commit', mockCommand);
            const cmd = executor.getCommand('commit');
            await cmd!.execute({} as TreeExecutionConfig);

            expect(executed).toBe(true);
        });

        it('should pass config to command execute', async () => {
            let receivedConfig: TreeExecutionConfig | null = null;
            const mockCommand: CommandExecutor = {
                execute: async (config) => {
                    receivedConfig = config;
                }
            };

            const testConfig: TreeExecutionConfig = { dryRun: true, debug: true };

            executor.setCommand('commit', mockCommand);
            const cmd = executor.getCommand('commit');
            await cmd!.execute(testConfig);

            expect(receivedConfig).not.toBeNull();
            expect(receivedConfig?.dryRun).toBe(true);
            expect(receivedConfig?.debug).toBe(true);
        });

        it('should accept commands in constructor', () => {
            const mockCommit: CommandExecutor = {
                execute: async () => 'commit'
            };

            const mockLink: CommandExecutor = {
                execute: async () => 'link'
            };

            const exec = createTreeExecutor({
                commands: {
                    commit: mockCommit,
                    link: mockLink
                }
            });

            expect(exec.getCommand('commit')).toBe(mockCommit);
            expect(exec.getCommand('link')).toBe(mockLink);
        });

        it('should allow overriding commands', () => {
            const mockCommand1: CommandExecutor = {
                execute: async () => 'version1'
            };

            const mockCommand2: CommandExecutor = {
                execute: async () => 'version2'
            };

            executor.setCommand('commit', mockCommand1);
            expect(executor.getCommand('commit')).toBe(mockCommand1);

            executor.setCommand('commit', mockCommand2);
            expect(executor.getCommand('commit')).toBe(mockCommand2);
        });
    });

    describe('thread safety', () => {
        it('should handle concurrent published version additions', async () => {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    executor.addPublishedVersion({
                        packageName: `@grunnverk/test${i}`,
                        version: '1.0.0',
                        publishTime: new Date()
                    })
                );
            }

            await Promise.all(promises);
            const versions = await executor.getPublishedVersions();
            expect(versions).toHaveLength(10);
        });

        it('should handle concurrent context updates', async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    executor.setExecutionContext({
                        command: `command${i}`,
                        originalConfig: {} as TreeExecutionConfig,
                        publishedVersions: [],
                        completedPackages: [],
                        buildOrder: [],
                        startTime: new Date(),
                        lastUpdateTime: new Date()
                    })
                );
            }

            await Promise.all(promises);
            const context = await executor.getExecutionContext();
            expect(context).not.toBeNull();
            expect(context?.command).toMatch(/^command\d$/);
        });
    });
});


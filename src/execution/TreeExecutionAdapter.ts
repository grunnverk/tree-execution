import { DynamicTaskPool, PoolConfig } from './DynamicTaskPool.js';
import type { PackageInfo } from '@grunnverk/tree-core';
import type { TreeExecutionConfig } from '../types/config.js';
import type { PackageResult } from '../types/index.js';
import { getLogger } from '../util/logger.js';
import type { PackageExecutionContext } from '../context/PackageExecutionContext.js';

/**
 * ExecutePackageFunction type matches the signature of tree.ts executePackage
 */
export type ExecutePackageFunction = (
    packageName: string,
    packageInfo: PackageInfo,
    commandToRun: string,
    runConfig: TreeExecutionConfig,
    isDryRun: boolean,
    index: number,
    total: number,
    allPackageNames: Set<string>,
    isBuiltInCommand?: boolean,
    context?: PackageExecutionContext
) => Promise<{ success: boolean; error?: any; isTimeoutError?: boolean; skippedNoChanges?: boolean; logFile?: string }>;

/**
 * TreeExecutionAdapter bridges DynamicTaskPool with tree.ts executePackage
 */
export class TreeExecutionAdapter {
    private pool: DynamicTaskPool;
    private executePackageFn: ExecutePackageFunction;
    private config: PoolConfig;
    private startedCount: number = 0;
    private completedCount: number = 0;

    constructor(config: PoolConfig, executePackageFn: ExecutePackageFunction) {
        this.config = config;
        this.executePackageFn = executePackageFn;

        // Create custom pool that uses our execute function
        this.pool = new DynamicTaskPool(config);

        // Track completion count for progress display
        this.pool.on('package:completed', () => {
            this.completedCount++;
        });

        // Override the executePackage method to use tree.ts function
        (this.pool as any).executePackage = this.createExecutePackageWrapper();
    }

    /**
     * Create wrapper that adapts tree.ts executePackage to DynamicTaskPool format
     */
    private createExecutePackageWrapper() {
        return async (packageName: string, _signal: AbortSignal): Promise<PackageResult> => {
            const packageInfo = this.config.graph.packages.get(packageName);
            if (!packageInfo) {
                throw new Error(`Package not found: ${packageName}`);
            }

            // Get the isolated execution context for this package
            const context = (this.pool as any).packageContexts?.get(packageName);
            if (context) {
                const logger = getLogger();
                logger.debug(`Using isolated context for ${packageName}`);
                logger.debug(`  Repository: ${context.repositoryOwner}/${context.repositoryName}`);

                // Validate context before use
                try {
                    context.validate();
                } catch (error: any) {
                    logger.error(`Context validation failed for ${packageName}: ${error.message}`);
                    throw error;
                }
            }

            const allPackageNames = new Set(this.config.graph.packages.keys());
            const isDryRun = this.config.config.dryRun || false;
            const isBuiltInCommand = !this.config.command.startsWith('npm') &&
                                     !this.config.command.includes('&&');

            // Increment started count and use it as index for progress display
            const currentIndex = this.startedCount++;

            // Call onPackageFocus callback if provided
            if (this.config.config.tree?.onPackageFocus) {
                try {
                    await Promise.resolve(
                        this.config.config.tree.onPackageFocus(
                            packageName,
                            currentIndex,
                            this.config.graph.packages.size
                        )
                    );
                } catch (error: any) {
                    // Log but don't fail execution if callback errors
                    const logger = getLogger();
                    logger.warn(`onPackageFocus callback failed for ${packageName}: ${error.message}`);
                }
            }

            // Call tree.ts executePackage with context
            const startTime = Date.now();
            const result = await this.executePackageFn(
                packageName,
                packageInfo,
                this.config.command,
                this.config.config,
                isDryRun,
                currentIndex, // Use incremented started count for proper [N/Total] display
                this.config.graph.packages.size,
                allPackageNames,
                isBuiltInCommand,
                context // Pass the isolated context
            );

            const duration = Date.now() - startTime;

            if (!result.success) {
                // Attach logFile path to error for better error reporting
                const error = result.error || new Error('Package execution failed');
                (error as any).logFilePath = result.logFile;
                throw error;
            }

            // Check if this was a "no changes" skip (result will have skippedNoChanges flag)
            const skippedNoChanges = (result as any).skippedNoChanges || false;

            return {
                success: true,
                duration,
                // Extract published version if available (from output or state)
                publishedVersion: undefined,
                stdout: undefined,
                stderr: undefined,
                skippedNoChanges
            };
        };
    }

    /**
     * Execute parallel execution
     */
    async execute() {
        return await this.pool.execute();
    }

    /**
     * Get the underlying task pool for event listeners
     */
    getPool(): DynamicTaskPool {
        return this.pool;
    }
}

/**
 * Create progress logger that listens to pool events
 */
export function createParallelProgressLogger(pool: DynamicTaskPool, config: TreeExecutionConfig): void {
    const logger = getLogger();
    const startTime = Date.now();
    let completedCount = 0;
    let totalPackages = 0;

    pool.on('execution:started', ({ totalPackages: total }) => {
        totalPackages = total;
        logger.info(`\nPARALLEL_EXECUTION_STARTING: Initiating parallel package execution | Package Count: ${total} | Mode: parallel | Strategy: dependency-aware`);
    });

    pool.on('package:started', ({ packageName }) => {
        if (config.verbose || config.debug) {
            logger.info(`PACKAGE_STARTED: Package execution initiated | Package: ${packageName} | Status: running`);
        }
    });

    pool.on('package:completed', ({ packageName, result }) => {
        completedCount++;
        const percent = Math.round((completedCount / totalPackages) * 100);
        const elapsed = Math.round((Date.now() - startTime) / 1000);

        if (config.debug) {
            logger.info(`PACKAGE_COMPLETED: Package execution finished successfully | Package: ${packageName} | Duration: ${result.duration}ms | Progress: ${completedCount}/${totalPackages} (${percent}%) | Elapsed: ${elapsed}s`);
        } else if (config.verbose) {
            logger.info(`PACKAGE_COMPLETED: Package execution finished | Package: ${packageName} | Progress: ${completedCount}/${totalPackages}`);
        } else {
            // Minimal output
            logger.info(`PROGRESS: [${completedCount}/${totalPackages}] Package completed: ${packageName}`);
        }
    });

    pool.on('package:failed', ({ packageName, error }) => {
        logger.error(`PACKAGE_FAILED: Package execution failed | Package: ${packageName} | Error: ${error.message} | Status: error`);
    });

    pool.on('package:retrying', ({ packageName, attemptNumber }) => {
        logger.warn(`PACKAGE_RETRYING: Retrying package execution | Package: ${packageName} | Attempt: ${attemptNumber} | Status: retrying`);
    });

    pool.on('package:skipped', ({ packageName, reason }) => {
        logger.warn(`PACKAGE_SKIPPED: Package skipped due to dependency failure | Package: ${packageName} | Reason: ${reason} | Status: skipped`);
    });

    pool.on('package:skipped-no-changes', ({ packageName }) => {
        if (config.verbose || config.debug) {
            logger.info(`PACKAGE_SKIPPED_NO_CHANGES: Package skipped due to no code changes | Package: ${packageName} | Reason: no-code-changes | Status: skipped`);
        }
    });

    pool.on('checkpoint:saved', () => {
        if (config.debug) {
            logger.debug('CHECKPOINT_SAVED: Execution checkpoint saved | Purpose: Recovery support | Action: State persisted to disk');
        }
    });

    pool.on('execution:completed', ({ result }) => {
        const totalTime = Math.round((Date.now() - startTime) / 1000);
        logger.info(`\nPARALLEL_EXECUTION_COMPLETED: Parallel execution finished | Duration: ${totalTime}s | Status: completed`);

        if (config.verbose || config.debug) {
            logger.info(`\nEXECUTION_METRICS: Performance and execution statistics:`);
            logger.info(`  METRIC_TOTAL_PACKAGES: ${result.totalPackages}`);
            logger.info(`  METRIC_COMPLETED: ${result.completed.length} packages successfully completed`);
            logger.info(`  METRIC_SKIPPED_NO_CHANGES: ${result.skippedNoChanges.length} packages skipped (no changes)`);
            logger.info(`  METRIC_SKIPPED_DEPENDENCIES: ${result.skipped.length} packages skipped (dependency failures)`);
            logger.info(`  METRIC_FAILED: ${result.failed.length} packages failed`);
            logger.info(`  METRIC_PEAK_CONCURRENCY: ${result.metrics.peakConcurrency} packages running simultaneously`);
            logger.info(`  METRIC_AVG_CONCURRENCY: ${result.metrics.averageConcurrency.toFixed(1)} average concurrent packages`);
        }
    });
}

/**
 * Simple error summary formatter (inline implementation)
 */
function createErrorSummary(failed: any[]): string[] {
    const lines: string[] = [];
    lines.push('❌ Error Details:');
    for (const pkg of failed) {
        lines.push(`\n  Package: ${pkg.name}`);
        if (pkg.error) {
            lines.push(`  Error: ${pkg.error}`);
        }
        if (pkg.logFile) {
            lines.push(`  Log: ${pkg.logFile}`);
        }
    }
    return lines;
}

/**
 * Simple recovery guidance formatter (inline implementation)
 */
function createRecoveryGuidance(hasRetriable: boolean, hasPermanent: boolean): string[] {
    const lines: string[] = [];
    if (hasRetriable) {
        lines.push('\n💡 Some failures may be temporary (network issues, etc.)');
        lines.push('   Consider retrying with: kodrdriv tree publish --continue');
    }
    if (hasPermanent) {
        lines.push('\n⚠️  Some failures appear to be permanent');
        lines.push('   Review and fix the issues before retrying');
    }
    return lines;
}

/**
 * Format parallel execution result for display
 */
export function formatParallelResult(result: any, command?: string): string {
    const lines: string[] = [];

    // Determine appropriate terminology based on command
    const isPublish = command === 'publish' || command?.includes('publish');
    const summaryTitle = isPublish ? 'Publish Summary' : 'Execution Summary';
    const successLabel = isPublish ? 'Published' : 'Completed';

    // Separator line
    lines.push('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`📊 ${summaryTitle}`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Detailed status breakdown by category
    if (result.completed.length > 0) {
        lines.push(`✅ ${successLabel} (${result.completed.length}):`);
        for (const pkg of result.completed) {
            lines.push(`   - ${pkg}`);
        }
        lines.push('');
    }

    if (result.skippedNoChanges.length > 0) {
        lines.push(`⏭️  Skipped (${result.skippedNoChanges.length}) - no code changes:`);
        for (const pkg of result.skippedNoChanges) {
            lines.push(`   - ${pkg}`);
        }
        lines.push('');
    }

    if (result.failed.length > 0) {
        lines.push(`❌ Failed (${result.failed.length}):`);
        for (const pkg of result.failed) {
            lines.push(`   - ${typeof pkg === 'string' ? pkg : pkg.name}`);
        }
        lines.push('');
    }

    if (result.skipped.length > 0) {
        lines.push(`⊘ Skipped due to dependencies (${result.skipped.length}):`);
        for (const pkg of result.skipped) {
            lines.push(`   - ${pkg}`);
        }
        lines.push('');
    }

    // Summary line
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Calculate success rate
    const totalProcessed = result.completed.length + result.failed.length + result.skippedNoChanges.length;
    const successRate = totalProcessed > 0 ? Math.round((result.completed.length / totalProcessed) * 100) : 0;

    // Format elapsed time
    const totalTimeMs = result.metrics?.totalDuration || 0;
    const minutes = Math.floor(totalTimeMs / 60000);
    const seconds = Math.floor((totalTimeMs % 60000) / 1000);
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    lines.push(`Total time: ${timeStr}`);
    lines.push(`Success rate: ${successRate}% (${result.completed.length}/${totalProcessed} packages processed)`);

    if (result.metrics?.peakConcurrency) {
        lines.push(`Peak concurrency: ${result.metrics.peakConcurrency} packages`);
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Failed packages with formatted error summary
    if (result.failed.length > 0) {
        lines.push('');
        const errorLines = createErrorSummary(result.failed);
        lines.push(...errorLines);

        // Next steps for failures
        lines.push('\n📋 Next steps:');
        lines.push('1. Review the errors above for each failed package');
        lines.push('2. Fix the issues in the failed packages');
        lines.push('3. Retry the publish command');

        if (result.skipped.length > 0) {
            lines.push('\nNote: Once failed packages are fixed, their dependent packages will also be published.');
        }

        // Recovery guidance
        const hasRetriable = result.failed.some((f: any) => f.isRetriable);
        const hasPermanent = result.failed.some((f: any) => !f.isRetriable);
        const recoveryLines = createRecoveryGuidance(hasRetriable, hasPermanent);
        lines.push(...recoveryLines);
    }

    return lines.join('\n');
}

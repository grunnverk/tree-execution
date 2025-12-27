/**
 * @eldrforge/tree-execution
 *
 * Parallel execution framework and tree orchestration for monorepo workflows.
 * Provides sophisticated parallel task execution, error recovery, and checkpoint/resume.
 */

// Types
export type {
    ExecutionState,
    ExecutionResult,
    PackageResult,
    ExecutionMetrics,
    ParallelExecutionCheckpoint,
    FailedPackageSnapshot,
    RunningPackageSnapshot,
    PublishedVersion,
    RecoveryHint,
    RetryConfig,
    RecoveryConfig,
    MonitoringConfig
} from './types/index.js';

export type { TreeExecutionConfig } from './types/config.js';

// Execution framework
export { DynamicTaskPool } from './execution/DynamicTaskPool.js';
export type { PoolConfig } from './execution/DynamicTaskPool.js';

export { RecoveryManager } from './execution/RecoveryManager.js';
export type { ValidationResult as RecoveryValidationResult, RecoveryOptions } from './execution/RecoveryManager.js';

export { Scheduler } from './execution/Scheduler.js';

export { ResourceMonitor } from './execution/ResourceMonitor.js';
export type { ResourceMetrics } from './execution/ResourceMonitor.js';

export { DependencyChecker } from './execution/DependencyChecker.js';

export { CommandValidator } from './execution/CommandValidator.js';
export type { ValidationResult as CommandValidationResult } from './execution/CommandValidator.js';

export { TreeExecutionAdapter } from './execution/TreeExecutionAdapter.js';
export type { ExecutePackageFunction } from './execution/TreeExecutionAdapter.js';

// Utilities
export { setLogger, getLogger } from './util/logger.js';
export type { Logger } from './util/logger.js';

export { SimpleMutex } from './util/mutex.js';

export { CheckpointManager } from './checkpoint/index.js';

// Tree orchestration
export { execute as executeTree } from './tree.js';
export { __resetGlobalState as resetTreeGlobalState } from './tree.js';

// TreeExecutor class (new class-based API)
export { TreeExecutor, createTreeExecutor } from './TreeExecutor.js';
export type {
    TreeExecutionContext,
    CommandExecutor,
    CommandRegistry,
    TreeExecutorOptions
} from './TreeExecutor.js';

// Note: PublishedVersion is already exported from './types/index.js'


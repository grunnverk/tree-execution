# @eldrforge/tree-execution

A sophisticated parallel execution framework designed for orchestrating complex dependency-aware workflows in monorepo environments. Execute tasks across multiple packages with intelligent scheduling, automatic error recovery, and checkpoint/resume capabilities.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Advanced Usage](#advanced-usage)
- [Configuration](#configuration)
- [Error Handling & Recovery](#error-handling--recovery)
- [Real-World Examples](#real-world-examples)
- [Testing](#testing)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## Overview

`@eldrforge/tree-execution` provides a robust framework for executing tasks across interdependent packages in a monorepo. It handles:

- **Dependency-aware scheduling**: Automatically determines execution order based on package dependencies
- **Parallel execution**: Runs independent packages concurrently while respecting dependencies
- **Checkpoint/resume**: Save execution state and resume from where you left off
- **Error recovery**: Sophisticated retry logic with exponential backoff
- **Resource management**: CPU and memory-aware concurrency control
- **Progress tracking**: Real-time execution monitoring with detailed metrics

Originally developed as part of the kodrdriv toolkit, this library has been extracted for standalone use in any monorepo workflow.

## Key Features

### 🚀 Intelligent Parallel Execution
Execute tasks across packages with automatic dependency resolution and optimal concurrency:

```typescript
import { createTreeExecutor } from '@eldrforge/tree-execution';
import { buildDependencyGraph } from '@eldrforge/tree-core';

const graph = await buildDependencyGraph(['packages/*/package.json']);
const executor = createTreeExecutor();
await executor.execute({
    tree: {
        directories: ['packages'],
        cmd: 'npm test',
        parallel: true,
        maxConcurrency: 4
    }
});
```

### 💾 Checkpoint & Resume
Save execution state to resume long-running operations:

```typescript
import { DynamicTaskPool } from '@eldrforge/tree-execution';

const pool = new DynamicTaskPool({
    graph,
    maxConcurrency: 4,
    command: 'npm publish',
    config: runConfig,
    checkpointPath: './checkpoints/publish.json'
});

// First run - saves checkpoints automatically
await pool.execute();

// Resume after interruption
await pool.execute({ continue: true });
```

### 🛡️ Sophisticated Error Recovery
Automatic retry with exponential backoff and smart error classification:

```typescript
const result = await executor.execute({
    tree: {
        cmd: 'npm test',
        parallel: true,
        retry: {
            maxAttempts: 3,
            initialDelayMs: 1000,
            maxDelayMs: 10000,
            backoffMultiplier: 2,
            retriableErrors: ['ECONNRESET', 'ETIMEDOUT']
        }
    }
});
```

### 📊 Real-time Progress Tracking
Monitor execution with detailed metrics:

```typescript
import { createParallelProgressLogger } from '@eldrforge/tree-execution';

const logger = createParallelProgressLogger(totalPackages);

pool.on('package:started', ({ packageName }) => {
    logger.onPackageStarted(packageName);
});

pool.on('package:completed', ({ packageName, result }) => {
    logger.onPackageCompleted(packageName, result);
});
```

## Installation

```bash
npm install @eldrforge/tree-execution
```

### Peer Dependencies

```bash
npm install @eldrforge/tree-core @eldrforge/git-tools @eldrforge/shared
```

## Core Concepts

### Dependency Graph

The foundation of execution is a dependency graph built from package.json files:

```typescript
import { buildDependencyGraph } from '@eldrforge/tree-core';

// Scan for packages
const graph = await buildDependencyGraph([
    'packages/*/package.json',
    'apps/*/package.json'
]);

// Graph contains:
// - packages: Map<string, PackageInfo>
// - dependencies: Map<string, Set<string>>
// - dependents: Map<string, Set<string>>
```

### Execution State

The system tracks package states throughout execution:

```typescript
interface ExecutionState {
    pending: string[];        // Not yet started
    ready: string[];          // Dependencies met, ready to run
    running: RunningPackageSnapshot[];  // Currently executing
    completed: string[];      // Successfully completed
    failed: FailedPackageSnapshot[];    // Failed execution
    skipped: string[];        // Skipped due to failed dependencies
    skippedNoChanges: string[]; // Skipped (no code changes detected)
}
```

### TreeExecutor vs DynamicTaskPool

**TreeExecutor** (Recommended):
- High-level, class-based API
- Dependency injection for custom commands
- State management and thread safety built-in
- Ideal for applications integrating tree execution

**DynamicTaskPool** (Advanced):
- Low-level execution engine
- Direct control over task scheduling
- Fine-grained event handling
- Ideal for custom execution frameworks

## Quick Start

### Basic Usage with TreeExecutor

```typescript
import { createTreeExecutor } from '@eldrforge/tree-execution';

// Create executor
const executor = createTreeExecutor({
    commands: {
        // Optional: inject custom commands
        commit: myCommitHandler,
        publish: myPublishHandler
    }
});

// Execute a command across all packages
const result = await executor.execute({
    tree: {
        directories: ['packages'],
        cmd: 'npm run build',
        parallel: true,
        maxConcurrency: 4
    }
});

console.log(`Completed: ${result.completed.length}`);
console.log(`Failed: ${result.failed.length}`);
```

### Advanced Usage with DynamicTaskPool

```typescript
import { DynamicTaskPool } from '@eldrforge/tree-execution';
import { buildDependencyGraph } from '@eldrforge/tree-core';

// Build dependency graph
const graph = await buildDependencyGraph(['packages/*/package.json']);

// Create pool
const pool = new DynamicTaskPool({
    graph,
    maxConcurrency: 4,
    command: 'npm test',
    config: {
        tree: { parallel: true }
    },
    checkpointPath: './checkpoints',
    maxRetries: 3,
    initialRetryDelay: 1000
});

// Listen to events
pool.on('execution:started', ({ totalPackages }) => {
    console.log(`Starting execution of ${totalPackages} packages`);
});

pool.on('package:started', ({ packageName }) => {
    console.log(`Started: ${packageName}`);
});

pool.on('package:completed', ({ packageName, result }) => {
    console.log(`Completed: ${packageName} in ${result.duration}ms`);
});

pool.on('package:failed', ({ packageName, error, retriable }) => {
    console.error(`Failed: ${packageName}`, error);
});

// Execute
const result = await pool.execute();

// Check results
if (result.success) {
    console.log('All packages completed successfully');
    console.log(`Total time: ${result.metrics.totalDuration}ms`);
    console.log(`Average concurrency: ${result.metrics.averageConcurrency}`);
} else {
    console.error(`${result.failed.length} packages failed`);
    result.failed.forEach(f => {
        console.error(`- ${f.name}: ${f.error}`);
    });
}
```

## API Reference

### TreeExecutor

High-level orchestration class with dependency injection.

#### Constructor

```typescript
constructor(options?: TreeExecutorOptions)

interface TreeExecutorOptions {
    commands?: CommandRegistry;  // Custom command handlers
    logger?: Logger;             // Custom logger instance
}

interface CommandRegistry {
    updates?: CommandExecutor;
    commit?: CommandExecutor;
    link?: CommandExecutor;
    unlink?: CommandExecutor;
}

interface CommandExecutor {
    execute(config: TreeExecutionConfig, mode?: string): Promise<any>;
}
```

#### Methods

```typescript
// Execute tree command
async execute(config: TreeExecutionConfig): Promise<string>

// Get published versions (thread-safe)
async getPublishedVersions(): Promise<PublishedVersion[]>

// Add published version (thread-safe)
async addPublishedVersion(version: PublishedVersion): Promise<void>

// Get execution context (thread-safe)
async getExecutionContext(): Promise<TreeExecutionContext | null>

// Set execution context (thread-safe)
async setExecutionContext(context: TreeExecutionContext | null): Promise<void>

// Reset state (for testing)
async reset(): Promise<void>

// Get/set command executors
getCommand(name: keyof CommandRegistry): CommandExecutor | undefined
setCommand(name: keyof CommandRegistry, executor: CommandExecutor): void
```

#### Factory Function

```typescript
import { createTreeExecutor } from '@eldrforge/tree-execution';

const executor = createTreeExecutor({
    commands: {
        commit: myCommitHandler
    }
});
```

### DynamicTaskPool

Low-level parallel execution engine.

#### Constructor

```typescript
constructor(config: PoolConfig)

interface PoolConfig {
    graph: DependencyGraph;      // Dependency graph from @eldrforge/tree-core
    maxConcurrency: number;      // Maximum parallel tasks
    command: string;             // Command to execute
    config: TreeExecutionConfig; // Execution configuration
    checkpointPath?: string;     // Path for checkpoint files
    continue?: boolean;          // Resume from checkpoint
    maxRetries?: number;         // Max retry attempts (default: 3)
    initialRetryDelay?: number;  // Initial retry delay ms (default: 1000)
    maxRetryDelay?: number;      // Max retry delay ms (default: 10000)
    backoffMultiplier?: number;  // Backoff multiplier (default: 2)
}
```

#### Methods

```typescript
// Execute all packages
async execute(): Promise<ExecutionResult>

// Abort execution
async abort(reason?: string): Promise<void>

// Get current checkpoint
async getCheckpoint(): Promise<ParallelExecutionCheckpoint>

// Load checkpoint and resume
private async loadCheckpoint(): Promise<void>

// Save checkpoint
private async saveCheckpoint(): Promise<void>
```

#### Events

```typescript
// Execution lifecycle
pool.on('execution:started', ({ totalPackages }) => { });
pool.on('execution:completed', (result: ExecutionResult) => { });
pool.on('execution:failed', (error: Error) => { });
pool.on('execution:aborted', ({ reason }) => { });

// Package lifecycle
pool.on('package:started', ({ packageName, attemptNumber }) => { });
pool.on('package:completed', ({ packageName, result }) => { });
pool.on('package:failed', ({ packageName, error, retriable, attemptNumber }) => { });
pool.on('package:retry', ({ packageName, attemptNumber, delayMs, error }) => { });
pool.on('package:skipped', ({ packageName, reason }) => { });

// Progress tracking
pool.on('progress:update', ({ completed, total, percentage }) => { });
pool.on('concurrency:changed', ({ active, available }) => { });

// Checkpointing
pool.on('checkpoint:saved', ({ path, packages }) => { });
pool.on('checkpoint:loaded', ({ path, resumePoint }) => { });
```

### Helper Functions

#### TreeExecutionAdapter

Bridges DynamicTaskPool with custom execution functions:

```typescript
import { TreeExecutionAdapter, ExecutePackageFunction } from '@eldrforge/tree-execution';

const executePackage: ExecutePackageFunction = async (
    packageName,
    packageInfo,
    command,
    config,
    isDryRun,
    index,
    total,
    allPackageNames,
    isBuiltInCommand
) => {
    // Custom execution logic
    return { success: true };
};

const adapter = new TreeExecutionAdapter(poolConfig, executePackage);
const result = await adapter.execute();
```

#### Progress Logger

```typescript
import { createParallelProgressLogger } from '@eldrforge/tree-execution';

const logger = createParallelProgressLogger(totalPackages);

pool.on('package:started', ({ packageName }) => {
    logger.onPackageStarted(packageName);
});

pool.on('package:completed', ({ packageName, result }) => {
    logger.onPackageCompleted(packageName, result);
});

pool.on('package:failed', ({ packageName, error }) => {
    logger.onPackageFailed(packageName, error);
});
```

#### Result Formatter

```typescript
import { formatParallelResult } from '@eldrforge/tree-execution';

const result = await pool.execute();
const formatted = formatParallelResult(result);
console.log(formatted); // Human-readable summary
```

### Component APIs

#### CheckpointManager

Manages execution state persistence:

```typescript
import { CheckpointManager } from '@eldrforge/tree-execution';

const manager = new CheckpointManager('./checkpoints');

// Save checkpoint
await manager.saveCheckpoint(executionState);

// Load latest checkpoint
const checkpoint = await manager.loadLatestCheckpoint();

// List all checkpoints
const checkpoints = await manager.listCheckpoints();

// Clean old checkpoints
await manager.cleanOldCheckpoints(maxAge);
```

#### RecoveryManager

Handles error recovery and state validation:

```typescript
import { RecoveryManager, loadRecoveryManager } from '@eldrforge/tree-execution';

// Load from checkpoint
const manager = await loadRecoveryManager('./checkpoint.json');

// Validate state
const validation = await manager.validateState();
if (!validation.isValid) {
    console.error('Invalid state:', validation.errors);
}

// Get recovery hints
const hints = manager.getRecoveryHints();
hints.forEach(hint => {
    console.log(`[${hint.type}] ${hint.message}`);
    if (hint.suggestedCommand) {
        console.log(`  Run: ${hint.suggestedCommand}`);
    }
});

// Apply recovery options
await manager.applyRecoveryOptions({
    skipPackages: ['pkg1'],
    retryFailed: true
});

// Resume execution
const resumeConfig = await manager.getResumeConfig();
```

#### Scheduler

Determines execution order based on dependencies:

```typescript
import { Scheduler } from '@eldrforge/tree-execution';

const scheduler = new Scheduler(graph, dependencyChecker);

// Get next packages to execute
const next = scheduler.getNextPackages(
    state,
    resourceMonitor,
    retryAttempts
);

// Check if package can run
const canRun = scheduler.canExecute(packageName, state);
```

#### ResourceMonitor

Tracks available execution slots:

```typescript
import { ResourceMonitor } from '@eldrforge/tree-execution';

const monitor = new ResourceMonitor(maxConcurrency);

// Acquire slot
const success = monitor.acquire();

// Release slot
monitor.release();

// Check availability
if (monitor.isAvailable()) {
    // Can start more tasks
}

// Get metrics
const metrics = monitor.getMetrics();
console.log(`Active: ${metrics.activeCount}, Available: ${metrics.availableSlots}`);
```

#### DependencyChecker

Verifies package dependencies:

```typescript
import { DependencyChecker } from '@eldrforge/tree-execution';

const checker = new DependencyChecker(graph);

// Check if package is ready
const ready = checker.areAllDependenciesCompleted(packageName, state);

// Check if package can run (dependencies not failed)
const canRun = checker.canPackageRun(packageName, state);
```

#### CommandValidator

Validates commands for parallel execution:

```typescript
import { CommandValidator } from '@eldrforge/tree-execution';

const validator = new CommandValidator();

// Validate command
const result = validator.validate('npm test', config);
if (!result.isValid) {
    console.error('Validation failed:', result.errors);
    result.warnings.forEach(w => console.warn(w));
}

// Check if command is safe for parallel execution
const isSafe = validator.isSafeForParallel('npm run build');
```

### Logger Integration

```typescript
import { setLogger, getLogger } from '@eldrforge/tree-execution';

// Set custom logger
setLogger({
    info: (...args) => console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    verbose: (...args) => console.log('[VERBOSE]', ...args),
    debug: (...args) => console.log('[DEBUG]', ...args),
    silly: (...args) => console.log('[SILLY]', ...args)
});

// Get logger
const logger = getLogger();
logger.info('Execution started');
```

## Advanced Usage

### Custom Command Integration

Integrate your own command handlers:

```typescript
import { createTreeExecutor, CommandExecutor } from '@eldrforge/tree-execution';

// Define custom command
class MyTestCommand implements CommandExecutor {
    async execute(config: TreeExecutionConfig, mode?: string) {
        // Custom test logic
        console.log('Running tests with custom logic');
        return { success: true };
    }
}

// Register command
const executor = createTreeExecutor({
    commands: {
        commit: new MyTestCommand()
    }
});

// Execute
await executor.execute({
    tree: {
        directories: ['packages'],
        builtInCommand: 'commit'
    }
});
```

### Conditional Package Execution

Execute only packages matching certain criteria:

```typescript
import { buildDependencyGraph } from '@eldrforge/tree-core';

// Build graph with exclusions
const graph = await buildDependencyGraph(
    ['packages/*/package.json'],
    ['node_modules/**', '**/dist/**']
);

// Filter packages
const filteredGraph = {
    ...graph,
    packages: new Map(
        Array.from(graph.packages.entries())
            .filter(([name, info]) => {
                // Only include packages with tests
                return info.scripts?.test !== undefined;
            })
    )
};

// Execute on filtered graph
const pool = new DynamicTaskPool({
    graph: filteredGraph,
    maxConcurrency: 4,
    command: 'npm test',
    config: {}
});

await pool.execute();
```

### Incremental Execution

Execute only packages with changes since last run:

```typescript
import { getGitStatusSummary } from '@eldrforge/git-tools';
import { findAllDependents } from '@eldrforge/tree-core';

// Get changed packages
const status = await getGitStatusSummary();
const changedFiles = [...status.staged, ...status.modified];
const changedPackages = new Set<string>();

changedFiles.forEach(file => {
    const match = file.match(/packages\/([^\/]+)\//);
    if (match) {
        changedPackages.add(match[1]);
    }
});

// Include all dependents of changed packages
const affectedPackages = new Set<string>();
changedPackages.forEach(pkg => {
    affectedPackages.add(pkg);
    const dependents = findAllDependents(graph, pkg);
    dependents.forEach(dep => affectedPackages.add(dep));
});

// Execute only affected packages
const incrementalGraph = {
    ...graph,
    packages: new Map(
        Array.from(graph.packages.entries())
            .filter(([name]) => affectedPackages.has(name))
    )
};

const pool = new DynamicTaskPool({
    graph: incrementalGraph,
    maxConcurrency: 4,
    command: 'npm run build',
    config: {}
});

await pool.execute();
```

### Progress Dashboard

Build a real-time progress dashboard:

```typescript
import { DynamicTaskPool } from '@eldrforge/tree-execution';

const pool = new DynamicTaskPool(config);

// Track state
const state = {
    total: 0,
    completed: 0,
    failed: 0,
    running: new Set<string>()
};

pool.on('execution:started', ({ totalPackages }) => {
    state.total = totalPackages;
    updateDashboard();
});

pool.on('package:started', ({ packageName }) => {
    state.running.add(packageName);
    updateDashboard();
});

pool.on('package:completed', ({ packageName }) => {
    state.running.delete(packageName);
    state.completed++;
    updateDashboard();
});

pool.on('package:failed', ({ packageName }) => {
    state.running.delete(packageName);
    state.failed++;
    updateDashboard();
});

function updateDashboard() {
    console.clear();
    console.log('=== Execution Dashboard ===');
    console.log(`Total: ${state.total}`);
    console.log(`Completed: ${state.completed}`);
    console.log(`Failed: ${state.failed}`);
    console.log(`Running: ${state.running.size}`);
    console.log(`Progress: ${((state.completed + state.failed) / state.total * 100).toFixed(1)}%`);
    console.log('\nCurrently Running:');
    state.running.forEach(pkg => console.log(`  - ${pkg}`));
}

await pool.execute();
```

### Custom Retry Logic

Implement sophisticated retry strategies:

```typescript
const pool = new DynamicTaskPool({
    graph,
    maxConcurrency: 4,
    command: 'npm test',
    config: {
        tree: {
            retry: {
                maxAttempts: 5,
                initialDelayMs: 500,
                maxDelayMs: 30000,
                backoffMultiplier: 2.5,
                retriableErrors: [
                    'ECONNRESET',
                    'ETIMEDOUT',
                    'ENOTFOUND',
                    'Test failed: flaky_test'
                ]
            }
        }
    }
});

pool.on('package:retry', ({ packageName, attemptNumber, delayMs, error }) => {
    console.log(`Retrying ${packageName} (attempt ${attemptNumber}) after ${delayMs}ms`);
    console.log(`Reason: ${error.message}`);
});

await pool.execute();
```

### Recovery Workflow

Implement a complete recovery workflow:

```typescript
import { loadRecoveryManager } from '@eldrforge/tree-execution';

async function recoverExecution(checkpointPath: string) {
    // Load recovery manager
    const recovery = await loadRecoveryManager(checkpointPath);

    // Validate state
    const validation = await recovery.validateState();
    if (!validation.isValid) {
        console.error('State validation failed:');
        validation.errors.forEach(err => console.error(`  - ${err}`));

        // Apply fixes
        console.log('\nApplying recovery options...');
        await recovery.applyRecoveryOptions({
            skipPackages: validation.suggestedSkips || [],
            retryFailed: true
        });
    }

    // Show recovery hints
    const hints = recovery.getRecoveryHints();
    if (hints.length > 0) {
        console.log('\nRecovery Hints:');
        hints.forEach(hint => {
            console.log(`[${hint.type.toUpperCase()}] ${hint.message}`);
            if (hint.suggestedCommand) {
                console.log(`  Suggested: ${hint.suggestedCommand}`);
            }
        });
    }

    // Get resume configuration
    const resumeConfig = await recovery.getResumeConfig();

    // Resume execution
    const pool = new DynamicTaskPool({
        ...resumeConfig,
        continue: true
    });

    return await pool.execute();
}

// Use it
try {
    const result = await recoverExecution('./checkpoints/publish.json');
    console.log('Recovery successful!');
} catch (error) {
    console.error('Recovery failed:', error);
}
```

## Configuration

### TreeExecutionConfig

Complete configuration interface:

```typescript
interface TreeExecutionConfig {
    // Basic flags
    dryRun?: boolean;
    verbose?: boolean;
    debug?: boolean;

    // Tree-specific configuration
    tree?: {
        // Execution
        directories?: string[];          // Directories to scan for packages
        exclude?: string[];              // Patterns to exclude
        cmd?: string;                    // Command to execute
        builtInCommand?: string;         // Built-in command name
        packageArgument?: string;        // Specific package to execute

        // Parallel execution
        parallel?: boolean;              // Enable parallel execution
        maxConcurrency?: number;         // Max concurrent tasks (default: CPU cores)

        // Retry configuration
        retry?: {
            maxAttempts?: number;              // Max retry attempts (default: 3)
            initialDelayMs?: number;           // Initial delay (default: 1000)
            maxDelayMs?: number;               // Max delay (default: 10000)
            backoffMultiplier?: number;        // Backoff multiplier (default: 2)
            retriableErrors?: string[];        // Retriable error patterns
        };

        // Recovery configuration
        recovery?: {
            checkpointInterval?: 'package' | 'batch';  // Checkpoint frequency
            autoRetry?: boolean;                       // Auto-retry on failure
            continueOnError?: boolean;                 // Continue on errors
        };

        // Monitoring configuration
        monitoring?: {
            showProgress?: boolean;                    // Show progress bar
            showMetrics?: boolean;                     // Show metrics
            logLevel?: 'minimal' | 'normal' | 'verbose'; // Log verbosity
        };

        // Recovery operations
        continue?: boolean;              // Resume from checkpoint
        markCompleted?: string[];        // Mark packages as completed
        skipPackages?: string[];         // Skip specific packages
        retryFailed?: boolean;           // Retry failed packages
        skipFailed?: boolean;            // Skip failed packages
        resetPackage?: string;           // Reset specific package state

        // Advanced options
        startFrom?: string;              // Start from specific package
        stopAt?: string;                 // Stop at specific package
        status?: boolean;                // Show execution status
        validateState?: boolean;         // Validate execution state
        auditBranches?: boolean;         // Audit git branches
    };
}
```

### Environment Variables

Control execution through environment variables:

```bash
# Concurrency
TREE_MAX_CONCURRENCY=4

# Retry configuration
TREE_MAX_RETRIES=3
TREE_RETRY_DELAY=1000
TREE_RETRY_BACKOFF=2

# Checkpoint configuration
TREE_CHECKPOINT_PATH=./checkpoints
TREE_CHECKPOINT_INTERVAL=package

# Logging
TREE_LOG_LEVEL=verbose
TREE_SHOW_METRICS=true
```

## Error Handling & Recovery

### Error Classification

The system classifies errors as retriable or non-retriable:

```typescript
// Retriable errors (will be retried automatically)
const retriableErrors = [
    'ECONNRESET',      // Network connection reset
    'ETIMEDOUT',       // Network timeout
    'ENOTFOUND',       // DNS lookup failed
    'ECONNREFUSED',    // Connection refused
    'Test.*flaky'      // Flaky test patterns
];

// Non-retriable errors (fail immediately)
const nonRetriableErrors = [
    'Syntax Error',    // Code syntax errors
    'Type Error',      // Type errors
    'Build failed',    // Build failures
    'Lint failed'      // Linting failures
];
```

### Handling Failed Packages

```typescript
const result = await pool.execute();

if (!result.success) {
    console.error('Execution failed');

    // Analyze failures
    result.failed.forEach(failure => {
        console.error(`\n${failure.name}:`);
        console.error(`  Error: ${failure.error}`);
        console.error(`  Retriable: ${failure.isRetriable}`);
        console.error(`  Attempts: ${failure.attemptNumber}`);

        if (failure.errorDetails) {
            console.error(`  Type: ${failure.errorDetails.type}`);
            console.error(`  Context: ${failure.errorDetails.context}`);
            if (failure.errorDetails.suggestion) {
                console.error(`  Suggestion: ${failure.errorDetails.suggestion}`);
            }
        }

        // Show affected packages
        console.error(`  Dependents (skipped): ${failure.dependents.join(', ')}`);
    });

    // Save checkpoint for recovery
    const checkpoint = await pool.getCheckpoint();
    await fs.writeFile('./failed-execution.json', JSON.stringify(checkpoint, null, 2));

    console.log('\nCheckpoint saved to failed-execution.json');
    console.log('Resume with: --continue');
}
```

### Recovery Strategies

#### 1. Skip Failed Packages

```typescript
const recovery = await loadRecoveryManager('./checkpoint.json');
await recovery.applyRecoveryOptions({
    skipFailed: true
});
```

#### 2. Retry Failed Packages

```typescript
await recovery.applyRecoveryOptions({
    retryFailed: true
});
```

#### 3. Skip Specific Packages

```typescript
await recovery.applyRecoveryOptions({
    skipPackages: ['problematic-pkg1', 'problematic-pkg2']
});
```

#### 4. Mark Packages as Completed

```typescript
await recovery.applyRecoveryOptions({
    markCompleted: ['manually-fixed-pkg']
});
```

#### 5. Reset Package State

```typescript
await recovery.applyRecoveryOptions({
    resetPackage: 'pkg-to-reset'
});
```

## Real-World Examples

### Example 1: Monorepo Test Suite

Run tests across all packages with intelligent parallelization:

```typescript
import { createTreeExecutor } from '@eldrforge/tree-execution';
import { buildDependencyGraph } from '@eldrforge/tree-core';

async function runMonorepoTests() {
    // Build dependency graph
    const graph = await buildDependencyGraph(['packages/*/package.json']);

    // Create executor
    const executor = createTreeExecutor();

    // Run tests
    const result = await executor.execute({
        verbose: true,
        tree: {
            directories: ['packages'],
            cmd: 'npm test',
            parallel: true,
            maxConcurrency: 4,
            retry: {
                maxAttempts: 2,
                initialDelayMs: 1000,
                retriableErrors: ['Test.*flaky']
            },
            monitoring: {
                showProgress: true,
                showMetrics: true,
                logLevel: 'normal'
            }
        }
    });

    console.log(`\nTests completed: ${result.completed.length}/${result.totalPackages}`);
    return result.success ? 0 : 1;
}

runMonorepoTests().then(code => process.exit(code));
```

### Example 2: Incremental Build System

Build only changed packages and their dependents:

```typescript
import { DynamicTaskPool } from '@eldrforge/tree-execution';
import { buildDependencyGraph, findAllDependents } from '@eldrforge/tree-core';
import { getGitStatusSummary } from '@eldrforge/git-tools';

async function incrementalBuild() {
    // Get changed packages
    const graph = await buildDependencyGraph(['packages/*/package.json']);
    const status = await getGitStatusSummary();

    const changedPackages = new Set<string>();
    [...status.staged, ...status.modified].forEach(file => {
        const match = file.match(/packages\/([^\/]+)\//);
        if (match) changedPackages.add(match[1]);
    });

    // Find all affected packages (changed + dependents)
    const affectedPackages = new Set<string>();
    changedPackages.forEach(pkg => {
        affectedPackages.add(pkg);
        findAllDependents(graph, pkg).forEach(dep => affectedPackages.add(dep));
    });

    console.log(`Changed packages: ${Array.from(changedPackages).join(', ')}`);
    console.log(`Total affected: ${affectedPackages.size}`);

    if (affectedPackages.size === 0) {
        console.log('No packages to build');
        return;
    }

    // Build affected packages
    const filteredGraph = {
        ...graph,
        packages: new Map(
            Array.from(graph.packages).filter(([name]) => affectedPackages.has(name))
        )
    };

    const pool = new DynamicTaskPool({
        graph: filteredGraph,
        maxConcurrency: 4,
        command: 'npm run build',
        config: { tree: { parallel: true } }
    });

    const result = await pool.execute();
    console.log(`\nBuilt ${result.completed.length} packages in ${result.metrics.totalDuration}ms`);
}

incrementalBuild().catch(console.error);
```

### Example 3: Coordinated Package Publishing

Publish packages in dependency order with automatic version tracking:

```typescript
import { DynamicTaskPool, createParallelProgressLogger } from '@eldrforge/tree-execution';
import { buildDependencyGraph } from '@eldrforge/tree-core';

async function publishMonorepo() {
    const graph = await buildDependencyGraph(['packages/*/package.json']);

    const pool = new DynamicTaskPool({
        graph,
        maxConcurrency: 2, // Limit publishing concurrency
        command: 'npm publish',
        config: {
            tree: {
                parallel: true,
                retry: {
                    maxAttempts: 3,
                    initialDelayMs: 2000,
                    retriableErrors: ['ECONNRESET', 'ETIMEDOUT']
                }
            }
        },
        checkpointPath: './checkpoints/publish.json'
    });

    // Create progress logger
    const logger = createParallelProgressLogger(graph.packages.size);

    // Track published versions
    const published: Array<{ name: string; version: string }> = [];

    pool.on('package:started', ({ packageName }) => {
        logger.onPackageStarted(packageName);
    });

    pool.on('package:completed', ({ packageName, result }) => {
        logger.onPackageCompleted(packageName, result);
        if (result.publishedVersion) {
            published.push({
                name: packageName,
                version: result.publishedVersion
            });
        }
    });

    pool.on('package:failed', ({ packageName, error }) => {
        logger.onPackageFailed(packageName, error);
    });

    const result = await pool.execute();

    if (result.success) {
        console.log('\n=== Published Packages ===');
        published.forEach(p => console.log(`${p.name}@${p.version}`));
    } else {
        console.error('\n=== Publish Failed ===');
        console.error('Checkpoint saved for recovery');
        console.error('Resume with: --continue');
    }

    return result;
}

publishMonorepo().catch(console.error);
```

### Example 4: Integration Test Suite

Run integration tests with environment setup/teardown:

```typescript
import { DynamicTaskPool } from '@eldrforge/tree-execution';
import { buildDependencyGraph } from '@eldrforge/tree-core';

async function runIntegrationTests() {
    const graph = await buildDependencyGraph(['services/*/package.json']);

    // Setup: Start shared services
    console.log('Starting shared services...');
    await startDatabase();
    await startRedis();
    await startMessageQueue();

    try {
        const pool = new DynamicTaskPool({
            graph,
            maxConcurrency: 2, // Limit to avoid resource contention
            command: 'npm run test:integration',
            config: {
                tree: {
                    parallel: true,
                    recovery: {
                        continueOnError: false // Stop on first failure
                    }
                }
            }
        });

        pool.on('package:failed', async ({ packageName, error }) => {
            // Cleanup on failure
            console.error(`Test failed: ${packageName}`);
            await pool.abort('Test failure detected');
        });

        const result = await pool.execute();
        return result;

    } finally {
        // Teardown: Stop shared services
        console.log('Stopping shared services...');
        await stopMessageQueue();
        await stopRedis();
        await stopDatabase();
    }
}

// Stub functions for services
async function startDatabase() { /* ... */ }
async function stopDatabase() { /* ... */ }
async function startRedis() { /* ... */ }
async function stopRedis() { /* ... */ }
async function startMessageQueue() { /* ... */ }
async function stopMessageQueue() { /* ... */ }

runIntegrationTests().catch(console.error);
```

### Example 5: Custom Build Pipeline

Implement a multi-stage build pipeline:

```typescript
import { DynamicTaskPool } from '@eldrforge/tree-execution';
import { buildDependencyGraph } from '@eldrforge/tree-core';

async function buildPipeline() {
    const graph = await buildDependencyGraph(['packages/*/package.json']);

    const stages = [
        { name: 'Lint', command: 'npm run lint', concurrency: 8 },
        { name: 'Type Check', command: 'npm run type-check', concurrency: 4 },
        { name: 'Build', command: 'npm run build', concurrency: 4 },
        { name: 'Test', command: 'npm test', concurrency: 4 }
    ];

    for (const stage of stages) {
        console.log(`\n=== Stage: ${stage.name} ===`);

        const pool = new DynamicTaskPool({
            graph,
            maxConcurrency: stage.concurrency,
            command: stage.command,
            config: { tree: { parallel: true } }
        });

        const result = await pool.execute();

        if (!result.success) {
            console.error(`\nStage '${stage.name}' failed`);
            console.error(`Failed packages: ${result.failed.map(f => f.name).join(', ')}`);
            return false;
        }

        console.log(`Stage completed in ${result.metrics.totalDuration}ms`);
    }

    console.log('\n=== Pipeline Complete ===');
    return true;
}

buildPipeline().then(success => {
    process.exit(success ? 0 : 1);
});
```

## Testing

This package includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure

```
tests/
├── checkpoint/
│   └── CheckpointManager.test.ts      # Checkpoint persistence
├── execution/
│   ├── CommandValidator.test.ts       # Command validation
│   ├── DependencyChecker.test.ts      # Dependency checking
│   ├── RecoveryManager.test.ts        # Error recovery
│   ├── ResourceMonitor.test.ts        # Resource tracking
│   └── Scheduler.test.ts              # Task scheduling
├── integration/
│   └── execution-flow.test.ts         # End-to-end tests
├── TreeExecutor.test.ts                # TreeExecutor API
└── util/
    ├── logger.test.ts                  # Logging
    ├── mutex.test.ts                   # Thread safety
    └── treeUtils.test.ts               # Utilities
```

### Coverage Report

- **TreeExecutor**: 94.82%
- **Checkpoint Management**: 85%+
- **Execution Framework**: 60%+
- **Utilities**: 80%+

### Writing Tests

Example test for custom integration:

```typescript
import { describe, it, expect } from 'vitest';
import { createTreeExecutor } from '@eldrforge/tree-execution';
import { buildDependencyGraph } from '@eldrforge/tree-core';

describe('Custom Integration', () => {
    it('should execute custom command', async () => {
        const executor = createTreeExecutor();

        const result = await executor.execute({
            tree: {
                directories: ['test-packages'],
                cmd: 'echo "test"',
                parallel: false
            }
        });

        expect(result).toBeDefined();
    });
});
```

## Architecture

### Component Overview

```
@eldrforge/tree-execution
├── TreeExecutor (High-level API)
│   ├── State management
│   ├── Command injection
│   └── Thread safety
│
├── DynamicTaskPool (Execution engine)
│   ├── Task scheduling
│   ├── Parallel coordination
│   ├── Event emission
│   └── Checkpoint management
│
├── Execution Components
│   ├── Scheduler (Task ordering)
│   ├── ResourceMonitor (Concurrency control)
│   ├── DependencyChecker (Dependency validation)
│   └── CommandValidator (Command validation)
│
├── Recovery Components
│   ├── CheckpointManager (State persistence)
│   └── RecoveryManager (Error recovery)
│
└── Utilities
    ├── Logger (Logging abstraction)
    ├── SimpleMutex (Thread safety)
    └── TreeUtils (Helper functions)
```

### Execution Flow

```
1. Build dependency graph
   └→ @eldrforge/tree-core

2. Initialize DynamicTaskPool
   ├→ Create Scheduler
   ├→ Create ResourceMonitor
   ├→ Create DependencyChecker
   └→ Load checkpoint (if continuing)

3. Execution loop
   ├→ Scheduler selects ready packages
   ├→ ResourceMonitor allocates slots
   ├→ Execute packages in parallel
   ├→ Update state on completion/failure
   ├→ Save checkpoints periodically
   └→ Emit progress events

4. Handle failures
   ├→ Classify errors (retriable/non-retriable)
   ├→ Retry with exponential backoff
   ├→ Skip dependent packages on failure
   └→ Save recovery checkpoint

5. Complete execution
   ├→ Calculate metrics
   ├→ Generate summary
   └→ Return ExecutionResult
```

### Thread Safety

All state mutations are protected by mutexes:

```typescript
import { SimpleMutex } from '@eldrforge/tree-execution';

class StatefulComponent {
    private mutex = new SimpleMutex();
    private state: any = {};

    async updateState(updates: any) {
        await this.mutex.runExclusive(async () => {
            this.state = { ...this.state, ...updates };
        });
    }
}
```

## Dependencies

### Required Dependencies

- **@eldrforge/tree-core**: Dependency graph algorithms
- **@eldrforge/git-tools**: Git operations
- **@eldrforge/shared**: Shared utilities

### Peer Dependencies

These are automatically installed with the above packages:

- Node.js ≥ 18.0.0
- TypeScript ≥ 5.0.0 (for development)

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Code Style**: Follow existing patterns and ESLint rules
2. **Tests**: Add tests for new features
3. **Documentation**: Update README and JSDoc comments
4. **Commits**: Use conventional commit format

```bash
# Setup development environment
git clone https://github.com/grunnverk/tree-execution.git
cd tree-execution
npm install

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```

### Development Scripts

```json
{
  "build": "tsc",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "lint": "eslint 'src/**/*.ts'",
  "clean": "rm -rf dist coverage"
}
```

## License

MIT © Tim O'Brien

## Links

- **GitHub**: https://github.com/grunnverk/tree-execution
- **Issues**: https://github.com/grunnverk/tree-execution/issues
- **npm**: https://www.npmjs.com/package/@eldrforge/tree-execution

## Related Projects

- **@eldrforge/tree-core**: Dependency graph algorithms
- **@eldrforge/git-tools**: Git operations toolkit
- **@eldrforge/shared**: Shared utilities
- **kodrdriv**: Complete monorepo toolkit (uses tree-execution)

---

Built with ❤️ for monorepo orchestration

<!-- Build: 2026-01-15 15:59:12 UTC -->

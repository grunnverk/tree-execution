# @grunnverk/tree-execution - Agentic Guide

## Purpose

Parallel execution framework and tree orchestration for monorepo workflows. Provides task pool management, checkpoint/recovery, and resource monitoring.

## Key Features

- **Parallel Execution** - Execute tasks across dependency graph in parallel
- **Dynamic Task Pool** - Adaptive concurrency based on resources
- **Checkpoint/Recovery** - Save and resume execution state
- **Resource Monitoring** - Track CPU, memory, and disk usage
- **Dependency Validation** - Ensure dependencies are met before execution
- **Progress Tracking** - Real-time execution progress

## Usage

```typescript
import { TreeExecutor, DynamicTaskPool } from '@grunnverk/tree-execution';

// Create executor
const executor = new TreeExecutor({
  maxConcurrency: 4,
  enableCheckpoint: true,
  resourceLimits: {
    maxMemory: 4096,
    maxCpu: 80
  }
});

// Execute tree command
await executor.execute({
  command: 'npm run build',
  packages: graph.getTopologicalOrder()
});

// Resume from checkpoint
await executor.resume('/path/to/checkpoint.json');
```

## Dependencies

- @grunnverk/tree-core - Dependency graph
- @grunnverk/git-tools - Git operations
- @grunnverk/shared - Shared utilities

## Package Structure

```
src/
├── execution/                    # Execution engine
│   ├── TreeExecutionAdapter.ts   # Execution adapter
│   ├── DynamicTaskPool.ts        # Task pool
│   ├── Scheduler.ts              # Task scheduler
│   ├── ResourceMonitor.ts        # Resource monitoring
│   ├── RecoveryManager.ts        # Recovery logic
│   ├── DependencyChecker.ts      # Dependency validation
│   └── CommandValidator.ts       # Command validation
├── checkpoint/                   # Checkpoint management
│   ├── CheckpointManager.ts      # Checkpoint logic
│   └── index.ts
├── util/                         # Utilities
│   ├── treeUtils.ts              # Tree utilities
│   ├── commandStubs.ts           # Command stubs
│   ├── mutex.ts                  # Mutex implementation
│   └── logger.ts                 # Logging
├── types/                        # Type definitions
│   ├── config.ts
│   ├── parallelExecution.ts
│   └── index.ts
├── TreeExecutor.ts               # Main executor
├── tree.ts                       # Tree command
└── index.ts
```

## Key Exports

- `TreeExecutor` - Main execution orchestrator
- `DynamicTaskPool` - Adaptive task pool
- `CheckpointManager` - Checkpoint/recovery
- `ResourceMonitor` - Resource tracking
- `executeTree()` - Execute tree command
- `resumeExecution()` - Resume from checkpoint


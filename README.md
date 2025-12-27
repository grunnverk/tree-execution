# @eldrforge/tree-execution

Parallel execution framework and tree orchestration for monorepo workflows.

## Features

- 🚀 **Parallel Execution** - Run tasks concurrently with dependency awareness
- 🔄 **Smart Scheduling** - Priority-based task scheduling
- 💾 **Checkpoint/Resume** - Save and restore execution state
- 🛡️ **Error Recovery** - Sophisticated error handling and rollback
- 📊 **Progress Tracking** - Real-time execution progress
- 🎯 **Resource Management** - CPU and memory-aware execution
- ⚡ **Retry Logic** - Exponential backoff for transient failures
- 🎭 **Dependency Injection** - Flexible command integration
- 🧪 **Fully Tested** - 140+ tests with excellent coverage

## Installation

```bash
npm install @eldrforge/tree-execution
```

## Usage

### Quick Start - TreeExecutor (Recommended)

```typescript
import { createTreeExecutor } from '@eldrforge/tree-execution';

// Create executor with custom commands
const executor = createTreeExecutor({
    commands: {
        commit: myCommitCommand,
        publish: myPublishCommand
    }
});

// Execute tree command
const result = await executor.execute(config);
```

### Advanced - DynamicTaskPool

```typescript
import { DynamicTaskPool } from '@eldrforge/tree-execution';
import { buildDependencyGraph } from '@eldrforge/tree-core';

// Build dependency graph
const graph = await buildDependencyGraph(packagePaths);

// Create execution pool
const pool = new DynamicTaskPool({
  graph,
  maxConcurrency: 4,
  command: 'npm test',
  config: runConfig
});

// Execute with parallel coordination
const result = await pool.execute();

console.log(`Completed: ${result.completed.length}`);
console.log(`Failed: ${result.failed.length}`);
```

### Custom Logger

```typescript
import { setLogger } from '@eldrforge/tree-execution';

setLogger({
    info: (...args) => myLogger.info(...args),
    error: (...args) => myLogger.error(...args),
    warn: (...args) => myLogger.warn(...args),
    verbose: (...args) => myLogger.verbose(...args),
    debug: (...args) => myLogger.debug(...args),
    silly: (...args) => myLogger.silly(...args)
});
```

## Components

### TreeExecutor (New!)
High-level class-based API with dependency injection. Encapsulates all state management and provides clean integration points.

### DynamicTaskPool
Orchestrates parallel execution with dependency awareness.

### RecoveryManager
Handles error recovery, rollback, and state validation.

### Scheduler
Decides which packages to execute next based on dependencies and resources.

### ResourceMonitor
Tracks available execution slots and resource usage.

### CheckpointManager
Saves and restores execution state for resume capability.

### CommandValidator
Validates commands for parallel execution safety.

### DependencyChecker
Verifies package dependencies and readiness.

## Testing

This package includes 140+ comprehensive tests:

```bash
npm test           # Run tests
npm run test:coverage  # Run with coverage
```

**Test Coverage**:
- TreeExecutor: 94.82%
- Utilities: 80%+
- Execution framework: 60%+

## Dependencies

- `@eldrforge/tree-core` - Dependency graph algorithms
- `@eldrforge/git-tools` - Git operations
- `@eldrforge/shared` - Shared utilities

## License

MIT © Calen Varek


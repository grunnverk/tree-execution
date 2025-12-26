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

## Installation

```bash
npm install @eldrforge/tree-execution
```

## Usage

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

## Components

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

## Dependencies

- `@eldrforge/tree-core` - Dependency graph algorithms
- `@eldrforge/git-tools` - Git operations
- `@eldrforge/shared` - Shared utilities

## License

MIT © Calen Varek


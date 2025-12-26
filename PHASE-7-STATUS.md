# Phase 7: Tree Orchestration - IN PROGRESS

**Date**: December 26, 2025
**Phase**: 7 of 13
**Status**: IN PROGRESS (20% complete)
**Complexity**: VERY HIGH ⚠️

---

## Progress Summary

### ✅ Completed
1. **Copied tree.ts** - 2,859 lines from kodrdriv
2. **Analyzed dependencies** - Documented all imports and requirements
3. **Updated simple imports** - tree-core, logger, mutex
4. **Replaced Config** - Most references changed to TreeExecutionConfig

### 🚧 In Progress
1. **TreeExecutionConfig expansion** - Needs `tree`, `commit`, `release`, `publish` properties
2. **Built-in command refactoring** - Need callback pattern
3. **Missing utilities** - getOutputPath, PerformanceTimer, etc.

### ⏳ Remaining
1. Refactor global state to TreeExecutor class
2. Create TreeExecutionOptions interface
3. Handle all built-in command calls
4. Extract helper functions
5. Fix ~150 TypeScript errors
6. Test and verify

---

## Current Build Status

**TypeScript Errors**: ~150
**Main Issues**:
1. `runConfig.tree.*` - TreeExecutionConfig missing nested config properties
2. Missing imports: RecoveryManager, CommandValidator, TreeExecutionAdapter (in wrong paths)
3. Missing command modules: Commit, Link, Unlink, Updates
4. Missing utilities: getOutputPath, PerformanceTimer, runGitWithLock, etc.
5. Logger.silly method doesn't exist

---

## Key Insights

### 1. TreeExecutionConfig Needs Expansion

The minimal config we created is too minimal. tree.ts expects:
```typescript
runConfig.tree.directories
runConfig.tree.excludePatterns
runConfig.tree.continue
runConfig.tree.checkpointFile
runConfig.commit.*
runConfig.release.*
runConfig.publish.*
// ... many more
```

**Options**:
- A) Expand TreeExecutionConfig to include all these
- B) Make tree.ts accept nested config objects
- C) Flatten the config structure

**Recommendation**: A or B - Expand config to match kodrdriv's structure

### 2. Built-in Commands Are Deeply Integrated

tree.ts doesn't just call commands, it:
- Builds custom configs for each command
- Passes specific flags
- Handles command-specific logic
- Manages state between commands

This is more complex than a simple callback pattern.

### 3. Many Utility Dependencies

tree.ts uses many kodrdriv utilities:
- getOutputPath
- PerformanceTimer
- runGitWithLock
- isInGitRepository
- optimizePrecommitCommand
- recordTestRun
- Branch state management

These need to be extracted, inlined, or made optional.

---

## Refactoring Strategy (Revised)

### Phase 1: Expand TreeExecutionConfig ✅ (Partially Done)

Add all the nested properties tree.ts needs:
```typescript
export interface TreeExecutionConfig {
    // Basic
    debug?: boolean;
    verbose?: boolean;
    dryRun?: boolean;

    // Tree-specific
    tree?: {
        directories?: string[];
        excludePatterns?: string[];
        continue?: boolean;
        checkpointFile?: string;
        maxConcurrency?: number;
        // ... all tree options
    };

    // Command-specific
    commit?: { /* commit options */ };
    release?: { /* release options */ };
    publish?: { /* publish options */ };

    // Other kodrdriv config
    outputDirectory?: string;
    model?: string;
    configDirectory?: string;
    // ... etc
}
```

### Phase 2: Fix Module Paths

Update imports:
```typescript
// Wrong
import { RecoveryManager } from '../execution/RecoveryManager';

// Right
import { RecoveryManager } from './execution/RecoveryManager.js';
```

### Phase 3: Stub Missing Functions

Create stubs for missing utilities:
```typescript
// Inline or stub
const getOutputPath = (config: TreeExecutionConfig) => {
    return config.outputDirectory || DEFAULT_OUTPUT_DIRECTORY;
};

class PerformanceTimer {
    // Simple implementation
}
```

### Phase 4: Handle Built-in Commands

**Option A**: Keep command logic, make it accept callbacks
**Option B**: Extract command logic to separate file
**Option C**: Make tree.ts pure orchestration, move command logic to kodrdriv

**Recommendation**: Start with Option A, refactor later if needed

---

## Time Estimate (Revised)

| Task | Original | Revised | Status |
|------|----------|---------|--------|
| Copy & analyze | 1-2 hours | 1-2 hours | ✅ Done |
| Update imports | 2-3 hours | 2-3 hours | ✅ Done |
| Expand config | - | 2-3 hours | ⏳ Next |
| Fix module paths | - | 1 hour | ⏳ Next |
| Stub utilities | - | 2-3 hours | ⏳ Next |
| Refactor commands | 1 day | 2-3 days | ⏳ Pending |
| Extract helpers | 1 day | 1-2 days | ⏳ Pending |
| Fix build errors | 1-2 days | 2-3 days | ⏳ Pending |
| Test & verify | 1 day | 1-2 days | ⏳ Pending |
| **TOTAL** | **1 week** | **1-2 weeks** | **20% done** |

---

## Next Steps

1. **Expand TreeExecutionConfig** - Add all nested properties
2. **Fix module import paths** - RecoveryManager, CommandValidator, etc.
3. **Stub missing utilities** - getOutputPath, PerformanceTimer, etc.
4. **Add Logger.silly method** - Or remove calls to it
5. **Handle built-in commands** - Create callback pattern or stub
6. **Iterate on build** - Fix errors incrementally

---

## Decision Point

Given the complexity, we have two options:

### Option A: Continue Full Extraction
- Expand TreeExecutionConfig to match kodrdriv
- Extract all utilities
- Refactor built-in command integration
- Time: 1-2 weeks
- Risk: High
- Benefit: Complete standalone package

### Option B: Simplify Scope
- Keep tree.ts in kodrdriv
- Only extract execution framework (already done in Phase 6)
- tree.ts stays as kodrdriv-specific orchestration
- Time: Already done!
- Risk: Low
- Benefit: Simpler, faster, less risky

---

## Recommendation

Given that:
1. Phase 6 already extracted the execution framework (2,407 lines)
2. tree.ts is deeply integrated with kodrdriv commands
3. The refactoring is more complex than anticipated
4. TreeExecutionConfig would need to mirror kodrdriv's full config

**Recommendation**: Consider Option B (keep tree.ts in kodrdriv)

The execution framework (DynamicTaskPool, RecoveryManager, etc.) is already extracted and reusable. tree.ts can stay in kodrdriv as the orchestration layer that uses the extracted framework.

---

**Status**: Paused for decision
**Progress**: 20% complete
**Next**: Decide on Option A (continue) or Option B (simplify)


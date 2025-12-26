# tree.ts Dependency Analysis

**File Size**: 2,859 lines
**Complexity**: VERY HIGH
**Date**: December 26, 2025

---

## Import Analysis

### ✅ KEEP (No Changes Needed)

**Node.js Built-ins**:
- `path`
- `fs/promises`
- `child_process`, `exec`
- `util`

**External Packages (Already Published)**:
- `@eldrforge/git-tools` - run, runSecure, safeJsonParse, validatePackageJson, getGitStatusSummary, getGloballyLinkedPackages, getLinkedDependencies, getLinkCompatibilityProblems
- `@eldrforge/shared` - createStorage
- `@eldrforge/tree-core` - scanForPackageJsonFiles, parsePackageJson, buildDependencyGraph, topologicalSort, shouldExclude, PackageInfo, DependencyGraph

---

## 🔧 REPLACE (Kodrdriv-Specific)

### 1. Logging
**Current**: `import { getLogger } from '../logging';`
**Replace with**: `import { getLogger } from './util/logger.js';`
**Status**: ✅ Already extracted

### 2. Config Type
**Current**: `import { Config } from '../types';`
**Replace with**: `import type { TreeExecutionConfig } from './types/config.js';`
**Status**: ✅ Already extracted

### 3. SimpleMutex
**Current**: `import { SimpleMutex } from '../util/mutex';`
**Replace with**: `import { SimpleMutex } from './util/mutex.js';`
**Status**: ✅ Already extracted

### 4. Dependency Graph
**Current**: `import { ... } from '../util/dependencyGraph';`
**Replace with**: `import { ... } from '@eldrforge/tree-core';`
**Status**: ✅ Already extracted to tree-core

---

## ⚠️ REQUIRES HANDLING

### 1. Built-in Commands (CRITICAL)
**Current**:
```typescript
import * as Commit from './commit';
import * as Link from './link';
import * as Unlink from './unlink';
import * as Updates from './updates';
```

**Solution**: Callback pattern
- tree.ts should accept executePackage callback
- Kodrdriv will inject its command implementations
- TreeExecutionAdapter already has ExecutePackageFunction type

**Action**: Refactor tree.ts to use callback instead of direct imports

### 2. getOutputPath
**Current**: `import { getOutputPath } from '../util/general';`

**Options**:
- A) Extract to tree-execution
- B) Accept as parameter
- C) Inline the function

**Recommendation**: B (parameter) - Make it part of TreeExecutionOptions

### 3. DEFAULT_OUTPUT_DIRECTORY
**Current**: `import { DEFAULT_OUTPUT_DIRECTORY } from '../constants';`

**Solution**: Define locally or accept as parameter
```typescript
const DEFAULT_OUTPUT_DIRECTORY = 'output/kodrdriv';
```

### 4. gitMutex
**Current**: `import { runGitWithLock, isInGitRepository } from '../util/gitMutex';`

**Options**:
- A) Extract to tree-execution
- B) Use git-tools directly (might already have this)
- C) Inline if simple

**Recommendation**: Check if git-tools already has mutex support, otherwise extract

### 5. precommitOptimizations
**Current**: `import { optimizePrecommitCommand, recordTestRun } from '../util/precommitOptimizations';`

**Options**:
- A) Extract to tree-execution
- B) Make optional callbacks
- C) Skip if not critical

**Recommendation**: C (skip for now) - This is optimization, not core functionality

### 6. PerformanceTimer
**Current**: `import { PerformanceTimer } from '../util/performance';`

**Options**:
- A) Extract to tree-execution
- B) Inline simple implementation
- C) Use Date.now() directly

**Recommendation**: B (inline) - Keep it simple

---

## Refactoring Strategy

### Phase 1: Replace Simple Imports
1. ✅ Change `../logging` → `./util/logger.js`
2. ✅ Change `../types` (Config) → `./types/config.js`
3. ✅ Change `../util/mutex` → `./util/mutex.js`
4. ✅ Change `../util/dependencyGraph` → `@eldrforge/tree-core`

### Phase 2: Handle Complex Dependencies
1. Remove built-in command imports → Use callback pattern
2. Inline or parameterize getOutputPath
3. Define DEFAULT_OUTPUT_DIRECTORY locally
4. Handle gitMutex (extract or inline)
5. Remove/skip precommitOptimizations
6. Inline PerformanceTimer

### Phase 3: Refactor Global State
Convert:
```typescript
let publishedVersions: PublishedVersion[] = [];
let executionContext: TreeExecutionContext | null = null;
```

To:
```typescript
export class TreeExecutor {
    private publishedVersions: PublishedVersion[] = [];
    private executionContext: TreeExecutionContext | null = null;
}
```

### Phase 4: Create Options Interface
```typescript
export interface TreeExecutionOptions {
    config: TreeExecutionConfig;
    directories?: string[];
    excludePatterns?: string[];
    executePackage: ExecutePackageFunction;
    outputDirectory?: string;
    // ... other options
}
```

---

## Estimated Impact

| Component | Lines | Complexity | Risk |
|-----------|-------|------------|------|
| Import updates | ~20 | Low | Low |
| Built-in command refactor | ~500 | High | High |
| Global state refactor | ~200 | Medium | Medium |
| Helper functions | ~400 | Medium | Medium |
| Config updates | ~100 | Low | Low |
| **TOTAL** | **~1,220** | **High** | **High** |

---

## Dependencies to Extract/Create

1. ✅ Logger - Already done
2. ✅ Config - Already done
3. ✅ Mutex - Already done
4. ✅ Tree-core - Already published
5. ⬜ gitMutex functions - Need to handle
6. ⬜ PerformanceTimer - Need to inline
7. ⬜ Constants - Need to define locally

---

## Next Steps

1. Start with simple import replacements
2. Define local constants
3. Inline simple utilities
4. Refactor to class-based
5. Add callback pattern for built-in commands
6. Test build incrementally

---

**Status**: Analysis complete
**Ready to proceed**: YES
**Estimated time**: 1 week (as per prompt)


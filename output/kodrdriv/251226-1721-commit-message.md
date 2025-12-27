feat(exports): re-export loadRecoveryManager and parallel progress helpers from execution

Export additional runtime helpers from the execution entry point so consumers can access them directly:

- Re-export loadRecoveryManager alongside RecoveryManager from ./execution/RecoveryManager.js
- Re-export createParallelProgressLogger and formatParallelResult from ./execution/TreeExecutionAdapter.js

This makes the recovery loader and parallel-progress utilities available from src/index.ts for downstream callers without importing deep paths.
feat(exports): re-export loadRecoveryManager and parallel progress helpers from execution

Re-export runtime helpers from the execution entrypoint so consumers can import them from the package root instead of deep paths:

- Add loadRecoveryManager export alongside RecoveryManager (./execution/RecoveryManager.js)
- Re-export createParallelProgressLogger and formatParallelResult from ./execution/TreeExecutionAdapter.js

Makes the recovery loader and parallel-progress utilities available from src/index.ts for downstream callers.
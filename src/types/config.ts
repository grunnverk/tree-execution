/**
 * Minimal configuration for tree execution
 */
export interface TreeExecutionConfig {
    debug?: boolean;
    verbose?: boolean;
    dryRun?: boolean;
    outputDirectory?: string;
    parallel?: boolean;
    maxConcurrency?: number;
    continueOnError?: boolean;
    checkpointFile?: string;
    resume?: boolean;
    noCheckpoint?: boolean;
    interactive?: boolean;
}


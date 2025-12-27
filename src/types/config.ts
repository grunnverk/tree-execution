/**
 * Configuration for tree execution (expanded to match kodrdriv's Config structure)
 */
export interface TreeExecutionConfig {
    // Basic flags
    dryRun?: boolean;
    verbose?: boolean;
    debug?: boolean;
    overrides?: boolean;

    // AI/Model configuration
    model?: string;
    openaiReasoning?: 'low' | 'medium' | 'high';
    openaiMaxOutputTokens?: number;

    // Directories
    contextDirectories?: string[];
    outputDirectory?: string;
    preferencesDirectory?: string;
    configDirectory?: string;

    // Tree-specific configuration
    tree?: {
        directories?: string[];
        exclude?: string[];
        startFrom?: string;
        stopAt?: string;
        cmd?: string;
        builtInCommand?: string;
        continue?: boolean;
        status?: boolean;
        promote?: string;
        packageArgument?: string;
        cleanNodeModules?: boolean;
        externals?: string[];
        // Parallel execution options
        parallel?: boolean;
        maxConcurrency?: number;
        retry?: {
            maxAttempts?: number;
            initialDelayMs?: number;
            maxDelayMs?: number;
            backoffMultiplier?: number;
            retriableErrors?: string[];
        };
        recovery?: {
            checkpointInterval?: 'package' | 'batch';
            autoRetry?: boolean;
            continueOnError?: boolean;
        };
        monitoring?: {
            showProgress?: boolean;
            showMetrics?: boolean;
            logLevel?: 'minimal' | 'normal' | 'verbose';
        };
        // Recovery options
        markCompleted?: string[];
        skipPackages?: string[];
        retryFailed?: boolean;
        skipFailed?: boolean;
        resetPackage?: string;
        statusParallel?: boolean;
        auditBranches?: boolean;
        validateState?: boolean;
    };

    // Command-specific configurations
    commit?: {
        add?: boolean;
        cached?: boolean;
        sendit?: boolean;
        interactive?: boolean;
        amend?: boolean;
        push?: boolean | string;
        messageLimit?: number;
        context?: string;
        direction?: string;
        skipFileCheck?: boolean;
        maxDiffBytes?: number;
        model?: string;
        openaiReasoning?: 'low' | 'medium' | 'high';
        openaiMaxOutputTokens?: number;
        agentic?: boolean;
        maxAgenticIterations?: number;
        allowCommitSplitting?: boolean;
        toolTimeout?: number;
        selfReflection?: boolean;
    };

    release?: {
        from?: string;
        to?: string;
        messageLimit?: number;
        context?: string;
        interactive?: boolean;
        focus?: string;
        maxDiffBytes?: number;
        model?: string;
        openaiReasoning?: 'low' | 'medium' | 'high';
        openaiMaxOutputTokens?: number;
        noMilestones?: boolean;
        fromMain?: boolean;
        currentBranch?: string;
        agentic?: boolean;
        maxAgenticIterations?: number;
        selfReflection?: boolean;
    };

    publish?: {
        mergeMethod?: 'merge' | 'squash' | 'rebase';
        from?: string;
        targetVersion?: string;
        interactive?: boolean;
        skipAlreadyPublished?: boolean;
        forceRepublish?: boolean;
        dependencyUpdatePatterns?: string[];
        scopedDependencyUpdates?: string[];
        requiredEnvVars?: string[];
        linkWorkspacePackages?: boolean;
        unlinkWorkspacePackages?: boolean;
        checksTimeout?: number;
        skipUserConfirmation?: boolean;
        syncTarget?: boolean;
        sendit?: boolean;
        waitForReleaseWorkflows?: boolean;
        releaseWorkflowsTimeout?: number;
        releaseWorkflowNames?: string[];
        targetBranch?: string;
        noMilestones?: boolean;
        fromMain?: boolean;
        skipPrePublishMerge?: boolean;
        updateDeps?: string;
    };

    link?: {
        scopeRoots?: Record<string, string>;
        dryRun?: boolean;
        packageArgument?: string;
        externals?: string[];
    };

    unlink?: {
        scopeRoots?: Record<string, string>;
        workspaceFile?: string;
        dryRun?: boolean;
        cleanNodeModules?: boolean;
        packageArgument?: string;
        externals?: string[];
    };

    development?: {
        targetVersion?: string;
        noMilestones?: boolean;
        tagWorkingBranch?: boolean;
        createRetroactiveTags?: boolean;
        workingTagPrefix?: string;
    };

    updates?: {
        scope?: string;
        directories?: string[];
        interProject?: boolean;
    };

    excludedPatterns?: string[];

    // Stop context configuration
    stopContext?: {
        enabled?: boolean;
        strings?: string[];
        patterns?: {
            regex: string;
            flags?: string;
            description?: string;
        }[];
        caseSensitive?: boolean;
        replacement?: string;
        warnOnFilter?: boolean;
    };

    // Branches configuration
    branches?: Record<string, {
        targetBranch?: string;
        developmentBranch?: boolean;
        version?: {
            type: 'release' | 'prerelease';
            increment?: boolean;
            incrementLevel?: 'patch' | 'minor' | 'major';
            tag?: string;
        };
    }>;

    // Additional properties
    traits?: any; // For cardigantime compatibility
}


export const MODEL_HANDOFF_HEADER = 'Model handoff:';
export const MODEL_HANDOFF_BEGIN = 'KODRDRIV_MODEL_HANDOFF_BEGIN';
export const MODEL_HANDOFF_END = 'KODRDRIV_MODEL_HANDOFF_END';

export interface FailureHandoff {
    runId: string;
    command: string;
    failingPackage?: string;
    phase?: string;
    primaryLogPath: string;
    relatedLogPaths?: string[];
    suggestedPrompt: string;
    remediation?: string[];
    escalation?: string;
}

export const formatFailureHandoffBlock = (handoff: FailureHandoff): string[] => {
    const payload: Record<string, unknown> = {
        run_id: handoff.runId,
        command: handoff.command,
        package: handoff.failingPackage,
        phase: handoff.phase,
        log_path: handoff.primaryLogPath,
        related_logs: handoff.relatedLogPaths || [],
        prompt: handoff.suggestedPrompt,
        remediation: handoff.remediation || [],
        escalation: handoff.escalation
    };

    const lines = [
        MODEL_HANDOFF_BEGIN,
        JSON.stringify(payload),
        MODEL_HANDOFF_HEADER,
        `  run_id: ${handoff.runId}`,
        `  command: ${handoff.command}`,
    ];

    if (handoff.failingPackage) {
        lines.push(`  package: ${handoff.failingPackage}`);
    }
    if (handoff.phase) {
        lines.push(`  phase: ${handoff.phase}`);
    }

    lines.push(`  log_path: ${handoff.primaryLogPath}`);

    if (handoff.relatedLogPaths && handoff.relatedLogPaths.length > 0) {
        lines.push(`  related_logs: ${handoff.relatedLogPaths.join(', ')}`);
    }

    if (handoff.remediation && handoff.remediation.length > 0) {
        lines.push(`  remediation: ${handoff.remediation.join(' | ')}`);
    }
    if (handoff.escalation) {
        lines.push(`  escalation: ${handoff.escalation}`);
    }

    lines.push(`  prompt: ${handoff.suggestedPrompt}`);
    lines.push(MODEL_HANDOFF_END);

    return lines;
};

export const createFailureHandoffPrompt = (
    runId: string,
    logPath: string,
    packageName?: string
): string => {
    const packageSegment = packageName ? ` for package ${packageName}` : '';
    return `Investigate run ${runId}${packageSegment} using log ${logPath}, identify root cause, and continue execution from the correct step.`;
};

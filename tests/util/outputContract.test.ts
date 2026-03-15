import { describe, expect, it } from 'vitest';
import {
    MODEL_HANDOFF_BEGIN,
    MODEL_HANDOFF_END,
    MODEL_HANDOFF_HEADER,
    createFailureHandoffPrompt,
    formatFailureHandoffBlock
} from '../../src/util/outputContract.js';

describe('outputContract', () => {
    it('formats a deterministic model handoff block', () => {
        const lines = formatFailureHandoffBlock({
            runId: 'publish_2026-03-15_12-00-00',
            command: 'kodrdriv publish',
            failingPackage: '@grunnverk/tree-execution',
            phase: 'package-execution',
            primaryLogPath: '/tmp/output/publish.log',
            suggestedPrompt: 'Investigate run...',
            remediation: ['Read manifest', 'Inspect stderr'],
            escalation: 'Escalate with run_id and log_path.'
        });

        expect(lines).toEqual([
            MODEL_HANDOFF_BEGIN,
            '{"run_id":"publish_2026-03-15_12-00-00","command":"kodrdriv publish","package":"@grunnverk/tree-execution","phase":"package-execution","log_path":"/tmp/output/publish.log","related_logs":[],"prompt":"Investigate run...","remediation":["Read manifest","Inspect stderr"],"escalation":"Escalate with run_id and log_path."}',
            MODEL_HANDOFF_HEADER,
            '  run_id: publish_2026-03-15_12-00-00',
            '  command: kodrdriv publish',
            '  package: @grunnverk/tree-execution',
            '  phase: package-execution',
            '  log_path: /tmp/output/publish.log',
            '  remediation: Read manifest | Inspect stderr',
            '  escalation: Escalate with run_id and log_path.',
            '  prompt: Investigate run...',
            MODEL_HANDOFF_END
        ]);
    });

    it('includes related logs when provided', () => {
        const lines = formatFailureHandoffBlock({
            runId: 'run_1',
            command: 'kodrdriv tree publish',
            primaryLogPath: '/tmp/output/run_1/main.log',
            relatedLogPaths: ['/tmp/output/run_1/a.log', '/tmp/output/run_1/b.log'],
            suggestedPrompt: 'Use logs'
        });

        expect(lines).toContain('  related_logs: /tmp/output/run_1/a.log, /tmp/output/run_1/b.log');
        expect(lines[0]).toBe(MODEL_HANDOFF_BEGIN);
        expect(lines[lines.length - 1]).toBe(MODEL_HANDOFF_END);
    });

    it('creates a prompt that references run and log path', () => {
        const prompt = createFailureHandoffPrompt('run_2', '/tmp/output/run_2/pkg.log', '@foo/pkg');
        expect(prompt).toContain('run_2');
        expect(prompt).toContain('/tmp/output/run_2/pkg.log');
        expect(prompt).toContain('@foo/pkg');
    });
});

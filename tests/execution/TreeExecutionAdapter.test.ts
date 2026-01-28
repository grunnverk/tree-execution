import { describe, it, expect } from 'vitest';
import { formatParallelResult } from '../../src/execution/TreeExecutionAdapter.js';

describe('formatParallelResult', () => {
    const mockResult = {
        completed: ['@test/package-a', '@test/package-b'],
        failed: ['@test/package-c'],
        skipped: [],
        skippedNoChanges: [],
        metrics: {
            totalDuration: 65000,
            peakConcurrency: 2
        }
    };

    it('should use "Publish Summary" and "Published" for publish command', () => {
        const formatted = formatParallelResult(mockResult, 'publish');

        expect(formatted).toContain('📊 Publish Summary');
        expect(formatted).toContain('✅ Published (2):');
    });

    it('should use "Execution Summary" and "Completed" for precommit command', () => {
        const formatted = formatParallelResult(mockResult, 'precommit');

        expect(formatted).toContain('📊 Execution Summary');
        expect(formatted).toContain('✅ Completed (2):');
    });

    it('should use "Execution Summary" and "Completed" for build command', () => {
        const formatted = formatParallelResult(mockResult, 'build');

        expect(formatted).toContain('📊 Execution Summary');
        expect(formatted).toContain('✅ Completed (2):');
    });

    it('should use "Execution Summary" when no command is provided', () => {
        const formatted = formatParallelResult(mockResult);

        expect(formatted).toContain('📊 Execution Summary');
        expect(formatted).toContain('✅ Completed (2):');
    });

    it('should include all completed packages', () => {
        const formatted = formatParallelResult(mockResult, 'precommit');

        expect(formatted).toContain('@test/package-a');
        expect(formatted).toContain('@test/package-b');
    });

    it('should include failed packages', () => {
        const formatted = formatParallelResult(mockResult, 'precommit');

        expect(formatted).toContain('❌ Failed (1):');
        expect(formatted).toContain('@test/package-c');
    });

    it('should format duration correctly', () => {
        const formatted = formatParallelResult(mockResult, 'precommit');

        // 65000ms = 1m 5s
        expect(formatted).toContain('Total time: 1m 5s');
    });

    it('should show peak concurrency', () => {
        const formatted = formatParallelResult(mockResult, 'precommit');

        expect(formatted).toContain('Peak concurrency: 2 packages');
    });
});

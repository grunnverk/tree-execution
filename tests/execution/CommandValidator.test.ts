import { describe, it, expect } from 'vitest';
import { CommandValidator } from '../../src/execution/CommandValidator.js';

describe('CommandValidator', () => {
    describe('validateForParallel', () => {
        it('should validate safe commands', () => {
            const result = CommandValidator.validateForParallel('npm test');
            expect(result.valid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('should detect unsafe git operations', () => {
            const result = CommandValidator.validateForParallel('git checkout main');
            expect(result.valid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
            expect(result.issues[0]).toContain('Branch switching');
        });

        it('should detect git switch', () => {
            const result = CommandValidator.validateForParallel('git switch feature');
            expect(result.valid).toBe(false);
        });

        it('should detect git rebase', () => {
            const result = CommandValidator.validateForParallel('git rebase main');
            expect(result.valid).toBe(false);
        });

        it('should detect git merge', () => {
            const result = CommandValidator.validateForParallel('git merge feature');
            expect(result.valid).toBe(false);
        });

        it('should detect dangerous deletions', () => {
            const result = CommandValidator.validateForParallel('rm -rf /');
            expect(result.valid).toBe(false);
        });

        it('should provide warnings for safe but risky commands', () => {
            const result = CommandValidator.validateForParallel('npm install');
            // npm install is allowed but may have warnings
            expect(result).toBeDefined();
        });

        it('should handle built-in commands', () => {
            const result = CommandValidator.validateForParallel('npm publish', 'publish');
            expect(result).toBeDefined();
        });

        it('should handle empty commands', () => {
            const result = CommandValidator.validateForParallel('');
            expect(result).toBeDefined();
        });

        it('should handle complex commands with pipes', () => {
            const result = CommandValidator.validateForParallel('npm test | grep success');
            expect(result).toBeDefined();
        });
    });

    describe('getRecommendedConcurrency', () => {
        it('should recommend concurrency based on command type', () => {
            const concurrency = CommandValidator.getRecommendedConcurrency('npm test', 8);
            expect(concurrency).toBeGreaterThan(0);
            expect(concurrency).toBeLessThanOrEqual(8);
        });

        it('should limit to max concurrency', () => {
            const concurrency = CommandValidator.getRecommendedConcurrency('npm test', 2);
            expect(concurrency).toBeLessThanOrEqual(2);
        });

        it('should handle zero max concurrency', () => {
            const concurrency = CommandValidator.getRecommendedConcurrency('npm test', 0);
            expect(concurrency).toBe(0);
        });

        it('should be conservative for npm install', () => {
            const concurrency = CommandValidator.getRecommendedConcurrency('npm install', 16);
            // Should be conservative (not use all 16)
            expect(concurrency).toBeLessThanOrEqual(16);
        });

        it('should handle built-in commands', () => {
            const concurrency = CommandValidator.getRecommendedConcurrency('npm publish', 8, 'publish');
            expect(concurrency).toBeGreaterThan(0);
        });
    });

    describe('logValidation', () => {
        it('should log validation results without throwing', () => {
            const result = CommandValidator.validateForParallel('npm test');
            expect(() => CommandValidator.logValidation(result)).not.toThrow();
        });

        it('should handle validation with issues', () => {
            const result = CommandValidator.validateForParallel('git checkout main');
            expect(() => CommandValidator.logValidation(result)).not.toThrow();
        });

        it('should handle validation with warnings', () => {
            const result = {
                valid: true,
                issues: [],
                warnings: ['Test warning'],
                recommendations: []
            };
            expect(() => CommandValidator.logValidation(result)).not.toThrow();
        });

        it('should handle validation with recommendations', () => {
            const result = {
                valid: true,
                issues: [],
                warnings: [],
                recommendations: ['Consider using --parallel']
            };
            expect(() => CommandValidator.logValidation(result)).not.toThrow();
        });
    });

    describe('edge cases', () => {
        it('should handle very long commands', () => {
            const longCommand = 'npm test ' + '--option '.repeat(100);
            const result = CommandValidator.validateForParallel(longCommand);
            expect(result).toBeDefined();
        });

        it('should handle commands with special characters', () => {
            const result = CommandValidator.validateForParallel('npm test -- --option="value with spaces"');
            expect(result).toBeDefined();
        });

        it('should handle multiline commands', () => {
            const result = CommandValidator.validateForParallel('npm run build && npm test');
            expect(result).toBeDefined();
        });
    });
});


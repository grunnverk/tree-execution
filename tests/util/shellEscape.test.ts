import { describe, it, expect } from 'vitest';
import { escapeShellArg, buildShellCommand } from '../../src/util/shellEscape.js';

describe('shellEscape', () => {
    describe('escapeShellArg', () => {
        it('should wrap simple strings in single quotes', () => {
            expect(escapeShellArg('hello')).toBe("'hello'");
            expect(escapeShellArg('world')).toBe("'world'");
        });

        it('should handle strings with spaces', () => {
            expect(escapeShellArg('hello world')).toBe("'hello world'");
        });

        it('should escape single quotes', () => {
            expect(escapeShellArg("it's")).toBe("'it'\\''s'");
            expect(escapeShellArg("don't")).toBe("'don'\\''t'");
        });

        it('should handle multiple single quotes', () => {
            expect(escapeShellArg("it's a 'test'")).toBe("'it'\\''s a '\\''test'\\'''");
        });

        it('should prevent variable expansion', () => {
            expect(escapeShellArg('$VAR')).toBe("'$VAR'");
            expect(escapeShellArg('${VAR}')).toBe("'${VAR}'");
        });

        it('should prevent command substitution', () => {
            expect(escapeShellArg('$(whoami)')).toBe("'$(whoami)'");
            expect(escapeShellArg('`whoami`')).toBe("'`whoami`'");
        });

        it('should handle special shell characters', () => {
            expect(escapeShellArg('a;b')).toBe("'a;b'");
            expect(escapeShellArg('a&b')).toBe("'a&b'");
            expect(escapeShellArg('a|b')).toBe("'a|b'");
            expect(escapeShellArg('a>b')).toBe("'a>b'");
            expect(escapeShellArg('a<b')).toBe("'a<b'");
        });

        it('should handle empty string', () => {
            expect(escapeShellArg('')).toBe("''");
        });

        it('should handle newlines and tabs', () => {
            expect(escapeShellArg('hello\nworld')).toBe("'hello\nworld'");
            expect(escapeShellArg('hello\tworld')).toBe("'hello\tworld'");
        });

        it('should handle backslashes', () => {
            expect(escapeShellArg('hello\\world')).toBe("'hello\\world'");
        });

        it('should handle double quotes', () => {
            expect(escapeShellArg('hello "world"')).toBe("'hello \"world\"'");
        });
    });

    describe('buildShellCommand', () => {
        it('should build a simple command', () => {
            expect(buildShellCommand('git', ['status'])).toBe("git 'status'");
        });

        it('should build a command with multiple args', () => {
            expect(buildShellCommand('git', ['commit', '-m', 'test message']))
                .toBe("git 'commit' '-m' 'test message'");
        });

        it('should escape args with special characters', () => {
            expect(buildShellCommand('git', ['commit', '-m', "fix: it's working"]))
                .toBe("git 'commit' '-m' 'fix: it'\\''s working'");
        });

        it('should handle args with spaces', () => {
            expect(buildShellCommand('echo', ['hello world']))
                .toBe("echo 'hello world'");
        });

        it('should prevent injection attacks', () => {
            expect(buildShellCommand('echo', ['$(whoami)']))
                .toBe("echo '$(whoami)'");
            expect(buildShellCommand('echo', ['test; rm -rf /']))
                .toBe("echo 'test; rm -rf /'");
        });

        it('should handle empty args array', () => {
            expect(buildShellCommand('ls', [])).toBe('ls ');
        });
    });
});

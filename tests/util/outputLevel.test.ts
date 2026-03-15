import { describe, expect, it } from 'vitest';
import { determineShowOutputLevel } from '../../src/tree.js';

describe('determineShowOutputLevel', () => {
    it('uses full output for debug mode', () => {
        const result = determineShowOutputLevel({ debug: true }, true, 'kodrdriv publish');
        expect(result).toBe('full');
    });

    it('uses minimal output for verbose mode', () => {
        const result = determineShowOutputLevel({ verbose: true }, false, 'npm test');
        expect(result).toBe('minimal');
    });

    it('uses minimal output by default for built-in publish/commit', () => {
        expect(determineShowOutputLevel({}, true, 'kodrdriv publish')).toBe('minimal');
        expect(determineShowOutputLevel({}, true, 'kodrdriv commit')).toBe('minimal');
    });

    it('uses no command output by default for other commands', () => {
        const result = determineShowOutputLevel({}, false, 'npm run lint');
        expect(result).toBe('none');
    });
});

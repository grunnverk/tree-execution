/**
 * Escapes a string for safe use in shell commands.
 *
 * This function wraps the value in single quotes and escapes any single quotes
 * within the value to prevent shell injection attacks.
 *
 * @param value - The string value to escape
 * @returns The escaped string safe for use in shell commands
 *
 * @example
 * ```ts
 * escapeShellArg("hello world") // Returns: 'hello world'
 * escapeShellArg("it's") // Returns: 'it'\''s'
 * escapeShellArg("$VAR") // Returns: '$VAR' (not expanded)
 * ```
 */
export function escapeShellArg(value: string): string {
    // Wrap in single quotes and escape any single quotes in the value
    // by ending the quote, adding an escaped quote, and starting a new quote
    return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Builds a shell command string with properly escaped arguments.
 *
 * This is a safer alternative to string interpolation when building shell commands.
 *
 * @param command - The base command
 * @param args - Array of argument strings (will be escaped)
 * @returns The complete command string with escaped arguments
 *
 * @example
 * ```ts
 * buildShellCommand("git", ["commit", "-m", "fix: it's working"])
 * // Returns: "git commit -m 'fix: it'\''s working'"
 * ```
 */
export function buildShellCommand(command: string, args: string[]): string {
    const escapedArgs = args.map(arg => escapeShellArg(arg));
    return `${command} ${escapedArgs.join(' ')}`;
}

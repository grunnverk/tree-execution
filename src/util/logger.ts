/**
 * Simple logger interface for tree-execution
 */
export interface Logger {
    info(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    verbose(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    silly(message: string, ...args: any[]): void;
}

/**
 * Check if we're running in MCP server mode.
 * When true, console output must be suppressed as it interferes with the MCP protocol.
 */
function isMcpServerMode(): boolean {
    return process.env.KODRDRIV_MCP_SERVER === 'true';
}

/**
 * Default logger that respects MCP server mode.
 * In MCP mode, all output is suppressed (callers should configure a proper logger via setLogger).
 * Outside MCP mode, logs go to console as usual.
 */
let logger: Logger = {
    info: (...args) => { if (!isMcpServerMode()) console.log(...args); },
    error: (...args) => { if (!isMcpServerMode()) console.error(...args); },
    warn: (...args) => { if (!isMcpServerMode()) console.warn(...args); },
    verbose: () => {},
    debug: () => {},
    silly: () => {} // Most verbose level, disabled by default
};

export function setLogger(newLogger: Logger): void {
    logger = newLogger;
}

export function getLogger(): Logger {
    return logger;
}


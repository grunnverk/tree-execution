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

let logger: Logger = {
    info: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args),
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


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLogger, setLogger, type Logger } from '../../src/util/logger.js';

describe('Logger', () => {
    let originalConsoleLog: typeof console.log;
    let originalConsoleError: typeof console.error;
    let originalConsoleWarn: typeof console.warn;

    beforeEach(() => {
        originalConsoleLog = console.log;
        originalConsoleError = console.error;
        originalConsoleWarn = console.warn;
    });

    describe('default logger', () => {
        it('should get default logger', () => {
            const logger = getLogger();
            expect(logger).toBeDefined();
            expect(logger.info).toBeTypeOf('function');
            expect(logger.error).toBeTypeOf('function');
            expect(logger.warn).toBeTypeOf('function');
            expect(logger.verbose).toBeTypeOf('function');
            expect(logger.debug).toBeTypeOf('function');
            expect(logger.silly).toBeTypeOf('function');
        });

        it('should call console.log for info', () => {
            console.log = vi.fn();
            const logger = getLogger();
            logger.info('test message');
            expect(console.log).toHaveBeenCalledWith('test message');
            console.log = originalConsoleLog;
        });

        it('should call console.error for error', () => {
            console.error = vi.fn();
            const logger = getLogger();
            logger.error('error message');
            expect(console.error).toHaveBeenCalledWith('error message');
            console.error = originalConsoleError;
        });

        it('should call console.warn for warn', () => {
            console.warn = vi.fn();
            const logger = getLogger();
            logger.warn('warning message');
            expect(console.warn).toHaveBeenCalledWith('warning message');
            console.warn = originalConsoleWarn;
        });

        it('should be no-op for verbose', () => {
            const logger = getLogger();
            expect(() => logger.verbose('test')).not.toThrow();
        });

        it('should be no-op for debug', () => {
            const logger = getLogger();
            expect(() => logger.debug('test')).not.toThrow();
        });

        it('should be no-op for silly', () => {
            const logger = getLogger();
            expect(() => logger.silly('test')).not.toThrow();
        });
    });

    describe('custom logger', () => {
        it('should set custom logger', () => {
            const customLogger: Logger = {
                info: vi.fn(),
                error: vi.fn(),
                warn: vi.fn(),
                verbose: vi.fn(),
                debug: vi.fn(),
                silly: vi.fn()
            };

            setLogger(customLogger);
            const logger = getLogger();

            expect(logger).toBe(customLogger);
        });

        it('should use custom logger methods', () => {
            const customLogger: Logger = {
                info: vi.fn(),
                error: vi.fn(),
                warn: vi.fn(),
                verbose: vi.fn(),
                debug: vi.fn(),
                silly: vi.fn()
            };

            setLogger(customLogger);
            const logger = getLogger();

            logger.info('info message');
            logger.error('error message');
            logger.warn('warn message');
            logger.verbose('verbose message');
            logger.debug('debug message');
            logger.silly('silly message');

            expect(customLogger.info).toHaveBeenCalledWith('info message');
            expect(customLogger.error).toHaveBeenCalledWith('error message');
            expect(customLogger.warn).toHaveBeenCalledWith('warn message');
            expect(customLogger.verbose).toHaveBeenCalledWith('verbose message');
            expect(customLogger.debug).toHaveBeenCalledWith('debug message');
            expect(customLogger.silly).toHaveBeenCalledWith('silly message');
        });

        it('should support additional arguments', () => {
            const customLogger: Logger = {
                info: vi.fn(),
                error: vi.fn(),
                warn: vi.fn(),
                verbose: vi.fn(),
                debug: vi.fn(),
                silly: vi.fn()
            };

            setLogger(customLogger);
            const logger = getLogger();

            logger.info('message', { data: 'value' }, 123);
            expect(customLogger.info).toHaveBeenCalledWith('message', { data: 'value' }, 123);
        });
    });

    describe('logger persistence', () => {
        it('should persist custom logger across multiple getLogger calls', () => {
            const customLogger: Logger = {
                info: vi.fn(),
                error: vi.fn(),
                warn: vi.fn(),
                verbose: vi.fn(),
                debug: vi.fn(),
                silly: vi.fn()
            };

            setLogger(customLogger);

            const logger1 = getLogger();
            const logger2 = getLogger();

            expect(logger1).toBe(customLogger);
            expect(logger2).toBe(customLogger);
            expect(logger1).toBe(logger2);
        });
    });
});


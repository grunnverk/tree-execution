import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleMutex } from '../../src/util/mutex.js';

describe('SimpleMutex', () => {
    let mutex: SimpleMutex;

    beforeEach(() => {
        mutex = new SimpleMutex();
    });

    describe('basic operations', () => {
        it('should create a mutex', () => {
            expect(mutex).toBeInstanceOf(SimpleMutex);
            expect(mutex.isLocked()).toBe(false);
            expect(mutex.getQueueLength()).toBe(0);
        });

        it('should lock and unlock', async () => {
            await mutex.lock();
            expect(mutex.isLocked()).toBe(true);

            mutex.unlock();
            expect(mutex.isLocked()).toBe(false);
        });

        it('should queue waiting operations', async () => {
            await mutex.lock();
            expect(mutex.getQueueLength()).toBe(0);

            // Start a second lock (will wait)
            const promise = mutex.lock();
            expect(mutex.getQueueLength()).toBe(1);

            mutex.unlock();
            await promise;
            expect(mutex.isLocked()).toBe(true);
            expect(mutex.getQueueLength()).toBe(0);
        });
    });

    describe('runExclusive', () => {
        it('should run function with exclusive access', async () => {
            let executed = false;
            await mutex.runExclusive(async () => {
                executed = true;
            });
            expect(executed).toBe(true);
        });

        it('should return value from function', async () => {
            const result = await mutex.runExclusive(async () => {
                return 42;
            });
            expect(result).toBe(42);
        });

        it('should work with synchronous functions', async () => {
            const result = await mutex.runExclusive(() => {
                return 'sync';
            });
            expect(result).toBe('sync');
        });

        it('should release lock even if function throws', async () => {
            try {
                await mutex.runExclusive(async () => {
                    throw new Error('Test error');
                });
            } catch (error: any) {
                expect(error.message).toBe('Test error');
            }

            expect(mutex.isLocked()).toBe(false);
        });

        it('should serialize concurrent operations', async () => {
            const order: number[] = [];

            const promises = [
                mutex.runExclusive(async () => {
                    order.push(1);
                    await new Promise(resolve => setTimeout(resolve, 50));
                    order.push(2);
                }),
                mutex.runExclusive(async () => {
                    order.push(3);
                    await new Promise(resolve => setTimeout(resolve, 50));
                    order.push(4);
                }),
                mutex.runExclusive(async () => {
                    order.push(5);
                })
            ];

            await Promise.all(promises);

            // Operations should be serialized: 1,2,3,4,5
            expect(order).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('concurrent access', () => {
        it('should serialize concurrent lock attempts', async () => {
            const results: number[] = [];

            const task = async (id: number) => {
                await mutex.lock();
                results.push(id);
                await new Promise(resolve => setTimeout(resolve, 10));
                mutex.unlock();
            };

            await Promise.all([
                task(1),
                task(2),
                task(3)
            ]);

            expect(results).toHaveLength(3);
            expect(results).toEqual([1, 2, 3]);
        });

        it('should handle many concurrent operations', async () => {
            let counter = 0;
            const increment = async () => {
                await mutex.runExclusive(async () => {
                    const temp = counter;
                    await new Promise(resolve => setTimeout(resolve, 1));
                    counter = temp + 1;
                });
            };

            const promises = Array.from({ length: 100 }, () => increment());
            await Promise.all(promises);

            expect(counter).toBe(100);
        });
    });

    describe('destroy', () => {
        it('should destroy mutex', () => {
            mutex.destroy();
            expect(mutex.isLocked()).toBe(false);
        });

        it('should reject new lock attempts after destroy', async () => {
            mutex.destroy();

            await expect(mutex.lock()).rejects.toThrow('Mutex has been destroyed');
        });

        it('should clear queue on destroy', async () => {
            await mutex.lock();

            // Add some waiting operations
            const p1 = mutex.lock();
            const p2 = mutex.lock();

            expect(mutex.getQueueLength()).toBe(2);

            mutex.destroy();

            expect(mutex.getQueueLength()).toBe(0);
        });
    });

    describe('edge cases', () => {
        it('should handle unlock without lock', () => {
            expect(() => mutex.unlock()).not.toThrow();
        });

        it('should handle multiple unlocks', () => {
            mutex.unlock();
            mutex.unlock();
            expect(mutex.isLocked()).toBe(false);
        });

        it('should handle empty queue', () => {
            expect(mutex.getQueueLength()).toBe(0);
            mutex.unlock();
            expect(mutex.getQueueLength()).toBe(0);
        });
    });
});


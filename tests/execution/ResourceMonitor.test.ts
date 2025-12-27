import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceMonitor } from '../../src/execution/ResourceMonitor.js';

describe('ResourceMonitor', () => {
    let monitor: ResourceMonitor;

    beforeEach(() => {
        monitor = new ResourceMonitor(4); // Max 4 concurrent tasks
    });

    describe('initialization', () => {
        it('should create with max concurrency', () => {
            expect(monitor).toBeInstanceOf(ResourceMonitor);
        });

        it('should start with no running tasks', () => {
            expect(monitor.getAvailableSlots()).toBe(4);
        });
    });

    describe('resource allocation', () => {
        it('should allocate slots', () => {
            const result = monitor.allocate();
            expect(result).toBe(true);
            expect(monitor.getAvailableSlots()).toBe(3);
        });

        it('should allocate multiple slots', () => {
            monitor.allocate();
            monitor.allocate();
            monitor.allocate();
            expect(monitor.getAvailableSlots()).toBe(1);
        });

        it('should not allocate below zero', () => {
            monitor.allocate();
            monitor.allocate();
            monitor.allocate();
            monitor.allocate();
            expect(monitor.getAvailableSlots()).toBe(0);
            
            // Try to allocate when full
            const result = monitor.allocate();
            expect(result).toBe(false);
            expect(monitor.getAvailableSlots()).toBe(0);
        });
    });

    describe('resource release', () => {
        it('should release slots', () => {
            monitor.allocate();
            monitor.allocate();
            expect(monitor.getAvailableSlots()).toBe(2);

            monitor.release();
            expect(monitor.getAvailableSlots()).toBe(3);
        });

        it('should not release above max', () => {
            monitor.release();
            monitor.release();
            expect(monitor.getAvailableSlots()).toBe(4);
        });
    });

    describe('metrics', () => {
        it('should track peak concurrency', () => {
            monitor.allocate();
            monitor.allocate();
            monitor.allocate();
            
            const metrics = monitor.getMetrics();
            expect(metrics.peakConcurrency).toBe(3);
        });

        it('should track total allocations', () => {
            monitor.allocate();
            monitor.release();
            monitor.allocate();
            monitor.allocate();
            
            const metrics = monitor.getMetrics();
            expect(metrics.totalAllocations).toBe(3);
        });

        it('should track total releases', () => {
            monitor.allocate();
            monitor.allocate();
            monitor.release();
            
            const metrics = monitor.getMetrics();
            expect(metrics.totalReleases).toBe(1);
        });

        it('should calculate average concurrency', () => {
            monitor.allocate();
            monitor.allocate();
            monitor.allocate();
            monitor.release();
            monitor.allocate();
            
            const metrics = monitor.getMetrics();
            expect(metrics.averageConcurrency).toBeGreaterThan(0);
        });
    });

    describe('availability', () => {
        it('should report available when slots exist', () => {
            expect(monitor.canAllocate()).toBe(true);
            expect(monitor.isIdle()).toBe(true);
        });

        it('should report not available when full', () => {
            monitor.allocate();
            monitor.allocate();
            monitor.allocate();
            monitor.allocate();
            expect(monitor.canAllocate()).toBe(false);
            expect(monitor.isFullyUtilized()).toBe(true);
        });

        it('should report available after release', () => {
            monitor.allocate();
            monitor.allocate();
            monitor.allocate();
            monitor.allocate();
            expect(monitor.canAllocate()).toBe(false);

            monitor.release();
            expect(monitor.canAllocate()).toBe(true);
            expect(monitor.isFullyUtilized()).toBe(false);
        });

        it('should track utilization percentage', () => {
            expect(monitor.getUtilization()).toBe(0);
            
            monitor.allocate();
            monitor.allocate();
            expect(monitor.getUtilization()).toBe(50);
            
            monitor.allocate();
            monitor.allocate();
            expect(monitor.getUtilization()).toBe(100);
        });
    });

    describe('concurrent operations', () => {
        it('should handle rapid allocation and release', () => {
            for (let i = 0; i < 100; i++) {
                monitor.allocate();
                monitor.release();
            }
            
            expect(monitor.getAvailableSlots()).toBe(4);
            const metrics = monitor.getMetrics();
            expect(metrics.totalAllocations).toBe(100);
            expect(metrics.totalReleases).toBe(100);
        });

        it('should maintain consistency', () => {
            // Simulate concurrent tasks
            monitor.allocate(); // Task 1
            monitor.allocate(); // Task 2
            expect(monitor.getAvailableSlots()).toBe(2);

            monitor.release(); // Task 1 completes
            monitor.allocate(); // Task 3
            expect(monitor.getAvailableSlots()).toBe(2);

            monitor.release(); // Task 2 completes
            monitor.release(); // Task 3 completes
            expect(monitor.getAvailableSlots()).toBe(4);
        });
    });

    describe('edge cases', () => {
        it('should handle zero max concurrency', () => {
            const zeroMonitor = new ResourceMonitor(0);
            expect(zeroMonitor.getAvailableSlots()).toBe(0);
            expect(zeroMonitor.canAllocate()).toBe(false);
            // With 0 max concurrency, 0 >= 0, so it's technically "fully utilized"
            expect(zeroMonitor.isFullyUtilized()).toBe(true);
            expect(zeroMonitor.isIdle()).toBe(true);
        });

        it('should handle single concurrency', () => {
            const singleMonitor = new ResourceMonitor(1);
            expect(singleMonitor.getAvailableSlots()).toBe(1);
            
            singleMonitor.allocate();
            expect(singleMonitor.canAllocate()).toBe(false);
            expect(singleMonitor.isFullyUtilized()).toBe(true);
            
            singleMonitor.release();
            expect(singleMonitor.canAllocate()).toBe(true);
            expect(singleMonitor.isIdle()).toBe(true);
        });

        it('should handle large concurrency', () => {
            const largeMonitor = new ResourceMonitor(1000);
            expect(largeMonitor.getAvailableSlots()).toBe(1000);
            
            for (let i = 0; i < 500; i++) {
                largeMonitor.allocate();
            }
            
            expect(largeMonitor.getAvailableSlots()).toBe(500);
        });
    });
});


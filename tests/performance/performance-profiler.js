/**
 * Performance Testing Framework
 * Comprehensive performance benchmarking and optimization tools
 */

export class PerformanceProfiler {
    constructor() {
        this.benchmarks = new Map();
        this.memorySnapshots = [];
        this.eventMetrics = new Map();
        this.frameMetrics = [];
        this.isRunning = false;
        
        // Performance thresholds
        this.thresholds = {
            frameTime: 16.67, // 60fps = 16.67ms per frame
            eventDispatchTime: 1.0, // 1ms max for event dispatch
            memoryGrowthRate: 0.1, // 10% memory growth max
            stateUpdateTime: 0.5 // 0.5ms max for state updates
        };
    }

    /**
     * Start performance profiling
     */
    startProfiling() {
        this.isRunning = true;
        this.startTime = performance.now();
        this.memorySnapshots = [];
        this.frameMetrics = [];
        this.eventMetrics.clear();
        
        // Start memory monitoring
        this.memoryInterval = setInterval(() => {
            this.captureMemorySnapshot();
        }, 1000);
        
        console.log('🚀 Performance profiling started');
    }

    /**
     * Stop performance profiling
     */
    stopProfiling() {
        this.isRunning = false;
        this.endTime = performance.now();
        
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
        }
        
        console.log('⏹️ Performance profiling stopped');
        return this.generateReport();
    }

    /**
     * Benchmark a function
     */
    benchmark(name, fn, iterations = 1000) {
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            fn();
            const end = performance.now();
            times.push(end - start);
        }
        
        const total = times.reduce((a, b) => a + b, 0);
        const results = {
            name,
            iterations,
            total: total,
            average: total / times.length,
            min: Math.min(...times),
            max: Math.max(...times),
            median: this.calculateMedian(times),
            p95: this.calculatePercentile(times, 95),
            p99: this.calculatePercentile(times, 99)
        };
        
        this.benchmarks.set(name, results);
        return results;
    }

    /**
     * Measure event dispatch performance
     */
    measureEventDispatch(eventDispatcher, eventName, data = {}, iterations = 100) {
        const listeners = [];
        
        // Add test listeners
        for (let i = 0; i < 10; i++) {
            const listener = () => { /* test listener */ };
            eventDispatcher.on(eventName, listener);
            listeners.push(listener);
        }
        
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            eventDispatcher.emit(eventName, data);
            const end = performance.now();
            times.push(end - start);
        }
        
        // Clean up listeners
        listeners.forEach(listener => {
            eventDispatcher.off(eventName, listener);
        });
        
        const results = {
            eventName,
            iterations,
            listeners: listeners.length,
            averageTime: times.reduce((a, b) => a + b, 0) / times.length,
            maxTime: Math.max(...times),
            p95Time: this.calculatePercentile(times, 95),
            p99Time: this.calculatePercentile(times, 99)
        };
        
        this.eventMetrics.set(eventName, results);
        return results;
    }

    /**
     * Measure frame performance
     */
    measureFrame(frameCallback) {
        const frameStart = performance.now();
        
        try {
            frameCallback();
        } catch (error) {
            console.error('Frame callback error:', error);
        }
        
        const frameEnd = performance.now();
        const frameTime = frameEnd - frameStart;
        
        this.frameMetrics.push({
            timestamp: frameStart,
            frameTime,
            fps: 1000 / frameTime,
            exceeded: frameTime > this.thresholds.frameTime
        });
        
        return { frameTime, fps: 1000 / frameTime };
    }

    /**
     * Capture memory snapshot
     */
    captureMemorySnapshot() {
        if (typeof performance.memory !== 'undefined') {
            this.memorySnapshots.push({
                timestamp: performance.now(),
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            });
        }
    }

    /**
     * Measure DOM operations performance
     */
    measureDOMOperations(operations) {
        const results = {};
        
        for (const [name, operation] of Object.entries(operations)) {
            const times = [];
            
            for (let i = 0; i < 100; i++) {
                const start = performance.now();
                operation();
                const end = performance.now();
                times.push(end - start);
            }
            
            results[name] = {
                average: times.reduce((a, b) => a + b, 0) / times.length,
                max: Math.max(...times),
                min: Math.min(...times)
            };
        }
        
        return results;
    }

    /**
     * Analyze event listener performance
     */
    analyzeEventListeners(eventDispatcher) {
        const analysis = {
            totalListeners: 0,
            eventsWithListeners: 0,
            averageListenersPerEvent: 0,
            maxListenersPerEvent: 0,
            memoryImpact: 0
        };
        
        if (eventDispatcher.listeners) {
            const listenerCounts = [];
            
            for (const [eventName, listeners] of eventDispatcher.listeners) {
                const count = Array.isArray(listeners) ? listeners.length : 1;
                listenerCounts.push(count);
                analysis.totalListeners += count;
                analysis.eventsWithListeners++;
                analysis.maxListenersPerEvent = Math.max(analysis.maxListenersPerEvent, count);
            }
            
            analysis.averageListenersPerEvent = analysis.totalListeners / analysis.eventsWithListeners || 0;
            analysis.memoryImpact = analysis.totalListeners * 200; // Estimated bytes per listener
        }
        
        return analysis;
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const report = {
            duration: this.endTime - this.startTime,
            timestamp: new Date().toISOString(),
            benchmarks: Object.fromEntries(this.benchmarks),
            eventMetrics: Object.fromEntries(this.eventMetrics),
            frameAnalysis: this.analyzeFramePerformance(),
            memoryAnalysis: this.analyzeMemoryUsage(),
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }

    /**
     * Analyze frame performance
     */
    analyzeFramePerformance() {
        if (this.frameMetrics.length === 0) return null;
        
        const frameTimes = this.frameMetrics.map(m => m.frameTime);
        const fps = this.frameMetrics.map(m => m.fps);
        const droppedFrames = this.frameMetrics.filter(m => m.exceeded).length;
        
        return {
            totalFrames: this.frameMetrics.length,
            droppedFrames,
            droppedFrameRate: (droppedFrames / this.frameMetrics.length) * 100,
            averageFrameTime: frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length,
            averageFPS: fps.reduce((a, b) => a + b, 0) / fps.length,
            maxFrameTime: Math.max(...frameTimes),
            minFrameTime: Math.min(...frameTimes),
            p95FrameTime: this.calculatePercentile(frameTimes, 95),
            p99FrameTime: this.calculatePercentile(frameTimes, 99)
        };
    }

    /**
     * Analyze memory usage
     */
    analyzeMemoryUsage() {
        if (this.memorySnapshots.length === 0) return null;
        
        const usedMemory = this.memorySnapshots.map(s => s.usedJSHeapSize);
        const totalMemory = this.memorySnapshots.map(s => s.totalJSHeapSize);
        
        return {
            initialMemory: usedMemory[0],
            finalMemory: usedMemory[usedMemory.length - 1],
            memoryGrowth: usedMemory[usedMemory.length - 1] - usedMemory[0],
            memoryGrowthRate: ((usedMemory[usedMemory.length - 1] - usedMemory[0]) / usedMemory[0]) * 100,
            peakMemory: Math.max(...usedMemory),
            averageMemory: usedMemory.reduce((a, b) => a + b, 0) / usedMemory.length,
            snapshots: this.memorySnapshots.length
        };
    }

    /**
     * Generate optimization recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Frame performance recommendations
        const frameAnalysis = this.analyzeFramePerformance();
        if (frameAnalysis && frameAnalysis.droppedFrameRate > 5) {
            recommendations.push({
                type: 'performance',
                severity: 'high',
                message: `${frameAnalysis.droppedFrameRate.toFixed(1)}% frame drops detected. Consider optimizing game loop.`,
                suggestion: 'Use requestAnimationFrame throttling or reduce computational complexity.'
            });
        }
        
        // Memory recommendations
        const memoryAnalysis = this.analyzeMemoryUsage();
        if (memoryAnalysis && memoryAnalysis.memoryGrowthRate > 10) {
            recommendations.push({
                type: 'memory',
                severity: 'medium',
                message: `Memory growth rate of ${memoryAnalysis.memoryGrowthRate.toFixed(1)}% detected.`,
                suggestion: 'Check for memory leaks in event listeners or object references.'
            });
        }
        
        // Event performance recommendations
        for (const [eventName, metrics] of this.eventMetrics) {
            if (metrics.averageTime > this.thresholds.eventDispatchTime) {
                recommendations.push({
                    type: 'events',
                    severity: 'medium',
                    message: `Event '${eventName}' dispatch time ${metrics.averageTime.toFixed(2)}ms exceeds threshold.`,
                    suggestion: 'Consider event batching or reducing listener complexity.'
                });
            }
        }
        
        return recommendations;
    }

    /**
     * Calculate median value
     */
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    /**
     * Calculate percentile
     */
    calculatePercentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }

    /**
     * Export results to JSON
     */
    exportResults() {
        const report = this.generateReport();
        const jsonReport = JSON.stringify(report, null, 2);
        
        if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
            // Browser environment
            const blob = new Blob([jsonReport], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `performance-report-${Date.now()}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
        } else if (typeof require !== 'undefined') {
            // Node.js environment
            const fs = require('fs');
            const fileName = `performance-report-${Date.now()}.json`;
            fs.writeFileSync(fileName, jsonReport, 'utf8');
            console.log(`Performance report saved to ${fileName}`);
        } else {
            // Fallback: just log the report
            console.error('Unable to export results: No suitable environment detected.');
            console.log('Performance Report:', jsonReport);
        }
    }
}

// Export singleton instance
export const performanceProfiler = new PerformanceProfiler();

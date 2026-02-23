import { useState, useEffect, useCallback, useRef } from 'react';
import keystrokeMetricsService from '../services/KeystrokeMetricsService';

/**
 * useKeystrokeTracker - React hook for keystroke psychometric tracking
 *
 * Usage:
 * const { metrics, handlers, startTracking, stopTracking, recordMessage } = useKeystrokeTracker();
 *
 * <input
 *   onKeyDown={handlers.onKeyDown}
 *   onKeyUp={handlers.onKeyUp}
 *   onFocus={handlers.onFocus}
 *   onBlur={handlers.onBlur}
 * />
 */
export function useKeystrokeTracker(options = {}) {
    const {
        autoStart = true,
        updateInterval = 1000, // Update metrics every second
        onMetricsUpdate = null,
    } = options;

    const [metrics, setMetrics] = useState(keystrokeMetricsService.getSessionMetrics());
    const [historicalMetrics, setHistoricalMetrics] = useState(keystrokeMetricsService.getHistoricalMetrics());
    const [isTracking, setIsTracking] = useState(false);
    const [behaviorAnalysis, setBehaviorAnalysis] = useState(null);

    const updateIntervalRef = useRef(null);

    // Update metrics periodically
    const updateMetrics = useCallback(() => {
        const current = keystrokeMetricsService.getSessionMetrics();
        const historical = keystrokeMetricsService.getHistoricalMetrics();
        const behavior = keystrokeMetricsService.getTypingBehaviorAnalysis();

        setMetrics(current);
        setHistoricalMetrics(historical);
        setBehaviorAnalysis(behavior);

        if (onMetricsUpdate) {
            onMetricsUpdate({ current, historical, behavior });
        }
    }, [onMetricsUpdate]);

    // Start tracking
    const startTracking = useCallback(() => {
        keystrokeMetricsService.startSession();
        setIsTracking(true);

        // Set up periodic updates
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
        }
        updateIntervalRef.current = setInterval(updateMetrics, updateInterval);
    }, [updateMetrics, updateInterval]);

    // Stop tracking and get final metrics
    const stopTracking = useCallback(() => {
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
        }

        const finalMetrics = keystrokeMetricsService.endSession();
        setIsTracking(false);
        updateMetrics();

        return finalMetrics;
    }, [updateMetrics]);

    // Record a message being sent
    const recordMessage = useCallback(() => {
        keystrokeMetricsService.recordMessageSent();
        const finalMetrics = stopTracking();

        // Auto-restart for next message
        if (autoStart) {
            setTimeout(startTracking, 100);
        }

        return finalMetrics;
    }, [stopTracking, startTracking, autoStart]);

    // Event handlers
    const handleKeyDown = useCallback((event) => {
        if (!isTracking && autoStart) {
            startTracking();
        }
        keystrokeMetricsService.onKeyDown(event);
        updateMetrics();
    }, [isTracking, autoStart, startTracking, updateMetrics]);

    const handleKeyUp = useCallback((event) => {
        keystrokeMetricsService.onKeyUp(event);
    }, []);

    const handleFocus = useCallback(() => {
        if (autoStart && !isTracking) {
            startTracking();
        }
    }, [autoStart, isTracking, startTracking]);

    const handleBlur = useCallback(() => {
        // Don't stop on blur, just update metrics
        updateMetrics();
    }, [updateMetrics]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
            }
        };
    }, []);

    // Get full report
    const getFullReport = useCallback(() => {
        return keystrokeMetricsService.getFullReport();
    }, []);

    // Reset all metrics
    const resetMetrics = useCallback(() => {
        keystrokeMetricsService.resetMetrics();
        updateMetrics();
    }, [updateMetrics]);

    return {
        // Current session metrics
        metrics,
        // Historical metrics (across sessions)
        historicalMetrics,
        // Behavior analysis
        behaviorAnalysis,
        // Tracking state
        isTracking,
        // Event handlers to attach to input
        handlers: {
            onKeyDown: handleKeyDown,
            onKeyUp: handleKeyUp,
            onFocus: handleFocus,
            onBlur: handleBlur,
        },
        // Control functions
        startTracking,
        stopTracking,
        recordMessage,
        getFullReport,
        resetMetrics,
    };
}

export default useKeystrokeTracker;

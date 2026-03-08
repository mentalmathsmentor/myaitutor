import { useState, useEffect, useCallback, useRef } from 'react';
import keystrokeMetricsService from '../services/KeystrokeMetricsService';

/**
 * useKeystrokeTracker - React hook for keystroke psychometric tracking
 *
 * Usage:
 * const { metrics, historicalMetrics, behaviorAnalysis, attachToInput } = useKeystrokeTracker({
 *   studentId: 'student_123',
 *   isDemoMode: false,
 * });
 *
 * <input {...attachToInput()} value={input} onChange={...} />
 */
export function useKeystrokeTracker(options = {}) {
    const {
        autoStart = true,
        updateInterval = 1000,
        submitInterval = 30000, // Submit metrics every 30 seconds
        onMetricsUpdate = null,
        studentId = null,
        isDemoMode = false,
    } = options;

    const [metrics, setMetrics] = useState(keystrokeMetricsService.getSessionMetrics());
    const [historicalMetrics, setHistoricalMetrics] = useState(keystrokeMetricsService.getHistoricalMetrics());
    const [isTracking, setIsTracking] = useState(false);
    const [behaviorAnalysis, setBehaviorAnalysis] = useState(null);

    const updateIntervalRef = useRef(null);
    const submitIntervalRef = useRef(null);
    const studentIdRef = useRef(studentId);
    const isDemoModeRef = useRef(isDemoMode);

    // Keep refs in sync
    useEffect(() => {
        studentIdRef.current = studentId;
    }, [studentId]);

    useEffect(() => {
        isDemoModeRef.current = isDemoMode;
    }, [isDemoMode]);

    // Update metrics from the service (local state refresh)
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

    // Submit metrics to the backend (skipped in demo mode)
    const submitToBackend = useCallback(async () => {
        if (isDemoModeRef.current || !studentIdRef.current) return;

        const current = keystrokeMetricsService.getSessionMetrics();
        // Only submit if there's meaningful data
        if (current.keystrokeCount === 0 && current.charactersTyped === 0) return;

        const result = await keystrokeMetricsService.submitMetrics(studentIdRef.current, current);
        if (result && result.profile) {
            // Merge backend profile into local historical metrics
            const profile = result.profile;
            setHistoricalMetrics(prev => ({
                ...prev,
                totalSessions: profile.total_sessions || prev.totalSessions,
                averageWPM: profile.average_wpm || prev.averageWPM,
                averageDwellTime: profile.average_dwell_time_ms || prev.averageDwellTime,
                averageFlightTime: profile.average_flight_time_ms || prev.averageFlightTime,
                averageThinkingTime: profile.average_thinking_time_ms || prev.averageThinkingTime,
                totalCharactersTyped: profile.total_characters_typed || prev.totalCharactersTyped,
                totalErrorCorrections: profile.total_error_corrections || prev.totalErrorCorrections,
                messageFrequencyPerMinute: profile.message_frequency_per_minute || prev.messageFrequencyPerMinute,
                typingRhythmVariance: profile.typing_rhythm_variance || prev.typingRhythmVariance,
            }));

            // Update behavior analysis from backend categories
            if (profile.typing_speed_category) {
                setBehaviorAnalysis(prev => ({
                    ...(prev || {}),
                    typingSpeed: profile.typing_speed_category,
                    consistency: profile.consistency_category,
                    thinkingPattern: profile.thinking_pattern,
                    errorTendency: profile.error_tendency,
                }));
            }
        }
    }, []);

    // Fetch historical profile from backend on mount
    useEffect(() => {
        if (isDemoMode || !studentId) return;

        const fetchProfile = async () => {
            const data = await keystrokeMetricsService.getProfile(studentId);
            if (data && data.profile) {
                const profile = data.profile;
                setHistoricalMetrics(prev => ({
                    ...prev,
                    totalSessions: profile.total_sessions || 0,
                    averageWPM: profile.average_wpm || 0,
                    averageDwellTime: profile.average_dwell_time_ms || 0,
                    averageFlightTime: profile.average_flight_time_ms || 0,
                    averageThinkingTime: profile.average_thinking_time_ms || 0,
                    totalCharactersTyped: profile.total_characters_typed || 0,
                    totalErrorCorrections: profile.total_error_corrections || 0,
                    messageFrequencyPerMinute: profile.message_frequency_per_minute || 0,
                    typingRhythmVariance: profile.typing_rhythm_variance || 0,
                }));

                if (profile.typing_speed_category && profile.typing_speed_category !== 'unknown') {
                    setBehaviorAnalysis({
                        typingSpeed: profile.typing_speed_category,
                        consistency: profile.consistency_category,
                        thinkingPattern: profile.thinking_pattern,
                        errorTendency: profile.error_tendency,
                    });
                }
            }
        };

        fetchProfile();
    }, [studentId, isDemoMode]);

    // Start tracking
    const startTracking = useCallback(() => {
        keystrokeMetricsService.startSession();
        setIsTracking(true);

        // Set up periodic metric updates (local)
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
        }
        updateIntervalRef.current = setInterval(updateMetrics, updateInterval);

        // Set up periodic backend submission
        if (submitIntervalRef.current) {
            clearInterval(submitIntervalRef.current);
        }
        submitIntervalRef.current = setInterval(submitToBackend, submitInterval);
    }, [updateMetrics, updateInterval, submitToBackend, submitInterval]);

    // Stop tracking and get final metrics
    const stopTracking = useCallback(() => {
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
        }
        if (submitIntervalRef.current) {
            clearInterval(submitIntervalRef.current);
            submitIntervalRef.current = null;
        }

        const finalMetrics = keystrokeMetricsService.endSession();
        setIsTracking(false);
        updateMetrics();

        return finalMetrics;
    }, [updateMetrics]);

    // Record a message being sent: submit to backend, reset session, restart tracking
    const recordMessage = useCallback(async () => {
        keystrokeMetricsService.recordMessageSent();
        const finalMetrics = stopTracking();

        // Submit to backend on message send
        await submitToBackend();

        // Auto-restart for next message
        if (autoStart) {
            setTimeout(startTracking, 100);
        }

        return finalMetrics;
    }, [stopTracking, startTracking, autoStart, submitToBackend]);

    // Reset all metrics (clears local + does NOT reset backend)
    const reset = useCallback(() => {
        keystrokeMetricsService.resetMetrics();
        updateMetrics();
    }, [updateMetrics]);

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

    /**
     * Returns props to spread onto an input element for tracking.
     * Usage: <input {...attachToInput()} />
     */
    const attachToInput = useCallback(() => ({
        onKeyDown: handleKeyDown,
        onKeyUp: handleKeyUp,
        onFocus: handleFocus,
        onBlur: handleBlur,
    }), [handleKeyDown, handleKeyUp, handleFocus, handleBlur]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
            }
            if (submitIntervalRef.current) {
                clearInterval(submitIntervalRef.current);
            }
        };
    }, []);

    // Get full report
    const getFullReport = useCallback(() => {
        return keystrokeMetricsService.getFullReport();
    }, []);

    return {
        // Current session metrics
        metrics,
        // Historical metrics (across sessions, merged with backend)
        historicalMetrics,
        // Behavior analysis
        behaviorAnalysis,
        // Tracking state
        isTracking,
        // Event handlers to attach to input (legacy approach)
        handlers: {
            onKeyDown: handleKeyDown,
            onKeyUp: handleKeyUp,
            onFocus: handleFocus,
            onBlur: handleBlur,
        },
        // Spread-friendly function for input attachment
        attachToInput,
        // Control functions
        startTracking,
        stopTracking,
        recordMessage,
        getFullReport,
        reset,
        resetMetrics: reset,
    };
}

export default useKeystrokeTracker;

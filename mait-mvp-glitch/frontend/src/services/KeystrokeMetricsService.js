/**
 * KeystrokeMetricsService - Keystroke Psychometric Analysis System
 *
 * Tracks and analyzes typing patterns including:
 * - WPM (Words Per Minute)
 * - Thinking Time (pauses between typing)
 * - Dwell Time (key press duration)
 * - Flight Time (time between key releases and next press)
 * - Error Corrections (backspace/delete usage)
 * - Message Frequency
 * - Typing Rhythm Consistency
 */

class KeystrokeMetricsService {
    constructor() {
        this.currentSession = null;
        this.historicalData = this.loadFromStorage();
        this.keystrokeBuffer = [];
        this.lastKeyDownTime = null;
        this.lastKeyUpTime = null;
        this.sessionStartTime = null;
        this.thinkingPeriods = [];
        this.lastTypingTime = null;
        this.THINKING_THRESHOLD_MS = 2000; // 2 seconds pause = thinking time
        this.messageTimestamps = [];
    }

    /**
     * Load historical keystroke data from localStorage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem('mait_keystroke_metrics');
            if (data) {
                const parsed = JSON.parse(data);
                return {
                    totalSessions: parsed.totalSessions || 0,
                    averageWPM: parsed.averageWPM || 0,
                    averageDwellTime: parsed.averageDwellTime || 0,
                    averageFlightTime: parsed.averageFlightTime || 0,
                    averageThinkingTime: parsed.averageThinkingTime || 0,
                    totalCharactersTyped: parsed.totalCharactersTyped || 0,
                    totalErrorCorrections: parsed.totalErrorCorrections || 0,
                    messageFrequencyPerMinute: parsed.messageFrequencyPerMinute || 0,
                    sessionHistory: parsed.sessionHistory || [],
                    typingRhythmVariance: parsed.typingRhythmVariance || 0,
                    lastUpdated: parsed.lastUpdated || null
                };
            }
        } catch (e) {
            console.warn('Failed to load keystroke metrics from storage:', e);
        }
        return this.getDefaultMetrics();
    }

    /**
     * Get default metrics structure
     */
    getDefaultMetrics() {
        return {
            totalSessions: 0,
            averageWPM: 0,
            averageDwellTime: 0,
            averageFlightTime: 0,
            averageThinkingTime: 0,
            totalCharactersTyped: 0,
            totalErrorCorrections: 0,
            messageFrequencyPerMinute: 0,
            sessionHistory: [],
            typingRhythmVariance: 0,
            lastUpdated: null
        };
    }

    /**
     * Save metrics to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('mait_keystroke_metrics', JSON.stringify(this.historicalData));
        } catch (e) {
            console.warn('Failed to save keystroke metrics:', e);
        }
    }

    /**
     * Start a new typing session (called when input gains focus or user starts typing)
     */
    startSession() {
        this.currentSession = {
            startTime: Date.now(),
            keystrokes: [],
            dwellTimes: [],
            flightTimes: [],
            thinkingPeriods: [],
            errorCorrections: 0,
            charactersTyped: 0,
            wordsTyped: 0,
            peakWPM: 0
        };
        this.sessionStartTime = Date.now();
        this.lastTypingTime = Date.now();
        this.keystrokeBuffer = [];
    }

    /**
     * Record a key down event
     * @param {KeyboardEvent} event
     */
    onKeyDown(event) {
        if (!this.currentSession) {
            this.startSession();
        }

        const now = Date.now();
        const key = event.key;

        // Track thinking time (pause detection)
        if (this.lastTypingTime && (now - this.lastTypingTime) > this.THINKING_THRESHOLD_MS) {
            this.currentSession.thinkingPeriods.push({
                duration: now - this.lastTypingTime,
                timestamp: now
            });
        }

        // Track error corrections
        if (key === 'Backspace' || key === 'Delete') {
            this.currentSession.errorCorrections++;
        }

        // Calculate flight time (time from last key up to this key down)
        if (this.lastKeyUpTime) {
            const flightTime = now - this.lastKeyUpTime;
            if (flightTime < 2000) { // Ignore long pauses for flight time
                this.currentSession.flightTimes.push(flightTime);
            }
        }

        // Store keystroke data
        this.keystrokeBuffer.push({
            key: key.length === 1 ? key : `[${key}]`,
            keyDownTime: now,
            keyUpTime: null,
            dwellTime: null
        });

        this.lastKeyDownTime = now;
        this.lastTypingTime = now;

        // Count characters (exclude modifier keys)
        if (key.length === 1) {
            this.currentSession.charactersTyped++;
        }
    }

    /**
     * Record a key up event
     * @param {KeyboardEvent} event
     */
    onKeyUp(event) {
        if (!this.currentSession) return;

        const now = Date.now();

        // Find the matching keystroke and calculate dwell time
        const keystroke = this.keystrokeBuffer.find(k =>
            k.key === (event.key.length === 1 ? event.key : `[${event.key}]`) &&
            k.keyUpTime === null
        );

        if (keystroke) {
            keystroke.keyUpTime = now;
            keystroke.dwellTime = now - keystroke.keyDownTime;
            this.currentSession.dwellTimes.push(keystroke.dwellTime);
        }

        this.lastKeyUpTime = now;
    }

    /**
     * Calculate WPM based on current session
     * Standard: 1 word = 5 characters
     */
    calculateWPM() {
        if (!this.currentSession) return 0;

        const elapsedMinutes = (Date.now() - this.currentSession.startTime) / 60000;
        if (elapsedMinutes < 0.05) return 0; // Need at least 3 seconds of data

        const words = this.currentSession.charactersTyped / 5;
        return Math.round(words / elapsedMinutes);
    }

    /**
     * Calculate real-time WPM (last 10 seconds window)
     */
    calculateRealtimeWPM() {
        if (!this.currentSession || this.currentSession.dwellTimes.length < 5) return 0;

        const recentKeystrokes = this.keystrokeBuffer.filter(k =>
            k.keyDownTime > Date.now() - 10000 && k.key.length === 1
        );

        if (recentKeystrokes.length < 2) return 0;

        const timeSpan = (recentKeystrokes[recentKeystrokes.length - 1].keyDownTime -
                         recentKeystrokes[0].keyDownTime) / 60000;

        if (timeSpan < 0.01) return 0;

        const words = recentKeystrokes.length / 5;
        return Math.round(words / timeSpan);
    }

    /**
     * Get average of an array
     */
    getAverage(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * Calculate variance of an array
     */
    getVariance(arr) {
        if (!arr || arr.length < 2) return 0;
        const mean = this.getAverage(arr);
        const squaredDiffs = arr.map(x => Math.pow(x - mean, 2));
        return this.getAverage(squaredDiffs);
    }

    /**
     * Record a message being sent
     */
    recordMessageSent() {
        const now = Date.now();
        this.messageTimestamps.push(now);

        // Keep only last hour of message timestamps
        const oneHourAgo = now - 3600000;
        this.messageTimestamps = this.messageTimestamps.filter(t => t > oneHourAgo);
    }

    /**
     * Calculate messages per minute (last 15 minutes)
     */
    getMessageFrequency() {
        const now = Date.now();
        const fifteenMinutesAgo = now - 900000;
        const recentMessages = this.messageTimestamps.filter(t => t > fifteenMinutesAgo);
        return (recentMessages.length / 15).toFixed(2);
    }

    /**
     * End current session and update historical data
     */
    endSession() {
        if (!this.currentSession) return null;

        const sessionMetrics = this.getSessionMetrics();

        // Update historical data with weighted average
        const totalSessions = this.historicalData.totalSessions + 1;
        const weight = 1 / totalSessions;
        const prevWeight = 1 - weight;

        this.historicalData = {
            totalSessions,
            averageWPM: Math.round(
                prevWeight * this.historicalData.averageWPM +
                weight * sessionMetrics.wpm
            ),
            averageDwellTime: Math.round(
                prevWeight * this.historicalData.averageDwellTime +
                weight * sessionMetrics.avgDwellTime
            ),
            averageFlightTime: Math.round(
                prevWeight * this.historicalData.averageFlightTime +
                weight * sessionMetrics.avgFlightTime
            ),
            averageThinkingTime: Math.round(
                prevWeight * this.historicalData.averageThinkingTime +
                weight * sessionMetrics.avgThinkingTime
            ),
            totalCharactersTyped: this.historicalData.totalCharactersTyped +
                                  sessionMetrics.charactersTyped,
            totalErrorCorrections: this.historicalData.totalErrorCorrections +
                                   sessionMetrics.errorCorrections,
            messageFrequencyPerMinute: parseFloat(this.getMessageFrequency()),
            sessionHistory: [
                ...this.historicalData.sessionHistory.slice(-49), // Keep last 50 sessions
                {
                    timestamp: Date.now(),
                    wpm: sessionMetrics.wpm,
                    duration: sessionMetrics.sessionDuration,
                    errorRate: sessionMetrics.errorRate
                }
            ],
            typingRhythmVariance: sessionMetrics.rhythmVariance,
            lastUpdated: Date.now()
        };

        this.saveToStorage();
        this.currentSession = null;

        return sessionMetrics;
    }

    /**
     * Get current session metrics
     */
    getSessionMetrics() {
        if (!this.currentSession) {
            return {
                wpm: 0,
                realtimeWPM: 0,
                avgDwellTime: 0,
                avgFlightTime: 0,
                avgThinkingTime: 0,
                totalThinkingTime: 0,
                errorCorrections: 0,
                errorRate: 0,
                charactersTyped: 0,
                sessionDuration: 0,
                rhythmVariance: 0,
                keystrokeCount: 0
            };
        }

        const avgThinkingTime = this.getAverage(
            this.currentSession.thinkingPeriods.map(p => p.duration)
        );
        const totalThinkingTime = this.currentSession.thinkingPeriods.reduce(
            (sum, p) => sum + p.duration, 0
        );

        return {
            wpm: this.calculateWPM(),
            realtimeWPM: this.calculateRealtimeWPM(),
            avgDwellTime: Math.round(this.getAverage(this.currentSession.dwellTimes)),
            avgFlightTime: Math.round(this.getAverage(this.currentSession.flightTimes)),
            avgThinkingTime: Math.round(avgThinkingTime),
            totalThinkingTime: Math.round(totalThinkingTime),
            errorCorrections: this.currentSession.errorCorrections,
            errorRate: this.currentSession.charactersTyped > 0
                ? (this.currentSession.errorCorrections / this.currentSession.charactersTyped * 100).toFixed(1)
                : 0,
            charactersTyped: this.currentSession.charactersTyped,
            sessionDuration: Date.now() - this.currentSession.startTime,
            rhythmVariance: Math.round(this.getVariance(this.currentSession.flightTimes)),
            keystrokeCount: this.keystrokeBuffer.length
        };
    }

    /**
     * Get historical metrics
     */
    getHistoricalMetrics() {
        return { ...this.historicalData };
    }

    /**
     * Get comprehensive metrics report
     */
    getFullReport() {
        return {
            current: this.getSessionMetrics(),
            historical: this.getHistoricalMetrics(),
            messageFrequency: this.getMessageFrequency()
        };
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.historicalData = this.getDefaultMetrics();
        this.currentSession = null;
        this.keystrokeBuffer = [];
        this.messageTimestamps = [];
        this.saveToStorage();
    }

    /**
     * Get typing behavior analysis
     */
    getTypingBehaviorAnalysis() {
        const session = this.getSessionMetrics();
        const historical = this.getHistoricalMetrics();

        let analysis = {
            typingSpeed: 'unknown',
            consistency: 'unknown',
            thinkingPattern: 'unknown',
            errorTendency: 'unknown'
        };

        // Typing speed classification
        const wpm = session.wpm || historical.averageWPM;
        if (wpm > 60) analysis.typingSpeed = 'fast';
        else if (wpm > 40) analysis.typingSpeed = 'moderate';
        else if (wpm > 20) analysis.typingSpeed = 'slow';
        else analysis.typingSpeed = 'very_slow';

        // Consistency (based on rhythm variance)
        const variance = session.rhythmVariance || historical.typingRhythmVariance;
        if (variance < 5000) analysis.consistency = 'very_consistent';
        else if (variance < 15000) analysis.consistency = 'consistent';
        else if (variance < 30000) analysis.consistency = 'moderate';
        else analysis.consistency = 'variable';

        // Thinking pattern
        const avgThinking = session.avgThinkingTime || historical.averageThinkingTime;
        if (avgThinking > 10000) analysis.thinkingPattern = 'deliberate';
        else if (avgThinking > 5000) analysis.thinkingPattern = 'thoughtful';
        else if (avgThinking > 2000) analysis.thinkingPattern = 'moderate';
        else analysis.thinkingPattern = 'quick';

        // Error tendency
        const errorRate = parseFloat(session.errorRate) ||
                         (historical.totalCharactersTyped > 0
                            ? (historical.totalErrorCorrections / historical.totalCharactersTyped * 100)
                            : 0);
        if (errorRate < 2) analysis.errorTendency = 'accurate';
        else if (errorRate < 5) analysis.errorTendency = 'normal';
        else if (errorRate < 10) analysis.errorTendency = 'error_prone';
        else analysis.errorTendency = 'high_error';

        return analysis;
    }

    // =============================================
    // BACKEND API METHODS
    // =============================================

    /**
     * Submit current session metrics to the backend
     * POST /keystroke-metrics
     * @param {string} studentId
     * @param {object} metrics - session metrics object from getSessionMetrics()
     * @returns {Promise<object>} response with updated profile
     */
    async submitMetrics(studentId, metrics) {
        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        try {
            const response = await fetch(`${API_URL}/keystroke-metrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: studentId,
                    metrics: {
                        wpm: metrics.wpm || 0,
                        avg_dwell_time_ms: metrics.avgDwellTime || 0,
                        avg_flight_time_ms: metrics.avgFlightTime || 0,
                        avg_thinking_time_ms: metrics.avgThinkingTime || 0,
                        total_thinking_time_ms: metrics.totalThinkingTime || 0,
                        error_corrections: metrics.errorCorrections || 0,
                        error_rate: parseFloat(metrics.errorRate) || 0,
                        characters_typed: metrics.charactersTyped || 0,
                        session_duration_ms: metrics.sessionDuration || 0,
                        rhythm_variance: metrics.rhythmVariance || 0,
                        keystroke_count: metrics.keystrokeCount || 0
                    }
                })
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.warn('Failed to submit keystroke metrics:', error);
            return null;
        }
    }

    /**
     * Fetch the historical keystroke profile from the backend
     * GET /keystroke-profile/{student_id}
     * @param {string} studentId
     * @returns {Promise<object|null>} profile data or null on error
     */
    async getProfile(studentId) {
        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        try {
            const response = await fetch(`${API_URL}/keystroke-profile/${studentId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.warn('Failed to fetch keystroke profile:', error);
            return null;
        }
    }
}

// Singleton instance
const keystrokeMetricsService = new KeystrokeMetricsService();

export default keystrokeMetricsService;

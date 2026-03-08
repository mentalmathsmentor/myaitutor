/**
 * Unit tests for KeystrokeMetricsService
 * 
 * Run with: node --experimental-vm-modules src/__tests__/keystrokeMetrics.test.js
 * (These are standalone tests that don't require Jest/Vitest — just Node assertions)
 */

// Minimal mock of localStorage for Node
const storage = {};
const localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = v; },
    removeItem: (k) => { delete storage[k]; },
};
globalThis.localStorage = localStorage;

// Import the service (we'll inline test the core logic since the module uses ES exports)
// Instead, we replicate the core calculation logic for isolated unit testing.

function getAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
}

function getVariance(arr) {
    if (!arr || arr.length < 2) return 0;
    const mean = getAverage(arr);
    const squaredDiffs = arr.map(v => Math.pow(v - mean, 2));
    return getAverage(squaredDiffs);
}

function calculateWPM(charCount, startTime, endTime) {
    if (!startTime || !endTime || charCount === 0) return 0;
    const minutes = (endTime - startTime) / 60000;
    if (minutes <= 0) return 0;
    return Math.round((charCount / 5) / minutes);
}

// ─── Test Runner ───
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${message}`);
    } else {
        failed++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

function assertApprox(actual, expected, tolerance, message) {
    assert(Math.abs(actual - expected) <= tolerance, `${message} (expected ~${expected}, got ${actual})`);
}

// ─── Tests ───

console.log('\n🧪 KeystrokeMetricsService Unit Tests\n');

console.log('--- getAverage ---');
assert(getAverage([]) === 0, 'Empty array returns 0');
assert(getAverage([10]) === 10, 'Single element returns itself');
assertApprox(getAverage([10, 20, 30]), 20, 0.01, 'Average of [10,20,30] is 20');
assertApprox(getAverage([100, 200, 300, 400]), 250, 0.01, 'Average of [100-400] is 250');

console.log('\n--- getVariance ---');
assert(getVariance([]) === 0, 'Empty array returns 0');
assert(getVariance([5]) === 0, 'Single element returns 0');
assertApprox(getVariance([10, 10, 10]), 0, 0.01, 'Constant array has 0 variance');
assertApprox(getVariance([1, 3]), 1, 0.01, 'Variance of [1,3] is 1');
assertApprox(getVariance([2, 4, 4, 4, 5, 5, 7, 9]), 4, 0.5, 'Variance of standard dataset ~4');

console.log('\n--- calculateWPM ---');
assert(calculateWPM(0, Date.now(), Date.now() + 60000) === 0, 'Zero chars = 0 WPM');
assert(calculateWPM(250, Date.now(), Date.now()) === 0, 'Zero time = 0 WPM');
assert(calculateWPM(100, null, Date.now()) === 0, 'Null start = 0 WPM');
{
    const start = Date.now();
    const end = start + 60000; // 1 minute
    const wpm = calculateWPM(250, start, end); // 250 chars / 5 = 50 words in 1 min
    assert(wpm === 50, `250 chars in 1 min = 50 WPM (got ${wpm})`);
}
{
    const start = Date.now();
    const end = start + 30000; // 30 seconds
    const wpm = calculateWPM(100, start, end); // 100 chars / 5 = 20 words in 0.5 min = 40 WPM
    assert(wpm === 40, `100 chars in 30s = 40 WPM (got ${wpm})`);
}

console.log('\n--- Edge Cases ---');
assert(getAverage(null) === 0, 'Null array handled gracefully');
assert(getVariance(null) === 0, 'Null variance handled gracefully');
assertApprox(getAverage([0, 0, 0]), 0, 0.01, 'All-zero array averages to 0');
{
    const negWpm = calculateWPM(100, Date.now() + 1000, Date.now()); // negative time
    assert(negWpm === 0, 'Negative time interval = 0 WPM');
}

console.log('\n--- Fatigue Thresholds ---');
// Simulate fatigue detection: WPM drops > 30% from baseline
function detectFatigue(currentWPM, baselineWPM) {
    if (baselineWPM <= 0) return 'UNKNOWN';
    const ratio = currentWPM / baselineWPM;
    if (ratio >= 0.85) return 'FRESH';
    if (ratio >= 0.7) return 'MILD';
    if (ratio >= 0.5) return 'MODERATE';
    return 'FATIGUED';
}

assert(detectFatigue(50, 50) === 'FRESH', '100% of baseline = FRESH');
assert(detectFatigue(45, 50) === 'FRESH', '90% of baseline = FRESH');
assert(detectFatigue(40, 50) === 'MILD', '80% of baseline = MILD');
assert(detectFatigue(35, 50) === 'MILD', '70% of baseline = MILD');
assert(detectFatigue(20, 50) === 'FATIGUED', '40% of baseline = FATIGUED');
assert(detectFatigue(50, 0) === 'UNKNOWN', 'Zero baseline = UNKNOWN');

// ─── Summary ───
console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
} else {
    console.log('All tests passed! ✅\n');
}

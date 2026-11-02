// Diagnostic audit: does not modify curriculum data or certify legal permission.
// Usage: node scripts/audit-syllabus-coverage.mjs <local-reference-directory>
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = process.argv[2];
if (!evidence) throw new Error('A local official-reference directory is required.');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const stages = read(resolve(root, 'src/stage_subjects.json'));
const syllabus = read(resolve(root, 'src/syllabus_data.json'));
const registry = read(resolve(root, 'src/syllabus_registry.json'));
const corpus = read(resolve(root, '../../corpus/syllabus.json'));
const reference = read(resolve(evidence, 'official-maths-focus-areas.json'));
const outcomeReference = read(resolve(evidence, 'official-maths-outcome-codes.json'));
const associations = read(resolve(evidence, 'focus-outcome-associations.json')).rows;
const bundled = await build({
  absWorkingDir: root,
  stdin: { contents: `export { resolveCourse, restorePoints, topicRecords } from './src/features/worksheet/utils/courseCatalogue.js'; export { buildSyllabusPacket } from './src/features/worksheet/utils/buildSyllabusPacket.js';`, resolveDir: root },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { resolveCourse, restorePoints, topicRecords, buildSyllabusPacket } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const checks = [];
const check = (id, ok, details) => checks.push({ id, status: ok ? 'PASS' : 'FAIL', details });
const courses = [];
for (const [stage, subjects] of Object.entries(stages)) {
  for (const subject of [...Object.keys(subjects), 'Other']) {
    const course = resolveCourse(stage, subject);
    const ids = course.records.map(p => p.id);
    const packet = buildSyllabusPacket({ selectedStage: stage, selectedSubject: subject, selectedPoints: ids, syllabusData: course.data });
    check(`transport:${stage}:${subject}`, course.valid && new Set(ids).size === ids.length &&
      JSON.stringify(packet.dotPoints) === JSON.stringify(course.records.map(p => p.label)) &&
      course.records.every(p => restorePoints(course, [p.id]).includes(p.id)), { records: ids.length });
    const recordKeys = [...new Set(course.records.flatMap(p => Object.keys(p)))];
    courses.push({ stage, subject, kind: course.kind, records: ids.length,
      uniqueLabels: new Set(course.records.map(p => p.label)).size,
      emittedOutcomes: packet.outcomes.length, recordKeys });
  }
}
const junior = [];
for (let year = 1; year <= 10; year++) {
  const stageNumber = Math.ceil(year / 2);
  const stage = `Stage ${stageNumber} (Yr ${stageNumber * 2 - 1}-${stageNumber * 2})`;
  const course = resolveCourse(stage, 'Mathematics');
  const records = topicRecords(syllabus[`Year ${year}`] || {});
  junior.push({ year, stage, selectionKind: course.kind, selectableStageRecords: course.records.length,
    yearDatasetRecords: records.length, structuredRecords: records.filter(r => r.id && r.label).length });
  // A year dataset is not mandated by NESA: check the active stage mapping.
  check(`source-backed-stage-map:year-${year}`, course.records.length > 0 && course.records.every(p =>
    Array.isArray(p.outcomeCodes) && p.outcomeCodes.length && p.outcomeCodes.every(code => outcomeReference.codes.includes(code)) &&
    typeof p.sourceUrl === 'string' && p.syllabusVersion), { stage, selectionKind: course.kind, records: course.records.length });
}
const normalisedJunior = Object.fromEntries([7, 8, 9, 10].map(y => [y, topicRecords(syllabus[`Year ${y}`]).map(p => p.label)]));
check('distinct-stage-4-stage-5-content', JSON.stringify(resolveCourse('Stage 4 (Yr 7-8)', 'Mathematics').records.map(p => p.label)) !== JSON.stringify(resolveCourse('Stage 5 (Yr 9-10)', 'Mathematics').records.map(p => p.label)), { scope: 'Active picker, not retired year datasets' });
const rootCoverage = [];
for (const [stage, focusAreas] of Object.entries(reference.stages)) {
  const n = Number(stage.slice(-1));
  const current = resolveCourse(`${stage} (Yr ${n * 2 - 1}-${n * 2})`, 'Mathematics');
  const expected = associations.filter(p => p.stage === stage);
  check(`active-focus-associations:${stage}`, current.records.length === focusAreas.length && expected.length === focusAreas.length &&
    focusAreas.every(f => current.records.some(p => p.sourceUrl === f.url)) &&
    expected.every(f => current.records.some(p => p.sourceId === f.id && p.sourceUrl === f.url && JSON.stringify(p.outcomeCodes) === JSON.stringify(f.outcomes))),
    { expected: focusAreas.length, actual: current.records.length });
  const topics = (corpus[stage]?.Modules || []).flatMap(m => m.Topics || []);
  const names = new Set(topics.map(t => t.Topic));
  const missing = focusAreas.filter(x => !names.has(x.title)).map(x => x.title);
  const extra = topics.filter(t => !focusAreas.some(f => f.title === t.Topic)).map(t => t.Topic);
  check(`root-corpus-focus-areas:${stage}`, missing.length === 0, { expected: focusAreas.length, matched: focusAreas.length - missing.length, missing, extra });
  const contentPoints = topics.flatMap(t => (t.Subtopics || []).flatMap(s => s.ContentPoints || []));
  const tagOnlyPoints = contentPoints.filter(p => /^[A-Za-z]{2,4}\d+(?:,\s*[A-Za-z]{2,4}\d+)*$/.test(p.text.trim()));
  if (topics.length) {
    check(`root-corpus-no-assessment-headings:${stage}`, extra.length === 0, { extra });
    check(`root-corpus-no-tag-only-points:${stage}`, tagOnlyPoints.length === 0, { count: tagOnlyPoints.length, exampleIds: tagOnlyPoints.slice(0, 5).map(p => p.content_code) });
  }
  const outcomeCodes = new Set(topics.flatMap(t => (t.Outcomes || []).flatMap(o => o.codes || [])));
  const officialCodes = outcomeReference.codes.filter(c => c.startsWith(`MA${stage.slice(-1)}-`));
  const missingOutcomeCodes = officialCodes.filter(c => !outcomeCodes.has(c));
  check(`root-corpus-outcomes:${stage}`, missingOutcomeCodes.length === 0, { expected: officialCodes.length, matched: officialCodes.length - missingOutcomeCodes.length, missing: missingOutcomeCodes });
  rootCoverage.push({ stage, officialFocusAreas: focusAreas.length, presentFocusAreas: focusAreas.length - missing.length,
    extra, missingOutcomeCodes, contentPoints: contentPoints.length, tagOnlyPoints: tagOnlyPoints.length });
}
const allSourceIds = new Set(topicRecords(syllabus).map(r => r.id));
check('registry-references-exist', Object.keys(registry).every(id => allSourceIds.has(id)), { entries: Object.keys(registry).length, orphanIds: Object.keys(registry).filter(id => !allSourceIds.has(id)) });
const selectedSources = new Set(Object.entries(stages).flatMap(([stage, subjects]) => Object.keys(subjects).flatMap(subject => resolveCourse(stage, subject).records.map(p => p.source).filter(Boolean))));
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'All configured course transports; Year 1–10 mathematics mappings; official mathematics focus-area and outcome identifiers. Not a full verbatim content-point comparison or legal clearance.',
  counts: { checks: checks.length, passed: checks.filter(c => c.status === 'PASS').length, failed: checks.filter(c => c.status === 'FAIL').length,
    configuredCoursePairsIncludingOther: courses.length, rawSyllabusRecords: topicRecords(syllabus).length, registryEntries: Object.keys(registry).length },
  courses, junior, rootCoverage, checks,
  unreachableTopLevelDatasets: Object.keys(syllabus).filter(x => !selectedSources.has(x)),
  missingIndividualYearDatasetKeys: Array.from({ length: 10 }, (_, i) => `Year ${i + 1}`).filter(k => !Object.hasOwn(syllabus, k)),
  juniorIdenticalLabelsAcrossYears: [8, 9, 10].filter(y => JSON.stringify(normalisedJunior[7]) === JSON.stringify(normalisedJunior[y])),
  hashes: Object.fromEntries(['src/stage_subjects.json', 'src/syllabus_data.json', 'src/syllabus_registry.json', 'src/features/worksheet/utils/courseCatalogue.js', 'src/features/worksheet/utils/buildSyllabusPacket.js', '../../corpus/syllabus.json'].map(p => [p, createHash('sha256').update(readFileSync(resolve(root, p))).digest('hex')])),
};
writeFileSync(resolve(evidence, process.argv[3] || 'coverage-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ counts: report.counts, junior: report.junior, rootCoverage: report.rootCoverage, unreachable: report.unreachableTopLevelDatasets, identicalToYear7: report.juniorIdenticalLabelsAcrossYears }, null, 2));
process.exitCode = report.counts.failed ? 1 : 0;

import stages from '../../../stage_subjects.json';
import syllabus from '../../../syllabus_data.json';
import { juniorMathsRecords, juniorMathsNotice } from './juniorMathsCatalogue';

const sources = {
  'Year 11': {
    'Mathematics Standard': ['Year 11 Standard'],
    'Mathematics Advanced': ['Year 11 Advanced'],
    'Mathematics Extension 1': ['Year 11 Extension 1', 'Year 11 Advanced'],
  },
  'Year 12': {
    'Mathematics Advanced': ['Year 12 Advanced'],
    'Mathematics Extension 1': ['Year 12 Extension 1', 'Year 12 Advanced'],
    'Mathematics Extension 2': ['Year 12 Extension 2', 'Year 12 Advanced', 'Year 12 Extension 1'],
    Physics: ['Year 12 Physics'],
    'Engineering Studies': ['Year 12 Engineering Studies'],
  },
};
const manualSubjects = new Set(['English', 'Chemistry', 'Biology']);
export const courseKey = (stage, subject) => JSON.stringify([stage, subject]);
// Selected points are scoped IDs; manual topics have no record and stay as typed.
export const topicLabel = (course, id) => course.records.find(record => record.id === id)?.label ?? id;
const scopedId = (stage, subject, source, id) => JSON.stringify([stage, subject, source, id]);

export function topicRecords(data) {
  if (Array.isArray(data)) return data.flatMap(point => {
    if (typeof point === 'string' && point.trim()) return [{ id: point, label: point }];
    if (point && typeof point.id === 'string' && typeof point.label === 'string' && point.label.trim()) return [point];
    return [];
  });
  if (!data || typeof data !== 'object') return [];
  return Object.values(data).flatMap(topicRecords);
}

export function resolveCourse(stage, subject) {
  const key = courseKey(stage, subject);
  const valid = Object.hasOwn(stages, stage) && (subject === 'Other' || Object.hasOwn(stages[stage], subject));
  const empty = { key, valid, kind: 'manual', data: {}, records: [] };
  if (!valid || subject === 'Other' || manualSubjects.has(subject) || (stage === 'Year 11' && subject === 'Physics')) return empty;
  const juniorRecords = subject === 'Mathematics' ? juniorMathsRecords(stage) : [];
  if (juniorRecords.length) {
    const data = {};
    for (const record of juniorRecords) {
      const group = record.part ? `Part ${record.part}` : record.pathway;
      data[group] ??= {};
      data[group][record.label] = [{ ...record, id: scopedId(stage, subject, record.source, record.sourceId) }];
    }
    return { key, valid, kind: 'hierarchical', data, records: topicRecords(data), notice: juniorMathsNotice };
  }
  const names = sources[stage]?.[subject];
  if (names) {
    const data = {};
    for (const [index, name] of names.entries()) {
      for (const [module, children] of Object.entries(syllabus[name] || {})) {
        const junior = stage.startsWith('Stage');
        const heading = junior ? `${name} — ${module}` : index ? `${name} (Prerequisite) — ${module}` : module;
        data[heading] = Object.fromEntries(Object.entries(children).map(([subtopic, points]) => [subtopic,
          topicRecords(points).map(p => ({ ...p, sourceId: p.id, source: name, id: scopedId(stage, subject, name, p.id) }))]));
      }
    }
    return { key, valid, kind: 'hierarchical', data, records: topicRecords(data) };
  }
  const data = topicRecords(stages[stage][subject]).map(p => ({ ...p, sourceId: p.id, id: scopedId(stage, subject, 'catalogue', p.id) }));
  return data.length ? { key, valid, kind: 'flat', data, records: data } : empty;
}

export function restorePoints(course, points, legacy = false) {
  if (!Array.isArray(points)) return [];
  const ids = new Set(course.records.map(p => p.id));
  return [...new Set(points.flatMap(id => {
    if (typeof id !== 'string') return [];
    if (ids.has(id)) return [id];
    if (!legacy) return [];
    const matches = course.records.filter(p => p.sourceId === id || p.label === id);
    return matches.length === 1 ? [matches[0].id] : [];
  }))];
}

export function validateWorksheetSelection(params) {
  const course = resolveCourse(params.selectedStage, params.selectedSubject);
  if (!course.valid) return 'Choose a supported stage and subject.';
  if (params.selectedSubject === 'Other' && !params.customSubject?.trim()) return 'Enter a name for your custom subject.';
  if (!Number.isInteger(params.numQuestions) || params.numQuestions < 1 || params.numQuestions > 100) return 'Choose between 1 and 100 questions.';
  if (!restorePoints(course, params.selectedPoints).length && !params.rawQuestions?.trim()) return 'Select at least one syllabus point or enter manual topics before generating.';
  return '';
}

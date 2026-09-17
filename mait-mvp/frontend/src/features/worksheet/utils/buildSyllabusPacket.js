import syllabusRegistry from '../../../syllabus_registry.json';
import { ensureStringArray } from './promptHelpers';
import { topicRecords } from './courseCatalogue';

export function buildSyllabusPacket({ selectedStage, selectedSubject, selectedPoints, syllabusData }) {
  if (!Array.isArray(selectedPoints) || selectedPoints.length === 0) {
    return {
      topicSummary: `${selectedStage} ${selectedSubject}`,
      outcomes: [],
      dotPoints: [],
      include: [],
      exclude: [],
      assessmentEmphasis: [],
      questionStyleNotes: []
    };
  }

  const records = new Map(topicRecords(syllabusData).map(p => [p.id, p]));

  // Only process ids that resolve to a label in the current syllabus context.
  // This prevents stale ids from a prior subject from producing phantom metadata.
  const resolvedIds = new Set(selectedPoints.filter((id) => typeof id === 'string' && records.has(id)));

  const outcomes = new Set();
  const include = new Set();
  const exclude = new Set();
  const assessmentEmphasis = new Set();
  const questionStyleNotes = new Set();

  resolvedIds.forEach(pointId => {
    const point = records.get(pointId);
    const meta = syllabusRegistry[point.sourceId || pointId];
    if (meta) {
      if (meta.outcomes) meta.outcomes.forEach(o => outcomes.add(o));
      const scoped = text => `For ${point.label} only: ${text}`;
      if (meta.include) meta.include.forEach(i => include.add(scoped(i)));
      if (meta.exclude) meta.exclude.forEach(e => exclude.add(scoped(e)));
      if (meta.assessmentEmphasis) meta.assessmentEmphasis.forEach(a => assessmentEmphasis.add(scoped(a)));
      if (meta.questionStyleNotes) meta.questionStyleNotes.forEach(q => questionStyleNotes.add(scoped(q)));
    }
  });

  // Only emit labels for ids that resolved — never fall back to raw id strings.
  const displayLabels = [...resolvedIds].map(id => records.get(id).label);

  return {
    topicSummary: displayLabels.join(' | '),
    outcomes: ensureStringArray(Array.from(outcomes)),
    dotPoints: ensureStringArray(displayLabels),
    include: ensureStringArray(Array.from(include)),
    exclude: ensureStringArray(Array.from(exclude)),
    assessmentEmphasis: ensureStringArray(Array.from(assessmentEmphasis)),
    questionStyleNotes: ensureStringArray(Array.from(questionStyleNotes))
  };
}

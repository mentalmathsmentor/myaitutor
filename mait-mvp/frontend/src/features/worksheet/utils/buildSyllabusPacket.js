import syllabusRegistry from '../../../syllabus_registry.json';
import { ensureStringArray } from './promptHelpers';

function buildIdToLabel(syllabusData) {
  const idToLabel = {};
  const traverse = (obj) => {
    if (Array.isArray(obj)) {
      obj.forEach(p => {
        if (typeof p === 'object' && p !== null && p.id && p.label) {
          idToLabel[p.id] = p.label;
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(traverse);
    }
  };
  if (syllabusData) traverse(syllabusData);
  return idToLabel;
}

export function buildSyllabusPacket({ selectedStage, selectedSubject, selectedPoints, syllabusData }) {
  if (!selectedPoints || selectedPoints.length === 0) {
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

  const idToLabel = buildIdToLabel(syllabusData);

  // Only process ids that resolve to a label in the current syllabus context.
  // This prevents stale ids from a prior subject from producing phantom metadata.
  const resolvedIds = new Set(selectedPoints.filter((id) => idToLabel[id]));

  const outcomes = new Set();
  const include = new Set();
  const exclude = new Set();
  const assessmentEmphasis = new Set();
  const questionStyleNotes = new Set();

  resolvedIds.forEach(pointId => {
    const meta = syllabusRegistry[pointId];
    if (meta) {
      if (meta.outcomes) meta.outcomes.forEach(o => outcomes.add(o));
      if (meta.include) meta.include.forEach(i => include.add(i));
      if (meta.exclude) meta.exclude.forEach(e => exclude.add(e));
      if (meta.assessmentEmphasis) meta.assessmentEmphasis.forEach(a => assessmentEmphasis.add(a));
      if (meta.questionStyleNotes) meta.questionStyleNotes.forEach(q => questionStyleNotes.add(q));
    }
  });

  // Only emit labels for ids that resolved — never fall back to raw id strings.
  const displayLabels = selectedPoints.map(p => idToLabel[p]).filter(Boolean);

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

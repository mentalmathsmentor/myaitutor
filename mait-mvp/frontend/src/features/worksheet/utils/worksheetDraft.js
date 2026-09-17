import stages from '../../../stage_subjects.json';
import { courseKey, resolveCourse, restorePoints } from './courseCatalogue';

export const DRAFT_KEY = 'mait_ws_draft_v2';
export const SPACING_OPTIONS = ['Working Blank Space (Math)', 'Two-column Compact', 'Ruled lines (Writing)', 'Compact (No space)', 'Dynamic Space'];
export const DIFFICULTY_OPTIONS = ['Mixed', 'Easy -> Hard Progression', 'Mostly Easy', 'Mostly Hard', 'Exam-Style'];
const defaults = {
  selectedStage: 'Year 12', selectedSubject: 'Mathematics Standard', customSubject: '',
  rawQuestions: '', selectedPoints: [], numQuestions: 10, workingSpace: 'Dynamic Space', difficulty: 'Mixed',
  includeMarks: false, generateAnswerKey: false, includeWorkedSolutions: false, includeName: true, includeDate: true,
  includeCanvasSetup: true, firstTimeMode: false, removeWatermark: false,
  pedagogicalSpotError: false, pedagogicalParameterShift: false, pedagogicalLimitCase: false,
  pedagogicalProofStyle: false, pedagogicalWordProblems: false, pedagogicalMultiStep: false,
};
const legacyKeys = {
  selectedStage: 'stage', selectedSubject: 'subject', customSubject: 'customSubject', rawQuestions: 'rawQuestions', selectedPoints: 'selectedPoints',
  numQuestions: 'numQuestions', workingSpace: 'workingSpace', difficulty: 'difficulty', includeMarks: 'marks',
  generateAnswerKey: 'answerKey', includeName: 'name', includeDate: 'date', includeCanvasSetup: 'canvasSetup',
  includeWorkedSolutions: 'includeWorkedSolutions', firstTimeMode: 'firstTimeMode', removeWatermark: 'removeWatermark',
};

export function readWorksheetDraft(storage) {
  let values = {}, notice = '', legacy = true, savedKey, preventSave = false;
  try {
    storage ??= window.localStorage;
    const saved = storage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.version !== 2 || !parsed.values || typeof parsed.values !== 'object' || Array.isArray(parsed.values)) throw new Error('Unknown draft format');
        values = parsed.values; savedKey = parsed.courseKey; legacy = false;
      } catch {
        preventSave = true;
        notice = 'The newer draft could not be read. An older draft is shown if available. Automatic saving is paused; copy your current text before leaving.';
      }
    }
    if (legacy) {
      for (const [field, fallback] of Object.entries(defaults)) {
        const raw = storage.getItem(`mait_ws_${legacyKeys[field] || field}`);
        if (raw === null) continue;
        if (field === 'selectedPoints') {
          try { values[field] = JSON.parse(raw); } catch { notice = 'Some saved topic selections could not be restored.'; }
        } else values[field] = typeof fallback === 'boolean' ? raw === 'true' ? true : raw === 'false' ? false : fallback : typeof fallback === 'number' ? Number(raw) : raw;
      }
      if (storage.getItem('mait_ws_removeWatermark') === null && storage.getItem('mait_ws_showWatermark') !== null) values.removeWatermark = storage.getItem('mait_ws_showWatermark') !== 'true';
    }
  } catch {
    preventSave = true;
    notice = 'The saved draft could not be fully loaded. You can continue editing here.';
  }
  const draft = Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key,
    key === 'selectedPoints' ? [] : typeof values[key] === typeof fallback ? values[key] : fallback]));
  let resetCourse = false;
  if (!Object.hasOwn(stages, draft.selectedStage)) { resetCourse = true; draft.selectedStage = defaults.selectedStage; notice = 'An unavailable saved course was reset. Your brief has been kept.'; }
  if (draft.selectedSubject !== 'Other' && !Object.hasOwn(stages[draft.selectedStage], draft.selectedSubject)) {
    resetCourse = true; draft.selectedSubject = Object.keys(stages[draft.selectedStage])[0]; notice = 'An unavailable saved subject was reset. Your brief has been kept.';
  }
  const course = resolveCourse(draft.selectedStage, draft.selectedSubject);
  const candidates = !resetCourse && (legacy || savedKey === course.key) ? values.selectedPoints : [];
  draft.selectedPoints = restorePoints(course, candidates, legacy);
  if (values.selectedPoints !== undefined && (!Array.isArray(values.selectedPoints) || draft.selectedPoints.length !== values.selectedPoints.length)) notice = 'Some saved topics no longer match this course and were left unselected. Your brief has been kept.';
  if (!Number.isInteger(draft.numQuestions) || draft.numQuestions < 1 || draft.numQuestions > 100) draft.numQuestions = defaults.numQuestions;
  if (!SPACING_OPTIONS.includes(draft.workingSpace)) draft.workingSpace = defaults.workingSpace;
  if (!DIFFICULTY_OPTIONS.includes(draft.difficulty)) draft.difficulty = defaults.difficulty;
  if (draft.includeWorkedSolutions) draft.generateAnswerKey = true;
  if (preventSave && !notice.includes('paused')) notice += ' Automatic saving is paused; copy your current text before leaving.';
  return { ...draft, notice, preventSave };
}

export function saveWorksheetDraft(params, storage) {
  if (params.preventSave) return false;
  try {
    storage ??= window.localStorage;
    // Preserve legacy keys for downgrade recovery. Never persist resource claims or a school/class heading.
    const values = Object.fromEntries(Object.keys(defaults).map(key => [key, params[key]]));
    storage.setItem(DRAFT_KEY, JSON.stringify({ version: 2, courseKey: courseKey(params.selectedStage, params.selectedSubject), values }));
    return true;
  } catch { return false; }
}

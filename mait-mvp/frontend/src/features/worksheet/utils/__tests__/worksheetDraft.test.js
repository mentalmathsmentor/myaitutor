import { describe, it, expect } from 'vitest';
import { readWorksheetDraft, saveWorksheetDraft, DRAFT_KEY } from '../worksheetDraft';
import { resolveCourse } from '../courseCatalogue';

function storage(initial = {}) {
  const entries = new Map(Object.entries(initial));
  return { entries, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
}
describe('defensive versioned drafts', () => {
  it('imports a valid legacy flat selection without modifying any old key', () => {
    const course = resolveCourse('Stage 2 (Yr 3-4)', 'Science');
    const old = { mait_ws_stage: 'Stage 2 (Yr 3-4)', mait_ws_subject: 'Science', mait_ws_rawQuestions: 'Original\nsynthetic brief', mait_ws_selectedPoints: JSON.stringify([course.records[0].label]) };
    const store = storage(old); const draft = readWorksheetDraft(store);
    expect(draft.selectedPoints).toEqual([resolveCourse(draft.selectedStage, draft.selectedSubject).records[0].id]);
    expect(saveWorksheetDraft(draft, store).status).toBe('saved');
    for (const [key, value] of Object.entries(old)) expect(store.getItem(key)).toBe(value);
    expect(readWorksheetDraft(store).rawQuestions).toBe(old.mait_ws_rawQuestions);
  });
  it('does not guess an A/B part for a retired broad primary maths selection', () => {
    const old = { mait_ws_stage: 'Stage 2 (Yr 3-4)', mait_ws_subject: 'Mathematics', mait_ws_rawQuestions: 'Keep my lesson brief', mait_ws_selectedPoints: '["Base-10 and Place Value"]' };
    const store = storage(old);
    const draft = readWorksheetDraft(store);
    expect(draft.selectedPoints).toEqual([]);
    expect(draft.notice).toContain('left unselected');
    expect(draft.rawQuestions).toBe(old.mait_ws_rawQuestions);
    expect(store.getItem('mait_ws_selectedPoints')).toBe(old.mait_ws_selectedPoints);
  });
  it.each(['{}', 'null', '5', '"text"', '[null, {}]', '{broken'])('recovers from malformed legacy selections %s', selected => {
    const draft = readWorksheetDraft(storage({ mait_ws_selectedPoints: selected, mait_ws_rawQuestions: 'Keep my synthetic brief' }));
    expect(draft.selectedPoints).toEqual([]); expect(draft.rawQuestions).toBe('Keep my synthetic brief'); expect(draft.notice).not.toBe('');
  });
  it('restores custom subjects and output settings, never resource assertions or headings', () => {
    const store = storage(); const draft = { ...readWorksheetDraft(store), selectedSubject: 'Other', customSubject: 'Synthetic History', rawQuestions: 'Keep text',
      includeWorkedSolutions: true, includeName: false, includeDate: false, removeWatermark: true, firstTimeMode: true, schoolName: 'Do not save', syllabusContextMode: 'Search', textbooksProvided: true };
    saveWorksheetDraft(draft, store); const restored = readWorksheetDraft(store);
    expect(restored).toMatchObject({ selectedSubject: 'Other', customSubject: 'Synthetic History', includeWorkedSolutions: true, generateAnswerKey: true, includeName: false, includeDate: false, removeWatermark: true, firstTimeMode: true });
    const raw = store.getItem(DRAFT_KEY); expect(raw).not.toMatch(/Do not save|syllabusContextMode|textbooksProvided/);
  });
  it('drops stale or foreign scoped IDs while retaining the brief', () => {
    const store = storage(); const draft = readWorksheetDraft(store);
    saveWorksheetDraft({ ...draft, selectedPoints: ['retired'], rawQuestions: 'Retain me' }, store);
    const restored = readWorksheetDraft(store); expect(restored.selectedPoints).toEqual([]); expect(restored.rawQuestions).toBe('Retain me'); expect(restored.notice).toContain('left unselected');
  });
  it('does not authorise selections when the stored course key differs', () => {
    const store = storage(); const draft = readWorksheetDraft(store); draft.selectedPoints = [resolveCourse(draft.selectedStage, draft.selectedSubject).records[0].id];
    saveWorksheetDraft(draft, store); const value = JSON.parse(store.getItem(DRAFT_KEY)); value.courseKey = 'foreign'; store.setItem(DRAFT_KEY, JSON.stringify(value));
    expect(readWorksheetDraft(store).selectedPoints).toEqual([]);
  });
  it('survives denied reads and quota failures without throwing', () => {
    const denied = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Quota'); } };
    const draft = readWorksheetDraft(denied); expect(draft.notice).not.toBe(''); expect(draft.preventSave).toBe(true); expect(saveWorksheetDraft(draft, denied).status).toBe('failed');
  });
  it.each([undefined, null, false, 0, 17, [], {}, '', '   '])('preserves the original draft when course metadata is malformed: %j', courseKey => {
    const store = storage();
    const draft = readWorksheetDraft(store);
    draft.rawQuestions = 'Synthetic brief retained in the original record';
    draft.selectedPoints = [resolveCourse(draft.selectedStage, draft.selectedSubject).records[0].id];
    saveWorksheetDraft(draft, store);
    const envelope = JSON.parse(store.getItem(DRAFT_KEY));
    envelope.courseKey = courseKey;
    const unread = JSON.stringify(envelope);
    store.setItem(DRAFT_KEY, unread);
    const restored = readWorksheetDraft(store);
    expect(restored.preventSave).toBe(true);
    expect(restored.notice).toContain('paused');
    expect(saveWorksheetDraft(restored, store).status).toBe('failed');
    expect(store.getItem(DRAFT_KEY)).toBe(unread);
  });
  it.each(['{broken', '{"version":99,"values":{}}'])('preserves an unreadable new draft and recovers legacy text: %s', saved => {
    const store = storage({ [DRAFT_KEY]: saved, mait_ws_rawQuestions: 'Older synthetic brief' }); const draft = readWorksheetDraft(store);
    expect(draft.preventSave).toBe(true); expect(draft.rawQuestions).toBe('Older synthetic brief'); expect(store.getItem(DRAFT_KEY)).toBe(saved);
  });
  it('normalises invalid enums and counts', () => {
    const draft = readWorksheetDraft(storage({ mait_ws_stage: 'retired', mait_ws_difficulty: 'unsupported', mait_ws_workingSpace: 'bad', mait_ws_numQuestions: '1.5' }));
    expect(draft).toMatchObject({ selectedStage: 'Year 12', difficulty: 'Mixed', workingSpace: 'Dynamic Space', numQuestions: 10 });
  });
  it.each([
    ['rawQuestions', { text: 'Unread synthetic teacher draft' }],
    ['customSubject', ['Synthetic history']],
    ['includeName', 'false'],
    ['numQuestions', null],
    ['selectedPoints', {}],
    ['selectedPoints', [null, 5]],
  ])('preserves a version-2 draft with malformed %s and recovers legacy text', (field, value) => {
    const store = storage({ mait_ws_rawQuestions: 'Recoverable legacy synthetic brief' });
    const draft = readWorksheetDraft(store);
    saveWorksheetDraft(draft, store);
    const envelope = JSON.parse(store.getItem(DRAFT_KEY));
    envelope.values[field] = value;
    const unread = JSON.stringify(envelope);
    store.setItem(DRAFT_KEY, unread);
    const restored = readWorksheetDraft(store);
    expect(restored.preventSave).toBe(true);
    expect(restored.notice).toContain('paused');
    expect(restored.rawQuestions).toBe('Recoverable legacy synthetic brief');
    expect(saveWorksheetDraft(restored, store).status).toBe('failed');
    expect(store.getItem(DRAFT_KEY)).toBe(unread);
  });
});

describe('stale tab protection', () => {
  const edit = (draft, changes) => ({ ...draft, ...changes });
  function twoTabs() {
    const store = storage();
    const first = saveWorksheetDraft(edit(readWorksheetDraft(store), { rawQuestions: 'Original brief' }), store);
    expect(first).toEqual({ status: 'saved', revision: 1 });
    return { store, stale: readWorksheetDraft(store), newer: readWorksheetDraft(store) };
  }

  it('pauses a stale tab instead of overwriting a newer brief', () => {
    const { store, stale, newer } = twoTabs();
    expect(saveWorksheetDraft(edit(newer, { rawQuestions: 'Newer brief' }), store).status).toBe('saved');
    const newerRecord = store.getItem(DRAFT_KEY);
    expect(saveWorksheetDraft(edit(stale, { difficulty: 'Exam-Style' }), store)).toEqual({ status: 'paused', revision: stale.revision });
    expect(store.getItem(DRAFT_KEY)).toBe(newerRecord);
    expect(readWorksheetDraft(store).rawQuestions).toBe('Newer brief');
  });
  it('lets one tab keep saving by carrying its returned revision', () => {
    const store = storage();
    let draft = readWorksheetDraft(store);
    for (const rawQuestions of ['First', 'Second', 'Third']) {
      const result = saveWorksheetDraft(edit(draft, { rawQuestions }), store);
      expect(result.status).toBe('saved');
      draft = edit(draft, { rawQuestions, revision: result.revision });
    }
    expect(JSON.parse(store.getItem(DRAFT_KEY)).revision).toBe(3);
  });
  it('does not make other tabs stale by saving unchanged values', () => {
    const { store, stale, newer } = twoTabs();
    const unchanged = store.getItem(DRAFT_KEY);
    expect(saveWorksheetDraft(newer, store)).toEqual({ status: 'saved', revision: newer.revision });
    expect(store.getItem(DRAFT_KEY)).toBe(unchanged);
    expect(saveWorksheetDraft(edit(stale, { rawQuestions: 'First real edit' }), store).status).toBe('saved');
  });
  it('catches up without pausing when both tabs reach the same values', () => {
    const { store, stale, newer } = twoTabs();
    const { revision } = saveWorksheetDraft(edit(newer, { rawQuestions: 'Same text' }), store);
    expect(saveWorksheetDraft(edit(stale, { rawQuestions: 'Same text' }), store)).toEqual({ status: 'saved', revision });
  });
  it('saves again when the draft was removed elsewhere, because nothing can be overwritten', () => {
    const { store, stale } = twoTabs();
    store.entries.delete(DRAFT_KEY);
    expect(saveWorksheetDraft(edit(stale, { rawQuestions: 'Kept text' }), store).status).toBe('saved');
    expect(readWorksheetDraft(store).rawQuestions).toBe('Kept text');
  });
  it('treats a version-2 record without a revision as revision zero', () => {
    const { store } = twoTabs();
    const record = JSON.parse(store.getItem(DRAFT_KEY));
    delete record.revision;
    store.setItem(DRAFT_KEY, JSON.stringify(record));
    const draft = readWorksheetDraft(store);
    expect(draft.revision).toBe(0);
    expect(saveWorksheetDraft(edit(draft, { rawQuestions: 'Upgraded' }), store)).toEqual({ status: 'saved', revision: 1 });
  });
  it('pauses a tab with a revision when an older build rewrites the record without one', () => {
    const { store, stale } = twoTabs();
    const record = JSON.parse(store.getItem(DRAFT_KEY));
    delete record.revision;
    record.values.rawQuestions = 'Written by an older build';
    store.setItem(DRAFT_KEY, JSON.stringify(record));
    expect(saveWorksheetDraft(edit(stale, { difficulty: 'Exam-Style' }), store).status).toBe('paused');
    expect(readWorksheetDraft(store).rawQuestions).toBe('Written by an older build');
  });
  it.each(['{broken', '{"version":99,"values":{}}'])('never replaces a record that became unreadable: %s', unread => {
    const { store, stale } = twoTabs();
    store.setItem(DRAFT_KEY, unread);
    expect(saveWorksheetDraft(edit(stale, { difficulty: 'Exam-Style' }), store).status).toBe('paused');
    expect(store.getItem(DRAFT_KEY)).toBe(unread);
  });
  it('keeps the revision outside the saved field values', () => {
    const { store } = twoTabs();
    expect(Object.keys(JSON.parse(store.getItem(DRAFT_KEY)).values)).not.toContain('revision');
  });
});

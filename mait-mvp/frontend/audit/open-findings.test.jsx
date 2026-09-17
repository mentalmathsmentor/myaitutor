// Diagnostic acceptance suite: currently failing findings stay visible.
// Not part of the green regression suite until each planned repair lands.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import WorksheetStudio from '../src/sections/WorksheetStudio';
import stages from '../src/stage_subjects.json';
import { buildWorksheetRequest } from '../src/features/worksheet/utils/buildWorksheetRequest';

vi.mock('../src/features/worksheet/utils/buildWorksheetRequest', async (original) => {
  const actual = await original();
  return { ...actual, buildWorksheetRequest: vi.fn(actual.buildWorksheetRequest) };
});
vi.mock('../src/components/canvas/FeedbackBox', () => ({ FeedbackBox: () => null }));
vi.mock('framer-motion', async () => {
  const React = await import('react'); const tags = new Map();
  return { AnimatePresence: ({ children }) => children, motion: new Proxy({}, { get: (_, tag) => {
    if (!tags.has(tag)) tags.set(tag, React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, layout, ...props }, ref) => React.createElement(tag, { ...props, ref }, children)));
    return tags.get(tag);
  } }) };
});
let clipboard;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mait_ws_stage','Year 11');
  localStorage.setItem('mait_ws_subject','Mathematics Advanced');
  localStorage.setItem('mait_ws_canvasSetup','false');
  buildWorksheetRequest.mockClear();
  clipboard = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:clipboard}});
  vi.spyOn(window,'open').mockImplementation(() => null);
  vi.spyOn(window,'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('fetch',vi.fn(() => { throw new Error('Network disabled'); }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function mount(stage='Year 11',subject='Mathematics Advanced',brief='') {
  localStorage.setItem('mait_ws_stage',stage); localStorage.setItem('mait_ws_subject',subject);
  localStorage.setItem('mait_ws_rawQuestions',brief);
  return render(<WorksheetStudio setCurrentSection={() => {}} />);
}
function next() { fireEvent.click(screen.getByRole('button',{name:'Continue',exact:true})); }
async function copy() {
  fireEvent.click(screen.getByRole('button',{name:/Generate Instructions/}));
  await waitFor(() => expect(clipboard).toHaveBeenCalled());
  const prompt=clipboard.mock.calls.at(-1)[0];
  await waitFor(() => expect(screen.getByText('Instructions generated, copied, and ready for Gemini Canvas.')).toBeInTheDocument());
  fireEvent.keyDown(window,{key:'Escape'});
  return {prompt,request:buildWorksheetRequest.mock.results.at(-1).value};
}
const cases=Object.entries(stages).flatMap(([stage,subjects]) => Object.keys(subjects).map(subject=>[stage,subject]));
describe('all visible stage/subject combinations: topic-to-prompt contract',()=>{
  it.each(cases)('%s / %s retains a chosen topic or manual brief',async(stage,subject)=>{
    mount(stage,subject); next();
    const manual=['English','Chemistry','Biology'].includes(subject);
    let selectedLabel;
    if(manual){fireEvent.change(screen.getByPlaceholderText(`Paste the exact ${subject} brief, topic list, or teacher instructions here...`),{target:{value:'Synthetic curriculum-neutral brief'}});}
    else {
      const choices=screen.queryAllByRole('checkbox');
      expect(choices.length,'predefined choices should be available').toBeGreaterThan(0);
      selectedLabel=choices[0].closest('label')?.textContent.trim(); fireEvent.click(choices[0]);
    }
    const result=await copy();
    if(manual) expect(result.prompt).toContain('Synthetic curriculum-neutral brief');
    else expect(result.request.syllabusPacket.dotPoints.length,'chosen visible topic must reach prompt packet').toBeGreaterThan(0);
  });
});
describe('state transitions and error boundaries',()=>{
  it('Stage 4 Science does not expose the Mathematics topic tree',()=>{
    mount('Stage 4 (Yr 7-8)','Science'); next();
    expect(screen.queryByRole('checkbox',{name:'Number and Algebra',exact:true})).not.toBeInTheDocument();
  });
  it('Year 11 Physics does not expose Standard maths topics',()=>{
    mount('Year 11','Physics'); next();
    const labels=screen.getAllByRole('checkbox').map(c=>c.closest('label')?.textContent.trim().replace(/\s/g,' '));
    expect(labels).not.toContain('Financial Mathematics');
  });
  it('switching maths to manual-only English removes hidden maths points',async()=>{
    mount('Year 11','Mathematics Standard'); next();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button',{name:'Curriculum',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'English',exact:true})); next();
    fireEvent.change(screen.getByPlaceholderText('Paste the exact English brief, topic list, or teacher instructions here...'),{target:{value:'Write original reading-comprehension questions.'}});
    const {request}=await copy();
    expect(request.syllabusPacket.dotPoints).toEqual([]);
  });
  it('reloading a flat-topic course retains valid selections',()=>{
    mount('Stage 2 (Yr 3-4)','Mathematics'); next(); fireEvent.click(screen.getAllByRole('checkbox')[0]);
    const selected=localStorage.getItem('mait_ws_selectedPoints');
    cleanup(); mount('Stage 2 (Yr 3-4)','Mathematics');
    expect(localStorage.getItem('mait_ws_selectedPoints')).toBe(selected);
  });
  it('malformed stored selections do not crash the Studio',()=>{
    localStorage.setItem('mait_ws_selectedPoints','{}');
    expect(()=>mount()).not.toThrow();
  });
  it('invalid stored stage recovers without a ReferenceError',()=>{
    expect(()=>mount('retired-stage','Mathematics')).not.toThrow();
  });
  it('Full Worked Solutions alone enables an answer key',async()=>{
    mount('Year 11','Mathematics Advanced','Synthetic brief');next();next();next();
    fireEvent.click(screen.getByRole('checkbox',{name:/Full Worked Solutions/}));
    const {request}=await copy(); expect(request.worksheetSettings.answerKey).toContain('full worked solutions');
  });
  it('optional header label survives when Name space is off',async()=>{
    mount('Year 11','Mathematics Advanced','Synthetic brief');
    fireEvent.change(screen.getByPlaceholderText('School name or class label'),{target:{value:'Synthetic class'}});
    next();next();next();fireEvent.click(screen.getByRole('checkbox',{name:'Name space',exact:true}));
    const {request}=await copy();expect(request.worksheetSettings.headerSpaces).toContain('Synthetic class');
  });
  it('closing the page before the launch delay prevents opening Gemini',async()=>{
    vi.useFakeTimers(); const view=mount('Year 11','Mathematics Advanced','Synthetic brief');
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:/Generate Instructions/}));});
    view.unmount(); await act(async()=>{vi.advanceTimersByTime(3100);});
    expect(window.open).not.toHaveBeenCalled();
  });
  it('clipboard rejection displays an error and never launches',async()=>{
    clipboard.mockRejectedValue(new Error('Permission denied'));mount('Year 11','Mathematics Advanced','Synthetic brief');
    fireEvent.click(screen.getByRole('button',{name:/Generate Instructions/}));
    expect(await screen.findByText(/Could not copy the worksheet prompt: Permission denied/)).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
  });
  it('empty worksheet does not write the clipboard',()=>{
    mount();fireEvent.click(screen.getByRole('button',{name:/Generate Instructions/}));expect(clipboard).not.toHaveBeenCalled();
  });
  it('custom subject survives a reload',()=>{
    const view=mount('Year 11','Mathematics Advanced','Synthetic brief');
    fireEvent.click(screen.getByRole('button',{name:'Other (Custom)',exact:true}));
    fireEvent.change(screen.getByPlaceholderText('Enter custom subject name...'),{target:{value:'Synthetic History'}});
    view.unmount(); render(<WorksheetStudio setCurrentSection={()=>{}} />);
    expect(screen.queryByDisplayValue('Synthetic History')).toBeInTheDocument();
  });
  it('sidebar handoff rejects an unnamed custom subject',async()=>{
    mount('Year 11','Mathematics Advanced','Synthetic brief');
    fireEvent.click(screen.getByRole('button',{name:'Other (Custom)',exact:true}));
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:/Generate Instructions/}));});
    fireEvent.keyDown(window,{key:'Escape'});
    expect(clipboard).not.toHaveBeenCalled();
  });
  it('manual launch cancels the automatic launch timer',async()=>{
    vi.useFakeTimers();mount('Year 11','Mathematics Advanced','Synthetic brief');
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:/Generate Instructions/}));});
    fireEvent.click(screen.getByRole('button',{name:'Launch Gemini',exact:true}));
    await act(async()=>{vi.advanceTimersByTime(3100);});
    expect(window.open).toHaveBeenCalledTimes(1);
  });
  it('module-name search retains matching child topics',()=>{
    mount('Stage 4 (Yr 7-8)','Mathematics');next();
    fireEvent.change(screen.getByPlaceholderText('Find a topic or syllabus point...'),{target:{value:'Number and Algebra'}});
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(1);
  });
  it('context buttons expose selected state to assistive technology',()=>{
    mount('Year 11','Mathematics Advanced','Synthetic brief');next();next();
    const search=screen.getByRole('button',{name:'Ask Gemini to search NESA'});fireEvent.click(search);
    expect(search).toHaveAttribute('aria-pressed','true');
  });
  it('copy modal has dialog semantics',async()=>{
    mount('Year 11','Mathematics Advanced','Synthetic brief');
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:/Generate Instructions/}));});
    const dialog=screen.queryByRole('dialog');fireEvent.keyDown(window,{key:'Escape'});
    expect(dialog).not.toBeNull();
  });
});

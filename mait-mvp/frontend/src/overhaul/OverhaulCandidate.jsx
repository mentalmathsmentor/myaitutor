import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, CheckCheck, ChevronRight, Download, Expand, FileText, Flag, Lightbulb, Minus, MonitorOff, Pause, Play, Plus, RotateCcw, Settings2, ShieldCheck, UserRound, X } from 'lucide-react';
import './overhaul.css';

const LESSONS = [
  { id: 'maths', time: '09:00', duration: 45, subject: 'Mathematics', title: 'Find the missing value.', short: 'Linear equations', group: 'Sample class A', room: 'Room 04', purpose: 'Make each side of an equation balance, then explain why your solution works.', resources: ['Board and pens', 'Paper or exercise books'], start: 'Write 3x + 7 = 22 on the board. Ask: what has happened to the unknown value?', steps: [{ title: 'Notice the structure', text: 'Give everyone a quiet minute. Invite two descriptions of what the equation means.', minutes: 5 }, { title: 'Model the inverse steps', text: 'Subtract 7 from both sides, then divide both sides by 3. Keep each new line aligned.', minutes: 10 }, { title: 'Try, compare, explain', text: 'Ask pairs to solve 4x + 6 = 26. Compare their methods, then substitute the answer to check.', minutes: 20 }, { title: 'Leave a useful trace', text: 'Ask everyone to write one equation of their own and show how to check its solution.', minutes: 10 }], note: 'Record the methods the class used and any follow-up the regular teacher may find useful.' },
  { id: 'english', time: '10:00', duration: 45, subject: 'English', title: 'A detail that changes everything.', short: 'Descriptive writing', group: 'Sample class B', room: 'Room 08', purpose: 'Use one precise detail to suggest a setting rather than listing everything in it.', resources: ['Board and pens', 'Paper or exercise books'], start: 'Write: “The room was empty.” Invite a single detail that could change how the room feels.', steps: [{ title: 'Collect possibilities', text: 'Gather a few contrasting details. Ask how each one changes the picture in the reader’s mind.', minutes: 5 }, { title: 'Write a shared opening', text: 'Model a short paragraph. Pause to choose one detail and explain your choice.', minutes: 10 }, { title: 'Write, read, refine', text: 'Invite a short independent description. In pairs, underline the detail that does the most work.', minutes: 20 }, { title: 'Make one deliberate edit', text: 'Ask writers to replace one general word with a precise observation, then share the difference.', minutes: 10 }], note: 'Note the writing prompt used and where students left their drafts.' },
  { id: 'science', time: '11:15', duration: 45, subject: 'Science', title: 'Observe before you explain.', short: 'Scientific observation', group: 'Sample class C', room: 'Room 06', purpose: 'Distinguish an observation from an inference using familiar classroom objects.', resources: ['A familiar classroom object', 'Paper or exercise books'], start: 'Place an everyday object where everyone can see it. Ask for facts you can observe directly.', steps: [{ title: 'Look closely', text: 'Ask for silent observations first, then collect descriptions without explanations.', minutes: 5 }, { title: 'Sort the statements', text: 'Make two columns: “I observe” and “I infer”. Move each statement together and discuss why.', minutes: 10 }, { title: 'Test the distinction', text: 'In pairs, choose another safe classroom object. Write three observations and one inference.', minutes: 20 }, { title: 'Explain your evidence', text: 'Invite a pair to explain which evidence supports their inference and what remains uncertain.', minutes: 10 }], note: 'Record any questions the class wants to investigate next. No practical experiment is included.' },
];
const QUESTION = { coefficient: 3, constant: 7, total: 22 };
const CORRECT_ANSWER = (QUESTION.total - QUESTION.constant) / QUESTION.coefficient;
const HINTS = ['First undo the + 7. Whatever you do to one side, do to the other side too.', 'Subtracting 7 from each side gives 3x = 15. What operation will leave just x?', 'Divide each side by 3. Check your value by substituting it into the original equation.'];
const STATUS_CLASS = { 'To prepare': 'prepare', Ready: 'ready', Teaching: 'teaching', Finished: 'finished' };
const Icon = ({ as: Component, ...props }) => <Component size={18} strokeWidth={1.7} aria-hidden="true" {...props} />;
const formatTime = value => `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;

function Brand({ onClick }) {
  return <button className="studio-brand" onClick={onClick} aria-label="MyAITutor preview home"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>MyAITutor<span className="brand-descriptor">TEACHING STUDIO</span></span></button>;
}

function Candidate() {
  const [surface, setSurface] = useState('home');
  const [lessonOrder, setLessonOrder] = useState(LESSONS.map(lesson => lesson.id));
  const [selectedId, setSelectedId] = useState('maths');
  const [statuses, setStatuses] = useState({ maths: 'To prepare', english: 'To prepare', science: 'To prepare' });
  const [notes, setNotes] = useState({ maths: '', english: '', science: '' });
  const [adaptations, setAdaptations] = useState({});
  const [adaptationType, setAdaptationType] = useState('shorter');
  const [teaching, setTeaching] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState({ maths: 0, english: 0, science: 0 });
  const [running, setRunning] = useState(false);
  const [mentorVisible, setMentorVisible] = useState(false);
  const [modal, setModal] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [answer, setAnswer] = useState('');
  const [checkedAnswer, setCheckedAnswer] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const [landingOptions, setLandingOptions] = useState({ shorter: false, noProjector: false });
  const [previewLessonId, setPreviewLessonId] = useState('maths');
  const headingRef = useRef(null);
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const lastSurface = useRef(surface);
  const timerStartRef = useRef(null);
  const timerMillisecondsRef = useRef({ maths: 0, english: 0, science: 0 });
  const lesson = LESSONS.find(item => item.id === selectedId);
  const sampleLesson = LESSONS.find(item => item.id === previewLessonId);
  const activeAdaptation = adaptations[selectedId];
  const currentStatus = statuses[selectedId];
  const readyCount = Object.values(statuses).filter(status => status !== 'To prepare').length;

  useEffect(() => {
    if (lastSurface.current !== surface) {
      headingRef.current?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
      lastSurface.current = surface;
    }
  }, [surface]);

  useEffect(() => {
    if (!running || !teaching || surface !== 'day') return undefined;
    const update = () => {
      const active = timerStartRef.current;
      if (!active) return;
      const seconds = Math.floor((timerMillisecondsRef.current[active.id] + Math.max(0, Date.now() - active.at)) / 1000);
      setElapsed(current => current[active.id] === seconds ? current : { ...current, [active.id]: seconds });
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [running, teaching, surface, selectedId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (modal && dialog && !dialog.open) dialog.showModal();
    if (!modal && dialog?.open) dialog.close();
  }, [modal]);

  useEffect(() => {
    if (!announcement) return undefined;
    const timeout = window.setTimeout(() => setAnnouncement(''), 7000);
    return () => window.clearTimeout(timeout);
  }, [announcement]);

  const pauseTimer = () => {
    const active = timerStartRef.current;
    if (active) {
      timerMillisecondsRef.current[active.id] += Math.max(0, Date.now() - active.at);
      const seconds = Math.floor(timerMillisecondsRef.current[active.id] / 1000);
      setElapsed(current => ({ ...current, [active.id]: seconds }));
      timerStartRef.current = null;
    }
    setRunning(false);
  };
  const toggleTimer = () => {
    if (running) pauseTimer();
    else { timerStartRef.current = { id: selectedId, at: Date.now() }; setRunning(true); }
  };
  const resetTimer = () => {
    pauseTimer();
    timerMillisecondsRef.current[selectedId] = 0;
    setElapsed(current => ({ ...current, [selectedId]: 0 }));
    announce('Lesson timer reset.');
  };
  const changeView = commit => {
    if (typeof document.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const transition = document.startViewTransition(() => flushSync(commit));
      transition.ready.catch(() => {});
    } else commit();
  };
  const navigate = next => changeView(() => {
    pauseTimer(); setSurface(next); setAnnouncement('');
  });
  const announce = message => setAnnouncement(message);
  const openModal = (type, event) => { returnFocusRef.current = event.currentTarget; setModal(type); };
  const closeModal = () => { setModal(null); window.requestAnimationFrame(() => returnFocusRef.current?.focus()); };
  const selectLesson = id => { pauseTimer(); if (id !== selectedId) setStepIndex(0); setSelectedId(id); setTeaching(false); };
  const reorderLesson = (id, direction) => {
    setLessonOrder(current => {
      const next = [...current];
      const index = next.indexOf(id);
      const destination = index + direction;
      if (destination < 0 || destination >= next.length) return current;
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
    announce(`${LESSONS.find(item => item.id === id).subject} moved ${direction < 0 ? 'earlier' : 'later'} in the day outline. Sample start times remain reference times.`);
  };
  const changeStatus = status => { setStatuses(current => ({ ...current, [selectedId]: status })); announce(`${lesson.subject}: ${status}.`); };
  const startTeaching = () => changeView(() => { setTeaching(true); changeStatus('Teaching'); });
  const exitTeaching = () => changeView(() => { pauseTimer(); setTeaching(false); });
  const finishTeaching = () => changeView(() => {
    pauseTimer(); setTeaching(false); changeStatus('Finished');
    window.requestAnimationFrame(() => document.getElementById('handover-note')?.focus());
  });
  const applyAdaptation = () => {
    setAdaptations(current => ({ ...current, [selectedId]: adaptationType }));
    setStatuses(current => ({ ...current, [selectedId]: 'To prepare' }));
    closeModal();
    announce('Example adaptation applied. Review the lesson, then mark it ready when you are satisfied.');
  };
  const handoverText = () => `MYAITUTOR — SAMPLE DAY HANDOVER\nDesign preview · fictional classes · in-memory notes\n\n${lessonOrder.map(id => {
    const item = LESSONS.find(entry => entry.id === id);
    return `${item.subject.toUpperCase()} — ${item.short}\n${item.group} · ${item.room} · reference start ${item.time}\nStatus: ${statuses[id]}\nAdaptation: ${adaptations[id] === 'shorter' ? 'Shorter lesson example' : adaptations[id] === 'no-projector' ? 'No projector example' : 'Original sample'}\nTimer: ${formatTime(elapsed[id])}\nHandover note: ${notes[id].trim() || 'No note entered.'}`;
  }).join('\n\n')}\n\nThis is an example generated locally from the preview. No learner answers are included.\n`;
  const downloadHandover = () => {
    const url = URL.createObjectURL(new Blob([handoverText()], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'myaitutor-sample-handover.txt';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Sample handover download requested. Your browser controls where the file is saved.');
  };
  const checkAnswer = event => {
    event.preventDefault();
    const value = answer.trim();
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) {
      setCheckedAnswer({ state: 'invalid', value, message: 'Enter a number for x, then check again.' });
    } else if (Number(value) === CORRECT_ANSWER) {
      setCheckedAnswer({ state: 'correct', value, message: `Yes. 3 × ${CORRECT_ANSWER} + 7 = 22, so both sides balance.` });
    } else {
      setCheckedAnswer({ state: 'retry', value, message: 'The two sides do not balance yet. Try undoing the + 7 first, or open a hint.' });
    }
  };

  return <div className={`teaching-studio studio-surface-${surface}${teaching ? ' is-teaching' : ''}`}>
    <a className="studio-skip" href="#studio-main">Skip to content</a>
    <div className="preview-ribbon"><span className="preview-dot" /> INTERACTIVE DESIGN PREVIEW <span className="ribbon-detail">Fictional classes. Local examples. No live AI.</span></div>
    <header className="studio-header">
      <Brand onClick={() => navigate('home')} />
      <nav aria-label="Preview surfaces" className="studio-nav">
        <button onClick={() => navigate('home')} aria-current={surface === 'home' ? 'page' : undefined}>Overview</button>
        <button onClick={() => navigate('day')} aria-current={surface === 'day' ? 'page' : undefined}>Your teaching day</button>
        <button onClick={() => navigate('practice')} aria-current={surface === 'practice' ? 'page' : undefined}>Practice preview</button>
      </nav>
      <button className="studio-button small header-action" onClick={() => surface === 'day' ? openModal('handover', { currentTarget: document.activeElement }) : navigate('day')}>{surface === 'day' ? 'Day handover' : 'Try a relief day'}<Icon as={surface === 'day' ? FileText : ArrowUp} className={surface === 'day' ? '' : 'diagonal-arrow'} /></button>
    </header>

    <main id="studio-main" className="studio-main">
      {surface === 'home' && <div className="surface-arrival">
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="studio-eyebrow"><span className="eyebrow-rule" /> FOR THE TEACHER WALKING INTO A NEW ROOM</p>
            <h1 ref={headingRef} tabIndex={-1}>Make the day<br /><span>teachable.</span></h1>
            <p className="hero-description">A clear plan. Room to adapt.<br />A useful handover when the bell goes.</p>
            <p className="hero-support">Meet a calmer workspace for relief teaching. Bring a sample day into focus, one lesson at a time.</p>
            <div className="hero-actions"><button className="studio-button primary" onClick={() => navigate('day')}>Try a relief day <Icon as={ArrowRight} /></button><a className="text-link" href="#how-the-day-works">See how it flows <Icon as={ArrowDown} /></a></div>
            <div className="offer-note"><Icon as={ShieldCheck} /><span>Explore the day-pass concept.<br /><strong>No purchase or account needed for this preview.</strong></span></div>
            <div className="hero-index" aria-hidden="true"><span>01 / PREPARE</span><span>02 / TEACH</span><span>03 / HAND OVER</span></div>
          </div>
          <div className="hero-sample">
            <div className="sample-caption"><span className="tiny-label">A LITTLE CLARITY, BEFORE THE BELL</span><span className="sample-tag">SAMPLE DAY</span></div>
            <div className="sample-workspace">
              <div className="sample-topbar"><span><span className="mini-mark" /> Your day, at a glance</span><span className="sample-date">Relief day / preview</span></div>
              <div className="sample-workspace-body">
                <div className="sample-day-rail" aria-label="Sample lesson selection">
                  {LESSONS.map((item, index) => <button key={item.id} className={`sample-rail-item ${previewLessonId === item.id ? 'selected' : ''}`} aria-pressed={previewLessonId === item.id} onClick={() => setPreviewLessonId(item.id)}><span className="rail-node">{index + 1}</span><span><small>{item.time}</small><strong>{item.subject}</strong><em>{item.group}</em></span></button>)}
                  <div className="sample-rail-end"><span className="rail-node"><Icon as={Flag} size={12} /></span><span>A good handover</span></div>
                </div>
                <article className="sample-document document-arrival" key={previewLessonId}>
                  <div className="document-meta"><span>{sampleLesson.subject.toUpperCase()}</span><span>{landingOptions.shorter ? '25' : '45'} MIN</span></div>
                  <h2>{sampleLesson.title}</h2><p>{sampleLesson.purpose}</p>
                  <div className="sample-instruction"><span className="tiny-label">START HERE</span><p>{landingOptions.shorter ? 'Use one shared example, then ask pairs to explain their thinking.' : sampleLesson.start}</p></div>
                  <div className="sample-materials"><Icon as={landingOptions.noProjector ? MonitorOff : FileText} /><span>{landingOptions.noProjector ? 'Board + paper. No projector needed.' : 'Simple materials. A clear starting point.'}</span></div>
                  <button className="document-open" onClick={() => { selectLesson(previewLessonId); navigate('day'); }}>Open this lesson <Icon as={ArrowRight} /></button>
                </article>
              </div>
              <div className="sample-adapt-bar"><span><Icon as={Settings2} /> Change the example</span><button className={landingOptions.shorter ? 'active' : ''} aria-pressed={landingOptions.shorter} onClick={() => setLandingOptions(current => ({ ...current, shorter: !current.shorter }))}>Shorter lesson {landingOptions.shorter ? <Icon as={Check} size={14} /> : <Icon as={Plus} size={14} />}</button><button className={landingOptions.noProjector ? 'active' : ''} aria-pressed={landingOptions.noProjector} onClick={() => setLandingOptions(current => ({ ...current, noProjector: !current.noProjector }))}>No projector {landingOptions.noProjector ? <Icon as={Check} size={14} /> : <Icon as={Plus} size={14} />}</button></div>
            </div>
            <div className="sample-footnote"><span className="blue-square" /><p>A sample, not a promise of live generation.<br />You review every change before it becomes your plan.</p><span className="sample-number">/ 01</span></div>
          </div>
        </section>

        <section id="how-the-day-works" className="day-flow-section">
          <div className="section-intro"><p className="studio-eyebrow">ONE CONTINUOUS THREAD</p><h2>From the first bell<br />to the last note.</h2><p>The working day has enough moving parts.<br />Your workspace should bring them together.</p></div>
          <div className="flow-cards"><article><span className="flow-number">01</span><Icon as={BookOpen} /><h3>See the shape of the day.</h3><p>Choose a lesson, check the purpose and gather what you need. Start with something concrete.</p><span className="flow-label">PREPARE WITH INTENTION</span></article><article><span className="flow-number">02</span><Icon as={Settings2} /><h3>Make it fit the room.</h3><p>Try a shorter example or a board-only approach. Read the change, then decide whether to keep it.</p><span className="flow-label">YOU MAKE THE CALL</span></article><article><span className="flow-number">03</span><Icon as={FileText} /><h3>Leave the next step clear.</h3><p>Keep notes with the lesson and export a simple handover. The detail stays connected to the day.</p><span className="flow-label">FINISH WITH CONTEXT</span></article></div>
        </section>
        <section className="practice-invitation"><div className="invitation-symbol" aria-hidden="true">x<span>=</span>?</div><div><p className="studio-eyebrow">A QUIETER SPACE TO THINK</p><h2>One question.<br />A little more understanding.</h2><p>Explore the learner practice direction for teacher and tutor accounts. A focused question, useful hints and room to try again.</p></div><button className="studio-button" onClick={() => navigate('practice')}>Explore sample practice <Icon as={ArrowRight} /></button></section>
        <section className="landing-close"><span className="tiny-label">THE RELIEF DAY PASS · CONCEPT PREVIEW</span><h2>A new room.<br /><span>A clearer starting point.</span></h2><button className="studio-button primary" onClick={() => navigate('day')}>Step into the sample day <Icon as={ArrowRight} /></button><p>Pricing and account access are not connected in this candidate.</p></section>
      </div>}

      {surface === 'day' && <div className="day-surface surface-arrival">
        <div className="workspace-heading"><div><p className="studio-eyebrow">RELIEF DAY / FICTIONAL CLASSES</p><h1 ref={headingRef} tabIndex={-1}>{teaching ? 'Stay with the lesson.' : 'A clear path through today.'}</h1></div><div className="day-readiness"><span><strong>{readyCount}</strong> / {LESSONS.length}</span><small>lessons reviewed or started</small><div className="readiness-track" aria-hidden="true"><span style={{ width: `${readyCount / LESSONS.length * 100}%` }} /></div></div></div>
        <div className="workspace-grid">
          <aside className="day-sidebar" aria-label="Sample day outline"><div className="rail-heading"><span className="tiny-label">YOUR DAY OUTLINE</span><span className="outline-count">{LESSONS.length}</span></div><p className="rail-reference">Times are sample references.<br />Move lessons to change their order.</p><ol className="day-rail">{lessonOrder.map((id, index) => { const item = LESSONS.find(entry => entry.id === id); return <li key={id} className={selectedId === id ? 'selected' : ''}><div className="lesson-rail-line"><button className="lesson-select" aria-current={selectedId === id ? 'step' : undefined} onClick={() => selectLesson(id)}><span className="rail-node">{statuses[id] === 'Finished' ? <Icon as={Check} size={12} /> : index + 1}</span><span><small>{item.time}</small><strong>{item.subject}</strong><em>{item.short}</em><span className={`status-label ${STATUS_CLASS[statuses[id]]}`}><span />{statuses[id]}</span></span></button><div className="reorder-actions"><button className="icon-button" aria-label={`Move ${item.subject} earlier`} disabled={index === 0} onClick={() => reorderLesson(id, -1)}><Icon as={ArrowUp} size={13} /></button><button className="icon-button" aria-label={`Move ${item.subject} later`} disabled={index === lessonOrder.length - 1} onClick={() => reorderLesson(id, 1)}><Icon as={ArrowDown} size={13} /></button></div></div></li>; })}<li className="day-end"><span className="rail-node"><Icon as={Flag} size={13} /></span><button onClick={event => openModal('handover', event)}>Leave a useful handover <Icon as={ChevronRight} size={14} /></button></li></ol><div className="sidebar-note"><Icon as={ShieldCheck} /><p>This is your local sample day.<br />Notes stay in this open preview until you export or reload.</p></div><button className="mentor-toggle" onClick={() => setMentorVisible(current => !current)}><Icon as={UserRound} />{mentorVisible ? 'Hide mentor position' : 'Show mentor position'}<Icon as={mentorVisible ? Minus : Plus} size={14} /></button></aside>

          <div className="lesson-column">
            <div className="lesson-toolbar"><span><Icon as={FileText} /> LESSON DOCUMENT</span><div>{teaching ? <button className="text-link" onClick={exitTeaching}>Exit teaching view <Icon as={X} size={15} /></button> : <button className="text-link" onClick={startTeaching}>Teaching view <Icon as={Expand} size={15} /></button>}</div></div>
            <article className="lesson-document document-arrival" key={`${selectedId}-${teaching}`}>
              <div className="document-meta"><span>{lesson.subject.toUpperCase()} / {lesson.group.toUpperCase()}</span><span>{activeAdaptation === 'shorter' ? '25' : lesson.duration} MIN · {lesson.room.toUpperCase()}</span></div>
              <div className="lesson-title-row"><h2>{lesson.title}</h2><span className={`status-label ${STATUS_CLASS[currentStatus]}`}><span />{currentStatus}</span></div>
              <p className="lesson-purpose">{lesson.purpose}</p>
              {activeAdaptation && <div className="applied-adaptation"><Icon as={CheckCheck} /><span>{activeAdaptation === 'shorter' ? 'Shorter lesson example applied' : 'Board-only example applied'}</span><button disabled={teaching} title={teaching ? 'Exit teaching view to restore the original plan' : undefined} onClick={() => { setAdaptations(current => ({ ...current, [selectedId]: null })); changeStatus('To prepare'); }}>Restore original</button></div>}
              {teaching ? <div className="teaching-content"><div className="teaching-context"><span className="tiny-label">CURRENT INSTRUCTION</span><span>{stepIndex + 1} / {lesson.steps.length}</span></div><h3 aria-live="polite">{lesson.steps[stepIndex].title}</h3><p>{activeAdaptation === 'shorter' && stepIndex === 2 ? 'Choose one example for pairs to work through. Ask them to explain a step rather than complete a longer set.' : lesson.steps[stepIndex].text}</p><div className="step-navigation"><button className="studio-button small" disabled={stepIndex === 0} onClick={() => setStepIndex(current => current - 1)}><Icon as={ArrowLeft} />Previous step</button><button className="studio-button primary small" disabled={stepIndex === lesson.steps.length - 1} onClick={() => setStepIndex(current => current + 1)}>Next step<Icon as={ArrowRight} /></button></div><div className="teaching-timer"><div><span className="tiny-label">LESSON TIMER · {running ? 'RUNNING' : 'PAUSED'}</span><strong role="timer" aria-label={`Elapsed lesson time ${formatTime(elapsed[selectedId])}`}>{formatTime(elapsed[selectedId])}</strong></div><div className="timer-actions"><button className="studio-button small" onClick={toggleTimer}><Icon as={running ? Pause : Play} />{running ? 'Pause' : 'Start'}</button><button className="icon-button" aria-label="Reset lesson timer" onClick={resetTimer}><Icon as={RotateCcw} /></button></div></div><p className="timer-note">You control the pace. The timer never advances the lesson.</p><button className="finish-button" onClick={finishTeaching}><Icon as={CheckCheck} />Finish this lesson</button></div> : <>
                <div className="document-resources"><span className="tiny-label">HAVE TO HAND</span><div>{lesson.resources.map(resource => <span key={resource}><Icon as={Check} size={13} />{resource}</span>)}{activeAdaptation === 'no-projector' && <span><Icon as={MonitorOff} size={13} />No screen required</span>}</div></div>
                <div className="opening-instruction"><span className="tiny-label">THE OPENING MOVE</span><p>{lesson.start}</p>{activeAdaptation === "no-projector" && <p className="board-only-note"><Icon as={MonitorOff} size={14} />Keep the prompt on the board. Give one spoken instruction at a time; learners work on paper.</p>}</div>
                <ol className="teaching-steps">{lesson.steps.map((step, index) => <li key={step.title}><span className="instruction-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}<small>{activeAdaptation === 'shorter' ? [3, 7, 10, 5][index] : step.minutes} min</small></h3><p>{activeAdaptation === 'shorter' && index === 2 ? 'Choose one example for pairs to work through. Ask them to explain a step rather than complete a longer set.' : step.text}</p></div></li>)}</ol>
                <div className="document-bottom"><span><Icon as={ShieldCheck} />Check this example fits your class and school.</span><button className="studio-button primary small" onClick={() => changeStatus(currentStatus === 'Ready' ? 'To prepare' : 'Ready')}><Icon as={currentStatus === 'Ready' ? RotateCcw : Check} />{currentStatus === 'Ready' ? 'Reopen review' : 'Mark ready'}</button></div>
              </>}
            </article>
            <section className="handover-note"><div><Icon as={FileText} /><h3>A note for the next teacher.</h3><span>LOCAL DRAFT</span></div><label htmlFor="handover-note">{lesson.note}</label><textarea id="handover-note" value={notes[selectedId]} onChange={event => setNotes(current => ({ ...current, [selectedId]: event.target.value }))} placeholder="What did you cover? Where should the next lesson begin?" rows={3} /><p>Use fictional details in this preview. Export your draft before closing or reloading.</p></section>
          </div>

          <aside className="support-column" aria-label="Lesson support"><section className="adaptation-panel"><div className="support-panel-icon"><Icon as={Settings2} /></div><p className="studio-eyebrow">MAKE ROOM FOR REALITY</p><h2>The plan can bend.</h2><p>Try a small, prepared change.<br />You review it before it applies.</p><label htmlFor="adaptation-choice">Example adjustment</label><select id="adaptation-choice" value={adaptationType} onChange={event => setAdaptationType(event.target.value)} disabled={teaching}><option value="shorter">A shorter lesson</option><option value="no-projector">No projector available</option></select><button className="studio-button" disabled={teaching} onClick={event => openModal('adaptation', event)}>Review example change<Icon as={ArrowRight} /></button>{teaching ? <small>Exit teaching view to review a change.</small> : <small>Prepared example · no AI request</small>}</section>
            {mentorVisible && <Companion onHide={() => setMentorVisible(false)} />}
            <div className="support-footnote"><span className="blue-square" /><p>Clear structure.<br />Human judgement.<br /><strong>You lead the room.</strong></p></div>
          </aside>
        </div>
      </div>}

      {surface === 'practice' && <div className="practice-surface surface-arrival"><div className="practice-topline"><button className="text-link" onClick={() => navigate('day')}><Icon as={ArrowLeft} />Back to your sample day</button><span className="sample-tag">LEARNER PRACTICE / SAMPLE</span></div><div className="practice-layout"><div className="practice-reading"><p className="studio-eyebrow">A MOMENT TO WORK IT OUT</p><h1 ref={headingRef} tabIndex={-1}>Find your next step.</h1><p className="practice-intro">One equation. Take your time.<br />The aim is to understand why your answer works.</p><section className="practice-problem"><div className="practice-problem-header"><span className="tiny-label">ALGEBRA / LINEAR EQUATIONS</span><Icon as={BookOpen} /></div><h2>Solve for <i>x</i>.</h2><div className="display-equation" aria-label="3 x plus 7 equals 22"><span>3<i>x</i> + 7</span><b>=</b><span>22</span></div><p>Keep both sides balanced as you work.</p><form onSubmit={checkAnswer}><label htmlFor="practice-answer">Your value for x</label><div className="answer-field"><span aria-hidden="true">x =</span><input id="practice-answer" type="text" inputMode="decimal" autoComplete="off" value={answer} onChange={event => setAnswer(event.target.value)} aria-describedby={`answer-guidance${checkedAnswer ? ' answer-feedback' : ''}`} aria-invalid={checkedAnswer?.state === 'invalid' || undefined} placeholder="Enter a number" /><button className="studio-button primary" type="submit">Check answer<Icon as={ArrowRight} /></button></div><small id="answer-guidance">You can change your answer and check again.</small></form>{checkedAnswer && <div id="answer-feedback" className={`answer-feedback ${checkedAnswer.state}`} role="status"><Icon as={checkedAnswer.state === 'correct' ? CheckCheck : Lightbulb} /><div><strong>{checkedAnswer.state === 'correct' ? 'That balances.' : checkedAnswer.state === 'invalid' ? 'A number will do.' : 'Try another step.'}</strong><p>{checkedAnswer.message}</p><small>Checked answer: {checkedAnswer.value || '(empty)'}</small></div></div>}<div className="practice-help-actions"><button className="text-link" disabled={hintCount >= HINTS.length} onClick={() => setHintCount(current => Math.min(current + 1, HINTS.length))}><Icon as={Lightbulb} />{hintCount === 0 ? 'A hint, please' : hintCount < HINTS.length ? 'Show the next hint' : 'All hints are open'}<Icon as={Plus} size={14} /></button><button className="quiet-reset" onClick={() => { setAnswer(''); setCheckedAnswer(null); setHintCount(0); document.getElementById('practice-answer')?.focus(); }}>Start again<Icon as={RotateCcw} size={14} /></button></div>{hintCount > 0 && <ol className="practice-hints" aria-label="Progressive hints" aria-live="polite">{HINTS.slice(0, hintCount).map((hint, index) => <li className="inline-arrival" key={hint}><span>0{index + 1}</span><p>{hint}</p></li>)}</ol>}</section><div className="practice-privacy"><Icon as={ShieldCheck} /><p>Deterministic sample feedback. No AI, grading record or learner profile.<br />Your draft stays in this open preview and clears on reload.</p></div></div><aside className="practice-aside"><div className="practice-margin-note"><span className="margin-line" /><p>There is room<br />to think here.</p><span className="tiny-label">TRY · NOTICE · UNDERSTAND</span></div>{mentorVisible ? <Companion onHide={() => setMentorVisible(false)} /> : <button className="text-link" onClick={() => setMentorVisible(true)}><Icon as={UserRound} />Show mentor position</button>}<div className="practice-account-note"><Icon as={BookOpen} /><p>Practice is designed as part of a teacher or tutor account. This separate preview does not change account access.</p></div></aside></div></div>}
    </main>

    <footer className="studio-footer"><span>MyAITutor <span>/ Teaching Studio</span></span><p>Design candidate · examples stay local · existing application preserved</p><button onClick={event => openModal('about', event)}>About this preview <Icon as={Plus} size={13} /></button></footer>
    <div className="studio-announcement" role="status" aria-live="polite">{announcement}</div>

    <dialog ref={dialogRef} className="studio-dialog" aria-labelledby="studio-dialog-title" onCancel={event => { event.preventDefault(); closeModal(); }} onClick={event => { if (event.target === event.currentTarget) closeModal(); }}>
      <div className="dialog-heading"><span className="tiny-label">{modal === 'adaptation' ? 'REVIEW BEFORE APPLYING' : modal === 'handover' ? 'LOCAL DOCUMENT PREVIEW' : 'A SEPARATE DESIGN CANDIDATE'}</span><button className="icon-button" aria-label="Close dialog" onClick={closeModal}><Icon as={X} /></button></div>
      {modal === 'adaptation' && <><h2 id="studio-dialog-title">{adaptationType === 'shorter' ? 'Less time. A clear focus.' : 'The board is enough.'}</h2><p className="dialog-description">A prepared example for {lesson.subject.toLowerCase()}. Read the change and decide whether it belongs in your lesson.</p><div className="adaptation-comparison"><div><span className="tiny-label">CURRENT PLAN</span><h3>{activeAdaptation === 'shorter' ? 25 : lesson.duration} minute lesson</h3><p>{activeAdaptation === 'shorter' ? 'Shorter lesson example: 3 minutes to notice, 7 to model, 10 for a paired example, and 5 to close.' : activeAdaptation === 'no-projector' ? 'Board-only example: keep the prompt on the board, give spoken instructions, and record work on paper.' : lesson.steps[2].text}</p></div><div><span className="tiny-label">PROPOSED EXAMPLE</span><h3>{adaptationType === 'shorter' ? '25 minutes · one focused example' : '45 minutes · board and paper'}</h3><p>{adaptationType === 'shorter' ? 'Use 3 minutes to notice, 7 to model, 10 for one paired example, and 5 for a closing explanation. Choose one example rather than a longer set.' : 'Keep the opening prompt on the board and give spoken instructions one step at a time. Learners record their work on paper. No projector or screen is needed.'}</p></div></div><p className="dialog-note"><Icon as={ShieldCheck} /><span>{activeAdaptation && activeAdaptation !== adaptationType ? 'This replaces your current adjustment. ' : ''}Applying reopens the lesson for your review. It does not mark it ready.</span></p><div className="dialog-actions"><button className="studio-button" onClick={closeModal}>Keep current plan</button><button className="studio-button primary" onClick={applyAdaptation}>Apply example change<Icon as={Check} /></button></div></>}
      {modal === 'handover' && <><h2 id="studio-dialog-title">Leave the thread intact.</h2><p className="dialog-description">Review the sample day and your notes. Download creates a plain text file on this device; nothing is sent to a school or another person.</p><pre className="handover-preview">{handoverText()}</pre><div className="dialog-actions"><button className="studio-button" onClick={closeModal}>Back to the day</button><button className="studio-button primary" onClick={downloadHandover}>Download sample handover<Icon as={Download} /></button></div></>}
      {modal === 'about' && <><h2 id="studio-dialog-title">A working direction.</h2><p className="dialog-description">This local React candidate explores a relief-teacher day pass, a day workspace and learner practice for teacher or tutor accounts.</p><ul className="about-list"><li>All lesson and class details are fictional examples.</li><li>Adaptations and answer feedback are prepared locally.</li><li>No purchases, accounts, AI services or application routes are connected.</li><li>No final realistic mentor asset is available.</li><li>Draft notes and learner responses clear when this page reloads. A handover downloads only when requested.</li></ul><div className="dialog-actions"><button className="studio-button primary" onClick={closeModal}>Continue exploring<Icon as={ArrowRight} /></button></div></>}
    </dialog>
  </div>;
}

function Companion({ onHide }) {
  return <section className="companion-panel" aria-label="Optional mentor design position"><div className="companion-label"><span className="tiny-label">A QUIET PRESENCE</span><button className="icon-button" onClick={onHide} aria-label="Hide mentor position"><Icon as={Minus} size={14} /></button></div><div className="companion-portrait" data-companion-asset="pending"><div className="portrait-corner top-left" /><div className="portrait-corner bottom-right" /><span className="portrait-placeholder"><Icon as={UserRound} size={34} strokeWidth={1} /><span>PORTRAIT PENDING</span></span><span className="portrait-index">MENTOR / 01</span></div><h3>Space for a mentor.</h3><p>Reserved for a realistic adult male companion. The final portrait or model is not available yet.</p><span className="companion-caption">Optional. Quiet. Out of your way.</span></section>;
}

const mount = document.getElementById('overhaul-root');
if (mount) createRoot(mount).render(<Candidate />);

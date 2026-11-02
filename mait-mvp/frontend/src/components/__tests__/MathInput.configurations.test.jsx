import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import MathInput from '../MathInput';

function Input({ initial = '', ...props }) {
  const [value, setValue] = useState(initial);
  return <MathInput value={value} onChange={setValue} aria-label="Test brief" {...props} />;
}

// Expected public key behaviour, independent of the component's implementation.
const keys = [
  ['frac', '\\frac{}{}', 6], ['sqrt', '\\sqrt{}', 6], ['pow', '^{}', 2], ['sub', '_{}', 2],
  ['pi', '\\pi', 3], ['theta', '\\theta', 6], ['sin', '\\sin()', 6], ['cos', '\\cos()', 6],
  ['tan', '\\tan()', 6], ['log', '\\log()', 6], ['ln', '\\ln()', 5], ['lim', '\\lim_{x \\to a}', 14],
  ['int', '\\int_{}^{}', 6], ['d/dx', '\\frac{d}{dx}', 12], ['matrix', '\\begin{bmatrix}a & b \\\\ c & d\\end{bmatrix}', null],
  ['>=', '\\geq ', 5], ['<=', '\\leq ', 5], ['!=', '\\neq ', 5], ['(', '(', 1], [')', ')', 1],
  ['[ ]', '[]', 1], ['{ }', '{}', 1], ['infty', '\\infty', 6], ['->', '\\to ', 4],
];
const selections = [
  { name: 'empty', text: '', start: 0, end: 0 },
  { name: 'start', text: 'alpha beta', start: 0, end: 0 },
  { name: 'middle', text: 'alpha beta', start: 6, end: 6 },
  { name: 'end', text: 'alpha beta', start: 10, end: 10 },
  { name: 'replace', text: 'alpha beta', start: 6, end: 10 },
  { name: 'unicode-backwards', text: 'α 😀 β', start: 2, end: 4, direction: 'backward' },
];

afterEach(() => vi.unstubAllGlobals());

describe('every maths key at each meaningful selection boundary', () => {
  it.each(keys.flatMap(([label, text, offset]) => selections.map(selection => ({ label, text, offset, selection, position: selection.name }))))('$label / $position', async ({ label, text, offset, selection }) => {
    render(<Input initial={selection.text} />);
    const input = screen.getByRole('textbox');
    input.focus();
    input.setSelectionRange(selection.start, selection.end, selection.direction);
    fireEvent.click(screen.getByRole('button', { name: 'Math', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: label, exact: true }));
    expect(input).toHaveValue(selection.text.slice(0, selection.start) + text + selection.text.slice(selection.end));
    const expectedCursor = selection.start + (offset ?? text.length);
    await waitFor(() => expect(input.selectionStart).toBe(expectedCursor));
    expect(input.selectionEnd).toBe(expectedCursor);
    expect(input).toHaveFocus();
  });
});

describe('editing, keyboard and lifecycle boundaries', () => {
  it.each([false, true])('Enter/newline behaviour with submitOnEnter=%s', async submitOnEnter => {
    const user = userEvent.setup(); const submit = vi.fn();
    render(<Input submitOnEnter={submitOnEnter} onSubmitShortcut={submit} />);
    const input = screen.getByRole('textbox');
    await user.click(input); await user.type(input, 'first{Enter}second');
    expect(input).toHaveValue(submitOnEnter ? 'firstsecond' : 'first\nsecond');
    expect(submit).toHaveBeenCalledTimes(submitOnEnter ? 1 : 0);
    await user.keyboard('{Shift>}{Enter}{/Shift}third');
    expect(input.value).toMatch(/second\nthird$/);
  });

  it('pastes multiline text over a selection without losing focus', async () => {
    const user = userEvent.setup(); render(<Input initial="alpha beta" />);
    const input = screen.getByRole('textbox'); await user.click(input);
    input.setSelectionRange(6, 10);
    await user.paste('first line\nα 😀');
    expect(input).toHaveValue('alpha first line\nα 😀');
    expect(input).toHaveFocus();
  });

  it.each(['Clear', 'pi'])('pending %s focus restoration is safe after unmount', async action => {
    let callback; vi.stubGlobal('requestAnimationFrame', vi.fn(cb => { callback = cb; return 1; }));
    const view = render(<Input initial="alpha" />);
    if (action !== 'Clear') fireEvent.click(screen.getByRole('button', { name: 'Math', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: action, exact: true }));
    if (action === 'Clear') fireEvent.click(screen.getByRole('button', { name: 'Clear text', exact: true }));
    await waitFor(() => expect(callback).toBeTypeOf('function'));
    view.unmount(); expect(() => act(() => callback())).not.toThrow();
    expect(document.activeElement).toBe(document.body);
  });

  it.each(['Clear', 'pi'])('pending %s focus restoration does not focus a newly disabled field', async action => {
    let callback; vi.stubGlobal('requestAnimationFrame', vi.fn(cb => { callback = cb; return 1; }));
    const view = render(<MathInput value="alpha" onChange={() => {}} />);
    if (action !== 'Clear') fireEvent.click(screen.getByRole('button', { name: 'Math', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: action, exact: true }));
    if (action === 'Clear') fireEvent.click(screen.getByRole('button', { name: 'Clear text', exact: true }));
    await waitFor(() => expect(callback).toBeTypeOf('function'));
    view.rerender(<MathInput value="alpha" onChange={() => {}} disabled />);
    act(() => callback()); expect(screen.getByRole('textbox')).not.toHaveFocus();
  });

  it('multiple instances have independent keyboard controls', () => {
    render(<><Input autoFocus /><Input /></>);
    const buttons = screen.getAllByRole('button', { name: 'Math', exact: true });
    expect(buttons[0].getAttribute('aria-controls')).not.toBe(buttons[1].getAttribute('aria-controls'));
    expect(screen.getAllByRole('textbox')[0]).toHaveFocus();
    fireEvent.click(buttons[1]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(buttons[1]);
    expect(screen.queryByRole('button', { name: 'pi', exact: true })).not.toBeInTheDocument();
  });
});

import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import MathInput from '../MathInput';

function Field(props) {
  const [value, setValue] = useState('alpha beta gamma');
  return <><label htmlFor="brief">Worksheet brief</label><MathInput id="brief" value={value} onChange={setValue} {...props} /></>;
}

describe('MathInput editing', () => {
  it('associates its visible label and forwards focus and blur', async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    render(<Field onFocus={onFocus} onBlur={onBlur} />);
    const input = screen.getByLabelText('Worksheet brief');
    await user.click(screen.getByText('Worksheet brief'));
    expect(input).toHaveFocus();
    expect(onFocus).toHaveBeenCalledOnce();
    await user.tab();
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it('replaces the selected range with a maths token and returns the caret', async () => {
    const user = userEvent.setup();
    render(<Field />);
    const input = screen.getByRole('textbox');
    await user.click(input);
    input.setSelectionRange(6, 10);
    await user.click(screen.getByRole('button', { name: 'Math', exact: true }));
    await user.click(screen.getByRole('button', { name: 'frac', exact: true }));
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveValue('alpha \\frac{}{} gamma');
    expect(input.selectionStart).toBe(12);
    expect(input.selectionEnd).toBe(12);
  });

  it('disables clearing and token insertion when the field becomes disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<MathInput value="preserve me" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Math', exact: true }));
    rerender(<MathInput value="preserve me" onChange={onChange} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears only on an enabled Clear action and returns focus', async () => {
    const user = userEvent.setup();
    render(<Field />);
    await user.click(screen.getByRole('button', { name: 'Clear', exact: true }));
    const input = screen.getByRole('textbox');
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveValue('');
    expect(input.selectionStart).toBe(0);
  });
});

import { useId, useRef, useState } from 'react';
import { Calculator, ChevronDown } from 'lucide-react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';


const KEY_ROWS = [
    [
        { label: 'frac', insert: '\\frac{}{}', cursorOffset: 6 },
        { label: 'sqrt', insert: '\\sqrt{}', cursorOffset: 6 },
        { label: 'pow', insert: '^{}', cursorOffset: 2 },
        { label: 'sub', insert: '_{}', cursorOffset: 2 },
        { label: 'pi', insert: '\\pi' },
        { label: 'theta', insert: '\\theta' },
    ],
    [
        { label: 'sin', insert: '\\sin()' },
        { label: 'cos', insert: '\\cos()' },
        { label: 'tan', insert: '\\tan()' },
        { label: 'log', insert: '\\log()' },
        { label: 'ln', insert: '\\ln()' },
        { label: 'lim', insert: '\\lim_{x \\to a}' },
    ],
    [
        { label: 'int', insert: '\\int_{}^{}', cursorOffset: 6 },
        { label: 'd/dx', insert: '\\frac{d}{dx}' },
        { label: 'matrix', insert: '\\begin{bmatrix}a & b \\\\ c & d\\end{bmatrix}' },
        { label: '>=', insert: '\\geq ' },
        { label: '<=', insert: '\\leq ' },
        { label: '!=', insert: '\\neq ' },
    ],
    [
        { label: '(', insert: '(' },
        { label: ')', insert: ')' },
        { label: '[ ]', insert: '[]', cursorOffset: 1 },
        { label: '{ }', insert: '{}', cursorOffset: 1 },
        { label: 'infty', insert: '\\infty' },
        { label: '->', insert: '\\to ' },
    ],
];


export default function MathInput({
    id,
    'aria-label': ariaLabel,
    value,
    onChange,
    placeholder,
    disabled = false,
    className = '',
    inputClassName = '',
    rows = 3,
    autoFocus = false,
    onKeyDown,
    onKeyUp,
    onFocus,
    onBlur,
    onSubmitShortcut,
    submitOnEnter = false,
}) {
    const inputRef = useRef(null);
    const keyboardId = useId();
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [clearRequest, setClearRequest] = useState(null);
    const restoreSelection = useRef(null);

    const requestClear = () => {
        if (disabled || !value) return;
        const node = inputRef.current;
        restoreSelection.current = {
            start: node?.selectionStart ?? 0,
            end: node?.selectionEnd ?? 0,
            direction: node?.selectionDirection ?? 'none',
        };
        setClearRequest({ value });
    };

    const confirmClear = () => {
        // A confirmation must only apply to the text it originally displayed for.
        if (disabled || !clearRequest || value !== clearRequest.value) return;
        restoreSelection.current = { start: 0, end: 0, direction: 'none' };
        onChange('');
    };

    const restoreInputFocus = (event) => {
        event.preventDefault();
        const node = inputRef.current;
        const selection = restoreSelection.current;
        requestAnimationFrame(() => {
            if (node?.isConnected && !node.disabled) {
                node.focus();
                if (selection) node.setSelectionRange(selection.start, selection.end, selection.direction);
            }
        });
    };
    const handleChange = (event) => {
        onChange(event.target.value);
    };

    const handleKeyDown = (event) => {
        onKeyDown?.(event);
        if (submitOnEnter && event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmitShortcut?.();
        }
    };

    const insertToken = (token) => {
        if (disabled) {
            return;
        }

        const node = inputRef.current;
        const start = node?.selectionStart ?? value.length;
        const end = node?.selectionEnd ?? value.length;
        const nextValue = `${value.slice(0, start)}${token.insert}${value.slice(end)}`;
        const nextCursor = start + (token.cursorOffset ?? token.insert.length);

        onChange(nextValue);
        requestAnimationFrame(() => {
            if (node?.isConnected && !node.disabled) {
                node.focus();
                node.setSelectionRange(nextCursor, nextCursor);
            }
        });
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div>
                <textarea
                    id={id}
                    aria-label={ariaLabel}
                    ref={inputRef}
                    rows={rows}
                    autoFocus={autoFocus}
                    value={value}
                    disabled={disabled}
                    placeholder={placeholder}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onKeyUp={onKeyUp}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    className={`block ${inputClassName}`}
                />
            </div>
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    disabled={disabled}
                    aria-expanded={showKeyboard}
                    aria-controls={keyboardId}
                    onClick={() => setShowKeyboard((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/70 transition hover:border-mait-cyan/40 hover:text-mait-cyan disabled:opacity-50"
                >
                    <Calculator size={12} />
                    Math
                    <ChevronDown size={12} className={`transition-transform ${showKeyboard ? 'rotate-180' : ''}`} />
                </button>
                <button
                    type="button"
                    disabled={disabled || !value}
                    onClick={requestClear}
                    className="rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-red-400 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                >
                    Clear
                </button>
            </div>

            <AlertDialog.Root open={clearRequest !== null} onOpenChange={(open) => { if (!open) setClearRequest(null); }}>
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm" />
                    <AlertDialog.Content
                        onCloseAutoFocus={restoreInputFocus}
                        className="fixed left-1/2 top-1/2 z-[131] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-slate-950 p-6 text-white shadow-2xl"
                    >
                        <AlertDialog.Title className="text-lg font-semibold">Clear this text?</AlertDialog.Title>
                        <AlertDialog.Description className="mt-2 text-sm text-white/70">
                            Your text will be removed. Choose Cancel to keep it.
                        </AlertDialog.Description>
                        <div className="mt-6 flex justify-end gap-3">
                            <AlertDialog.Cancel className="rounded-lg border border-white/20 px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-mait-cyan">
                                Cancel
                            </AlertDialog.Cancel>
                            <AlertDialog.Action
                                disabled={disabled || !clearRequest || value !== clearRequest.value}
                                onClick={confirmClear}
                                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50"
                            >
                                Clear text
                            </AlertDialog.Action>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>

            {showKeyboard && (
                <div id={keyboardId} className="rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-xl">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                            LaTeX Math Keyboard
                        </p>
                        <p className="text-[11px] text-white/35">
                            Canonical format: LaTeX
                        </p>
                    </div>

                    <div className="space-y-2">
                        {KEY_ROWS.map((row, rowIndex) => (
                            <div key={rowIndex} className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                                {row.map((token) => (
                                    <button
                                        key={token.label}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => insertToken(token)}
                                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:border-mait-cyan/40 hover:bg-mait-cyan/10"
                                    >
                                        {token.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

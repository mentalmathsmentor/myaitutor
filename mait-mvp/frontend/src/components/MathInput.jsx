import { useEffect, useRef, useState } from 'react';
import { Calculator, ChevronDown } from 'lucide-react';


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
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [selection, setSelection] = useState({ start: 0, end: 0 });

    useEffect(() => {
        if (!inputRef.current) {
            return;
        }
        inputRef.current.selectionStart = selection.start;
        inputRef.current.selectionEnd = selection.end;
    }, [value, selection]);

    const updateSelection = () => {
        const node = inputRef.current;
        if (!node) {
            return;
        }
        setSelection({
            start: node.selectionStart ?? 0,
            end: node.selectionEnd ?? 0,
        });
    };

    const handleChange = (event) => {
        onChange(event.target.value);
        updateSelection();
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
        const start = node?.selectionStart ?? selection.start ?? value.length;
        const end = node?.selectionEnd ?? selection.end ?? value.length;
        const nextValue = `${value.slice(0, start)}${token.insert}${value.slice(end)}`;
        const nextCursor = start + (token.cursorOffset ?? token.insert.length);

        onChange(nextValue);
        setSelection({ start: nextCursor, end: nextCursor });
        requestAnimationFrame(() => node?.focus());
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="relative">
                <textarea
                    ref={inputRef}
                    rows={rows}
                    autoFocus={autoFocus}
                    value={value}
                    disabled={disabled}
                    placeholder={placeholder}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onKeyUp={onKeyUp}
                    onFocus={(event) => {
                        updateSelection();
                        onFocus?.(event);
                    }}
                    onBlur={(event) => {
                        updateSelection();
                        onBlur?.(event);
                    }}
                    onClick={updateSelection}
                    onSelect={updateSelection}
                    className={inputClassName}
                />
                <button
                    type="button"
                    onClick={() => setShowKeyboard((prev) => !prev)}
                    className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/70 transition hover:border-mait-cyan/40 hover:text-mait-cyan"
                >
                    <Calculator size={12} />
                    Math
                    <ChevronDown size={12} className={`transition-transform ${showKeyboard ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {showKeyboard && (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-xl">
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

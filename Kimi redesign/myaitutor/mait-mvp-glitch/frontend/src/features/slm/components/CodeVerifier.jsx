
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';
// We'll trust that the parent passes pre-highlighted or plain text code

const CodeVerifier = ({ code, output }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="my-3 border border-zinc-700/50 rounded-lg overflow-hidden bg-zinc-900/50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-xs font-mono text-zinc-400"
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Terminal size={14} />
                <span>Verification Code</span>
            </button>

            {isOpen && (
                <div className="p-4 bg-zinc-950 font-mono text-xs overflow-x-auto">
                    <div className="text-emerald-400 mb-2 border-b border-zinc-800 pb-2"># Python Verification</div>
                    <pre className="text-zinc-300">{code}</pre>

                    {output && (
                        <div className="mt-4 pt-4 border-t border-zinc-800">
                            <div className="text-blue-400 mb-2"># Output</div>
                            <pre className="text-zinc-400">{output}</pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CodeVerifier;

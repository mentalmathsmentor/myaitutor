import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export default function PromptHandoff({ prompt, onClose, onReturnFocus, onCopy, copied, error, firstTimeMode, includeCanvasSetup }) {
  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus(); }} className="fixed left-1/2 top-1/2 z-[121] max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/20 bg-[#1A1028] p-5 text-white shadow-2xl sm:p-8">
          <Dialog.Title className="pr-10 text-2xl font-bold">Instructions ready</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-white/65">
            Copy these instructions, open Gemini, then paste them into its message box and send.
          </Dialog.Description>
          <Dialog.Close aria-label="Close prompt preview" className="absolute right-4 top-4 rounded-lg p-2 hover:bg-white/10"><X size={20} /></Dialog.Close>
          <ol aria-label="Use your worksheet instructions" className="mt-4 list-decimal space-y-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 py-4 pl-9 pr-4 text-sm text-white/90">
            <li><strong>Copy</strong> the prompt using the button below.</li>
            <li><strong>Open Gemini</strong> in a new tab.</li>
            <li><strong>Paste into Gemini’s message box</strong> (⌘V on Mac, Ctrl+V on Windows, or touch and hold → Paste). Attach any syllabus or resources you selected, then <strong>send</strong>.</li>
          </ol>
          <p className="mt-3 text-sm text-white/65">Opening Gemini does not paste or send the instructions for you.</p>
          {firstTimeMode && <p className="mt-4 text-sm text-white/75">Start with this prompt, review the generated worksheet, then ask Gemini for specific changes to questions or difficulty.</p>}
          {includeCanvasSetup && <p className="mt-4 text-sm text-white/75">Canvas setup: open the worksheet Gem, choose Canvas if available, attach any promised resources and paste the prompt. Check the worksheet before sharing it.</p>}
          <label htmlFor="worksheet-prompt-preview" className="mt-5 block text-sm font-medium">Exact prompt</label>
          <textarea id="worksheet-prompt-preview" readOnly value={prompt} rows={12}
            className="mt-2 w-full rounded-xl border border-white/20 bg-black/30 p-3 font-mono text-xs leading-relaxed text-white focus:outline focus:outline-2 focus:outline-cyan-400" />
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error} You can select and copy the preview above.</p>}
          {copied && <p role="status" className="mt-3 text-sm text-green-300">Prompt copied. Next: open Gemini, paste into its message box, then send.</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={onCopy} className="rounded-xl bg-mait-cosmic px-5 py-3 font-semibold">Copy prompt</button>
            <button type="button" onClick={() => window.open('https://gemini.google.com/gem/14I7EkTkmvun49uuifaHINSEv64BO_hbG?usp=sharing', '_blank', 'noopener,noreferrer')}
              className="rounded-xl border border-white/20 px-5 py-3 font-semibold">Open Gemini</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

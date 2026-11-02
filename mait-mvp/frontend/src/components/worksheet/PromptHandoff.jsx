import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { skillFile } from '../../features/worksheet/utils/renderPortablePrompt';

const WORKSHEET_GEM_URL = 'https://gemini.google.com/gem/14I7EkTkmvun49uuifaHINSEv64BO_hbG?usp=sharing';
// Set this once a shareable custom GPT exists; its button stays hidden until then.
const WORKSHEET_GPT_URL = '';
const openLink = url => window.open(url, '_blank', 'noopener,noreferrer');

export default function PromptHandoff({ prompt, target, onTargetChange, onClose, onReturnFocus, onCopy, copied, error, firstTimeMode, includeCanvasSetup }) {
  const anyAi = target === 'any';
  const downloadText = (text, filename) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus(); }} className="fixed left-1/2 top-1/2 z-[121] max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/20 bg-[#1A1028] p-5 text-white shadow-2xl sm:p-8">
          <Dialog.Title className="pr-10 text-2xl font-bold">Instructions ready</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-white/65">
            {anyAi ? 'Copy the full instructions and your worksheet details, then paste them into your AI and send.' : 'Copy your worksheet details, open the worksheet Gem or your custom GPT, then paste them into its message box and send.'}
          </Dialog.Description>
          <Dialog.Close aria-label="Close prompt preview" className="absolute right-4 top-4 rounded-lg p-2 hover:bg-white/10"><X size={20} /></Dialog.Close>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Where will you use this?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-xl border p-3 text-sm ${anyAi ? 'border-white/20' : 'border-cyan-400 bg-cyan-400/10'}`}>
                <input type="radio" name="worksheet-destination" className="mr-2" checked={!anyAi} onChange={() => onTargetChange('custom')} />
                <strong>Worksheet Gem or custom GPT</strong>
                <span className="mt-1 block text-white/65">Copies only your worksheet details.</span>
              </label>
              <label className={`cursor-pointer rounded-xl border p-3 text-sm ${anyAi ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/20'}`}>
                <input type="radio" name="worksheet-destination" className="mr-2" checked={anyAi} onChange={() => onTargetChange('any')} />
                <strong>Any other AI</strong>
                <span className="mt-1 block text-white/65">Copies the full instructions too.</span>
              </label>
            </div>
          </fieldset>
          <ol aria-label="Use your worksheet instructions" className="mt-4 list-decimal space-y-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 py-4 pl-9 pr-4 text-sm text-white/90">
            <li><strong>Copy</strong> the prompt using the button below.</li>
            <li><strong>{anyAi ? 'Open your AI' : 'Open the worksheet Gem or your custom GPT'}</strong> {anyAi ? 'in a new chat, such as ChatGPT or Claude.' : 'in a new tab.'}</li>
            <li><strong>Paste into its message box</strong> (⌘V on Mac, Ctrl+V on Windows, or touch and hold → Paste). Attach any syllabus or resources you selected, then <strong>send</strong>.</li>
          </ol>
          {anyAi
            ? <p className="mt-3 text-sm text-white/65">Setting up your own custom GPT or project? Download the instructions and use them as its setup, then choose Worksheet Gem or custom GPT here.</p>
            : <>
              <p className="mt-3 text-sm text-white/65">Opening it does not paste or send the instructions for you.</p>
              <p className="mt-2 text-sm text-white/65">Using the Gem? Sign in to Google first. If it drops you into plain Gemini, come back and open it again. Not working? Choose Any other AI above.</p>
            </>}
          {firstTimeMode && <p className="mt-4 text-sm text-white/75">Start with this prompt, review the generated worksheet, then ask your AI for specific changes to questions or difficulty.</p>}
          {includeCanvasSetup && !anyAi && <p className="mt-4 text-sm text-white/75">Canvas setup for the Gem: choose Canvas if available, attach any promised resources and paste the prompt. Check the worksheet before sharing it.</p>}
          <label htmlFor="worksheet-prompt-preview" className="mt-5 block text-sm font-medium">Exact prompt</label>
          <textarea id="worksheet-prompt-preview" readOnly value={prompt} rows={12}
            className="mt-2 w-full rounded-xl border border-white/20 bg-black/30 p-3 font-mono text-xs leading-relaxed text-white focus:outline focus:outline-2 focus:outline-cyan-400" />
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error} You can select and copy the preview above.</p>}
          {copied && <p role="status" className="mt-3 text-sm text-green-300">{anyAi ? 'Prompt copied. Next: paste it into your AI, then send.' : 'Prompt copied. Next: open your Gem or GPT, paste into its message box, then send.'}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={onCopy} className="rounded-xl bg-mait-cosmic px-5 py-3 font-semibold">Copy prompt</button>
            <button type="button" onClick={() => downloadText(prompt, 'mait-worksheet-prompt.txt')} className="rounded-xl border border-white/20 px-5 py-3 font-semibold">Download prompt</button>
            {anyAi
              ? <button type="button" onClick={() => downloadText(skillFile, 'SKILL.md')} className="rounded-xl border border-white/20 px-5 py-3 font-semibold">Download instructions</button>
              : <button type="button" onClick={() => openLink(WORKSHEET_GEM_URL)} className="rounded-xl border border-white/20 px-5 py-3 font-semibold">Open worksheet Gem</button>}
            {!anyAi && WORKSHEET_GPT_URL && <button type="button" onClick={() => openLink(WORKSHEET_GPT_URL)} className="rounded-xl border border-white/20 px-5 py-3 font-semibold">Open custom GPT</button>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

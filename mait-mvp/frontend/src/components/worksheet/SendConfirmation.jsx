import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, ExternalLink, X } from 'lucide-react';
import { openDestination } from '../../features/worksheet/utils/destinations';

export default function SendConfirmation({ destination, blocked, onClose, onReturnFocus, onPreview }) {
  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus(); }} className="fixed left-1/2 top-1/2 z-[121] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-green-400/30 bg-[#1A1028] p-6 text-center text-white shadow-2xl">
          <Dialog.Close aria-label="Close" className="absolute right-4 top-4 rounded-lg p-2 hover:bg-white/10"><X size={18} /></Dialog.Close>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-400"><CheckCircle2 size={30} /></div>
          <Dialog.Title className="text-2xl font-bold">Copied! Now paste it into {destination.label}</Dialog.Title>
          <Dialog.Description className="mt-3 text-base text-white/80">
            Press <strong>Ctrl+V</strong> (<strong>⌘V</strong> on Mac) in the message box, then send.
          </Dialog.Description>
          {blocked && <p role="alert" className="mt-3 text-sm text-amber-200">Your browser blocked the new tab. Open {destination.label} with the button below.</p>}
          <p className="mt-3 text-sm text-white/60">{destination.note}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => openDestination(destination)} className="flex items-center gap-2 rounded-xl bg-mait-cosmic px-5 py-3 font-semibold">
              <ExternalLink size={16} /> {blocked ? `Open ${destination.label}` : `Open ${destination.label} again`}
            </button>
            <button type="button" onClick={onPreview} className="rounded-xl border border-white/20 px-5 py-3 font-semibold">See the prompt</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

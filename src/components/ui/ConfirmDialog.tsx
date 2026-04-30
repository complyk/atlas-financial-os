import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
interface ConfirmDialogProps { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; destructive?: boolean; requireTyping?: string; }
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', destructive, requireTyping }: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const canConfirm = !requireTyping || typed === requireTyping;
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-text-secondary mb-4">{message}</p>
      {requireTyping && <div className="mb-4"><Input label={`Type "${requireTyping}" to confirm`} value={typed} onChange={e => setTyped(e.target.value)} placeholder={requireTyping} /></div>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={destructive ? 'danger' : 'primary'} disabled={!canConfirm} onClick={() => { if (canConfirm) { onConfirm(); onClose(); setTyped(''); } }}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

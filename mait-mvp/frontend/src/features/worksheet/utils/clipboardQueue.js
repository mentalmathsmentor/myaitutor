let clipboardWriteQueue = Promise.resolve();

export function queueClipboardWrite(text, writeText) {
  const writer = writeText || (value => navigator.clipboard.writeText(value));
  const write = clipboardWriteQueue.then(() => writer(text));
  clipboardWriteQueue = write.catch(() => undefined);
  return write;
}

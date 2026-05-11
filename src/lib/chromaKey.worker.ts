import { applyChromaKey } from './chromaKey';
import type { ChromaKeySettings } from '../types/image';

interface SetSourceMessage {
  type: 'setSource';
  source: ImageData;
}

interface ApplyMessage {
  type: 'apply';
  settings: ChromaKeySettings;
  requestId: number;
}

interface ClearMessage {
  type: 'clear';
}

type WorkerInbound = SetSourceMessage | ApplyMessage | ClearMessage;

export interface ResultMessage {
  type: 'result';
  requestId: number;
  result: ImageData;
}

interface WorkerScope {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<WorkerInbound>) => void,
  ): void;
  postMessage(message: ResultMessage, transfer?: Transferable[]): void;
}

const ctx = self as unknown as WorkerScope;

let source: ImageData | null = null;

ctx.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg.type === 'setSource') {
    source = msg.source;
    return;
  }
  if (msg.type === 'clear') {
    source = null;
    return;
  }
  if (msg.type === 'apply' && source) {
    const result = applyChromaKey(source, msg.settings);
    ctx.postMessage(
      { type: 'result', requestId: msg.requestId, result },
      [result.data.buffer],
    );
  }
});

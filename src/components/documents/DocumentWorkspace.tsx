'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileUp, FileText, Trash2, Save, Eraser, ZoomIn, ZoomOut, Brain, Sparkles } from 'lucide-react';
import { Note, NoteAttachment } from '@/types';
import { useStore } from '@/store/useStore';
import toast from 'react-hot-toast';

interface Props {
  note: Note;
  compact?: boolean;
}

export function DocumentWorkspace({ note, compact = false }: Props) {
  const { addAttachmentToNote, removeAttachmentFromNote, updateAttachmentAnnotation, updateNote } = useStore();
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(note.attachments[0]?.id ?? null);
  const [zoom, setZoom] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const effectiveSelectedAttachmentId =
    (selectedAttachmentId && note.attachments.some((a) => a.id === selectedAttachmentId))
      ? selectedAttachmentId
      : (note.attachments[0]?.id ?? null);

  const selectedAttachment = useMemo(
    () => note.attachments.find((a) => a.id === effectiveSelectedAttachmentId) ?? null,
    [note.attachments, effectiveSelectedAttachmentId]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!selectedAttachment?.annotationLayerDataUrl) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = selectedAttachment.annotationLayerDataUrl;
  }, [selectedAttachment?.annotationLayerDataUrl, selectedAttachment?.id]);

  const isImage = selectedAttachment?.mimeType.startsWith('image/');

  const onFileUpload: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (!dataUrl) return;
      addAttachmentToNote(note.id, {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataUrl,
      });
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = '';
  };

  const drawLine = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    setDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setDrawing(false);
    const ctx = canvas.getContext('2d');
    ctx?.closePath();
  };

  const clearOverlay = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveOverlay = () => {
    if (!selectedAttachment) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    updateAttachmentAnnotation(note.id, selectedAttachment.id, canvas.toDataURL('image/png'));
  };

  const saveIndexText = (attachment: NoteAttachment, text: string) => {
    updateNote(note.id, {
      attachments: note.attachments.map((a) => (a.id === attachment.id ? { ...a, indexedText: text } : a)),
    });
  };

  const runSmartAction = (action: 'flashcard' | 'summary' | 'insert') => {
    if (!selectedAttachment?.indexedText.trim()) {
      toast.error('Add indexed text first to run smart actions.');
      return;
    }
    const indexed = selectedAttachment.indexedText.trim();
    if (action === 'insert') {
      updateNote(note.id, { content: `${note.content}<hr><p>${indexed}</p>` });
      toast.success('Indexed text added to note.');
      return;
    }
    if (action === 'summary') {
      updateNote(note.id, { content: `${note.content}<hr><h3>📄 PDF Summary</h3><p>${indexed}</p>` });
      toast.success('Summary block added to note.');
      return;
    }
    updateNote(note.id, { content: `${note.content}<hr><p><strong>Flashcard seed:</strong> ${indexed}</p>` });
    toast.success('Flashcard seed inserted in note.');
  };

  return (
    <div className={`bg-[var(--surface-muted)] border-l border-[var(--border)] ${compact ? 'w-[40%] min-w-[360px]' : 'flex-1'} flex flex-col rounded-2xl`}>
      <div className="px-4 py-3 border-b border-[var(--border)] bg-white">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[var(--text-primary)]">PDF / Slide Workspace</h3>
          <label className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-[var(--primary-600)] text-white cursor-pointer hover:bg-[var(--primary-500)]">
            <FileUp size={14} />
            Import PDF/Slide
            <input
              type="file"
              className="hidden"
              accept="application/pdf,image/*,.ppt,.pptx"
              onChange={onFileUpload}
            />
          </label>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-[var(--border)] bg-white flex items-center gap-2 overflow-x-auto">
        {note.attachments.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">No documents yet. Import lecture slides or PDFs.</p>
        )}
        {note.attachments.map((attachment) => (
          <button
            key={attachment.id}
            onClick={() => setSelectedAttachmentId(attachment.id)}
            className={`text-xs px-2 py-1 rounded border whitespace-nowrap ${
              selectedAttachmentId === attachment.id
                ? 'bg-[var(--primary-100)] border-[var(--border-strong)] text-[var(--primary-600)]'
                : 'bg-white border-[var(--border)] text-[var(--text-secondary)]'
            }`}
          >
            {attachment.name}
          </button>
        ))}
      </div>

      {selectedAttachment ? (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-2 bg-white border-b border-[var(--border)] flex items-center gap-2">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                className="p-1.5 rounded hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                title="Zoom out"
              >
              <ZoomOut size={14} />
            </button>
              <button
                onClick={() => setZoom((z) => Math.min(2.2, z + 0.1))}
                className="p-1.5 rounded hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                title="Zoom in"
              >
              <ZoomIn size={14} />
            </button>
              <span className="text-xs text-[var(--text-muted)]">{Math.round(zoom * 100)}%</span>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={clearOverlay} className="p-1.5 rounded hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]" title="Clear annotation">
                  <Eraser size={14} />
                </button>
                <button onClick={saveOverlay} className="p-1.5 rounded hover:bg-[var(--surface-muted)] text-[var(--success-600)]" title="Save annotation">
                  <Save size={14} />
                </button>
                <button
                  onClick={() => removeAttachmentFromNote(note.id, selectedAttachment.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-[var(--danger-600)]"
                  title="Remove document"
                >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div ref={containerRef} className="flex-1 overflow-auto p-4 bg-[#edf2ff]">
            <div
              className="mx-auto bg-white border border-[var(--border)] shadow-sm relative rounded-md overflow-hidden"
              style={{ width: `${Math.round(780 * zoom)}px`, minHeight: `${Math.round(450 * zoom)}px` }}
            >
              {isImage ? (
                <img src={selectedAttachment.dataUrl} alt={selectedAttachment.name} className="w-full h-auto block pointer-events-none select-none" />
              ) : (
                <iframe src={selectedAttachment.dataUrl} title={selectedAttachment.name} className="w-full h-[560px] border-0" />
              )}
              <canvas
                ref={canvasRef}
                width={780}
                height={560}
                className="absolute inset-0 w-full h-full touch-none"
                onPointerDown={startDraw}
                onPointerMove={drawLine}
                onPointerUp={stopDraw}
                onPointerLeave={stopDraw}
              />
            </div>
            {!isImage && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Tip: for PDFs, the annotation layer is saved as an overlay snapshot and can be searched by indexed text below.
                </p>
              )}
          </div>

          <div className="px-3 py-3 border-t border-[var(--border)] bg-white">
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Indexed text (for OCR / search)</label>
            <textarea
              value={selectedAttachment.indexedText}
              onChange={(e) => saveIndexText(selectedAttachment, e.target.value)}
              rows={2}
              className="w-full border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[var(--primary-500)]"
              placeholder="Add key terms from this document (e.g., nephron, RAAS, glomerulus)..."
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => runSmartAction('flashcard')} className="pill-button">
                <Brain size={12} /> Create flashcard seed
              </button>
              <button onClick={() => runSmartAction('summary')} className="pill-button">
                <Sparkles size={12} /> Generate summary block
              </button>
              <button onClick={() => runSmartAction('insert')} className="pill-button">
                <FileText size={12} /> Add to note
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid place-items-center text-[var(--text-muted)] text-sm">
          <div className="text-center">
            <FileText size={36} className="mx-auto mb-2 opacity-40" />
            Upload a PDF/slide to start annotating.
          </div>
        </div>
      )}
    </div>
  );
}

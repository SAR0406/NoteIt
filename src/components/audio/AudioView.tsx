'use client';
import React, { useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Mic, Square, Clock, Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { escapeHtml } from '@/lib/ai/text';

export function AudioView() {
  const { notes, updateNote, addNote, selectNote, setActiveView, selectedNotebookId, selectedSubjectId, selectedTopicId } = useStore();

  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [timestamps, setTimestamps] = useState<{ time: number; text: string }[]>([]);
  const [newTimestampText, setNewTimestampText] = useState('');
  const [languageCode, setLanguageCode] = useState('en');
  const [translateToEnglish, setTranslateToEnglish] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [asrLoading, setAsrLoading] = useState(false);
  const [selectedNoteForAudio, setSelectedNoteForAudio] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setTimestamps([]);
      setTranscript('');
      toast.success('Recording started');
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    toast.success('Recording stopped');
  };

  const addTimestamp = () => {
    if (audioRef.current && newTimestampText.trim()) {
      setTimestamps((prev) => [...prev, { time: audioRef.current!.currentTime, text: newTimestampText.trim() }]);
      setNewTimestampText('');
    }
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Failed to read audio blob'));
      reader.readAsDataURL(blob);
    });

  const transcribeAudio = async () => {
    if (!audioBlob) {
      toast.error('Record audio first.');
      return;
    }
    setAsrLoading(true);
    try {
      const audioDataUrl = await blobToDataUrl(audioBlob);
      const response = await fetch('/api/asr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioDataUrl,
          languageCode,
          translateToEnglish,
        }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error || 'Transcription failed');
      }

      const data = (await response.json()) as { text?: string };
      const text = (data.text ?? '').trim();
      if (!text) throw new Error('No text returned from ASR');
      setTranscript(text);
      toast.success(translateToEnglish ? 'Translated to English' : 'Transcription complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcription failed';
      toast.error(message);
    } finally {
      setAsrLoading(false);
    }
  };

  const saveAudioToNote = () => {
    if (!audioUrl) return;
    const transcriptHtml = transcript
      ? `<h3>🎙️ Audio Transcript${translateToEnglish ? ' (English)' : ''}</h3><p>${escapeHtml(transcript).replace(/\n/g, '<br />')}</p>`
      : '';
    if (selectedNoteForAudio) {
      const existingNote = notes.find((n) => n.id === selectedNoteForAudio);
      updateNote(selectedNoteForAudio, {
        audioUrl,
        audioTimestamps: timestamps,
        type: 'audio',
        content: transcriptHtml ? `${existingNote?.content ?? ''}<hr>${transcriptHtml}` : existingNote?.content ?? '',
      });
      toast.success('Audio saved to note!');
    } else {
      const note = addNote({
        topicId: selectedTopicId,
        subjectId: selectedSubjectId,
        notebookId: selectedNotebookId,
        title: `Audio Note — ${new Date().toLocaleTimeString()}`,
        templateType: 'blank',
      });
      updateNote(note.id, {
        audioUrl,
        audioTimestamps: timestamps,
        type: 'audio',
        content: transcriptHtml ? `${note.content}<hr>${transcriptHtml}` : note.content,
      });
      toast.success('New audio note created!');
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          <Mic className="text-red-500" size={28} /> Audio Notes
        </h1>
        <p className="text-gray-500 text-sm mb-6">Record lectures and sync timestamps with your notes</p>

        {/* Recording panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {!recording ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-5 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium"
              >
                <Mic size={18} /> Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-5 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 font-medium animate-pulse"
              >
                <Square size={18} /> Stop Recording
              </button>
            )}

            {recording && (
              <div className="flex items-center gap-2 text-red-500 font-medium">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                Recording...
              </div>
            )}
          </div>

          {/* Audio player */}
          {audioUrl && (
            <div className="mt-4">
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full mb-3"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <input
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="Language code (en, hi, multi...)"
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                />
                <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={translateToEnglish}
                    onChange={(e) => setTranslateToEnglish(e.target.checked)}
                  />
                  Translate to English
                </label>
                <button
                  onClick={transcribeAudio}
                  disabled={asrLoading}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  {asrLoading ? 'Transcribing...' : 'Transcribe Audio'}
                </button>
              </div>

              {transcript && (
                <div className="mb-3 border border-indigo-100 bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-indigo-700 mb-1">
                    Transcript{translateToEnglish ? ' (English)' : ''}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{transcript}</p>
                </div>
              )}

              {/* Timestamp annotation */}
              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="Add timestamp note at current time..."
                  value={newTimestampText}
                  onChange={(e) => setNewTimestampText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTimestamp()}
                />
                <button
                  onClick={addTimestamp}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Timestamps */}
              {timestamps.length > 0 && (
                <div className="space-y-1 mb-3">
                  {timestamps.map((ts, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded p-1"
                      onClick={() => { if (audioRef.current) audioRef.current.currentTime = ts.time; }}
                    >
                      <span className="text-blue-500 font-mono text-xs bg-blue-50 px-2 py-0.5 rounded">
                        {formatTime(ts.time)}
                      </span>
                      <span className="text-gray-700">{ts.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Save */}
              <div className="flex items-center gap-3">
                <select
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                  value={selectedNoteForAudio ?? ''}
                  onChange={(e) => setSelectedNoteForAudio(e.target.value || null)}
                >
                  <option value="">Create new note</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id}>{n.title}</option>
                  ))}
                </select>
                <button
                  onClick={saveAudioToNote}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                >
                  Save to Note
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audio notes list */}
        <h2 className="font-semibold text-gray-700 mb-3">Notes with Audio</h2>
        {notes.filter((n) => n.audioUrl).length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Mic size={40} className="mx-auto mb-2 opacity-30" />
            <p>No audio notes yet. Record a lecture above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes
              .filter((n) => n.audioUrl)
              .map((n) => (
                <div
                  key={n.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-sm"
                  onClick={() => { selectNote(n.id); setActiveView('note-editor'); }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">{n.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(n.createdAt)}</p>
                      {n.audioTimestamps.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock size={12} className="text-blue-500" />
                          <span className="text-xs text-blue-600">{n.audioTimestamps.length} timestamp{n.audioTimestamps.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                    <Mic size={16} className="text-red-400" />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

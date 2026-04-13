import { FlashcardDifficulty } from '@/types';

/**
 * Simple SM-2 spaced repetition algorithm
 */
export function sm2(
  difficulty: FlashcardDifficulty,
  repetitions: number,
  interval: number,
  easeFactor: number
): { interval: number; easeFactor: number; repetitions: number; dueDate: string } {
  let q: number;
  switch (difficulty) {
    case 'again': q = 0; break;
    case 'hard':  q = 2; break;
    case 'good':  q = 4; break;
    case 'easy':  q = 5; break;
  }

  let newInterval: number;
  let newEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  let newRepetitions = repetitions;

  if (q < 3) {
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions = repetitions + 1;
    if (newRepetitions === 1) newInterval = 1;
    else if (newRepetitions === 2) newInterval = 6;
    else newInterval = Math.round(interval * newEaseFactor);
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + newInterval);

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    dueDate: dueDate.toISOString(),
  };
}

export function isDue(dueDate: string): boolean {
  return new Date(dueDate) <= new Date();
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

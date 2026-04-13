// Keep context payload bounded so requests remain reliable with large MBBS notes/PDF indexes.
export const AI_CONTEXT_CHAR_LIMIT = 12000;

// MBBS summaries should stay short enough for fast revision but still cover key points.
export const AI_SUMMARY_POINT_LIMIT = 8;

// Flashcard limits tuned for UI readability and active-recall usability.
export const AI_FLASHCARD_FRONT_CHAR_LIMIT = 220;
export const AI_FLASHCARD_BACK_CHAR_LIMIT = 500;

// Quiz mode can include more cards than regular flashcards for exam-style self-testing.
export const AI_QUIZ_CARD_LIMIT = 8;
export const AI_FLASHCARD_CARD_LIMIT = 6;

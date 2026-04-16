export async function generateWithNIM(payload: NIMRequestPayload): Promise<NIMResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not configured');
  }

  // 1. Handle Generation Models (Flux Image / Trellis 3D)
  if (GENERATION_ACTION_SET.has(payload.action)) {
    const generated = await callGenerationModel(payload, apiKey);
    return { generated };
  }

  // 2. Handle Text Models (Summarize / Flashcards / Quiz)
  const plainText = clip(stripHtml(payload.htmlContent));
  const contextHints = clip(
    [payload.handwritingIndex, ...payload.attachmentIndex, ...payload.drawingIndex]
      .filter(Boolean)
      .join(' | ')
  );

  const contextPrompt = [
    `Title: ${payload.title}`,
    `Tags: ${payload.tags.join(', ') || 'None'}`,
    `Text content: ${plainText || 'No typed content.'}`,
    `Indexed context: ${contextHints || 'None'}`,
  ].join('\n');

  // --- SUMMARIZE ACTION (Single Request) ---
  if (payload.action === 'summarize') {
    const response = await fetch(`${NVIDIA_NIM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NVIDIA_NIM_MODEL,
        messages: [
          { role: 'system', content: 'You are an MBBS study assistant. Create 5 to 8 concise MBBS revision bullet points. Return ONLY valid JSON: {"summaryPoints": ["point 1", "point 2"]}' },
          { role: 'user', content: contextPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });
    
    const data = await response.json();
    return parseAiOutput(data.choices?.[0]?.message?.content || '{}');
  }

  // --- FLASHCARDS & QUIZ ACTION (Parallel Requests) ---
  const isQuiz = payload.action === 'quiz';
  const requestCount = isQuiz ? 8 : 6; // 8 for quiz, 6 for flashcards
  const taskInstruction = isQuiz 
    ? 'Create exactly ONE unique, highly-detailed clinically useful Q/A flashcard for exam revision.'
    : 'Create exactly ONE unique, high-yield flashcard from the key concepts provided.';

  // Create an array of N parallel promises
  const parallelRequests = Array.from({ length: requestCount }).map((_, index) => {
    return fetch(`${NVIDIA_NIM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NVIDIA_NIM_MODEL,
        messages: [
          { 
            role: 'system', 
            content: `You are an MBBS study assistant. ${taskInstruction} Focus on aspect #${index + 1} of the text to ensure variety. Return ONLY valid JSON: {"front": "question", "back": "answer"}` 
          },
          { role: 'user', content: contextPrompt }
        ],
        temperature: 0.7, // Slightly higher temperature for variety across parallel requests
        max_tokens: 500,
      }),
    }).then(res => res.json());
  });

  // Wait for all 8 requests to finish at the same time
  const results = await Promise.all(parallelRequests);
  
  // Combine the results from all parallel requests into a single array
  const combinedFlashcards: Array<{front: string, back: string}> = [];
  
  for (const data of results) {
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = extractJsonObject(content);
    if (parsed) {
      try {
        const json = JSON.parse(parsed);
        if (json.front && json.back) {
          combinedFlashcards.push({
            front: sanitizeModelText(json.front),
            back: sanitizeModelText(json.back)
          });
        }
      } catch (e) {
        console.warn("Failed to parse a parallel card result", e);
      }
    }
  }

  return { flashcards: combinedFlashcards };
}

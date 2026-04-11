import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add it to your secrets.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const geminiService = {
  async solveDoubt(query: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        systemInstruction: "You are an expert CBSE Class 8-10 tutor. Answer the student's doubt in simple Hinglish (Hindi + English). Keep answers short, clear, and student-friendly. Use bullet points if necessary.",
      },
    });
    return response.text;
  },

  async generateQuiz(subject: string, className: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 5 MCQ questions for CBSE Class ${className} ${subject}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ["question", "options", "correctAnswer", "explanation"],
          },
        },
      },
    });
    return JSON.parse(response.text);
  },

  async summarizeChapter(text: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following chapter text in 5 bullet points in simple Hinglish:\n\n${text}`,
      config: {
        systemInstruction: "You are a helpful study assistant. Summarize the provided text into exactly 5 clear bullet points using simple Hinglish.",
      },
    });
    return response.text;
  },

  async chatWithBot(message: string, history: any[]) {
    const ai = getAI();
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are NoteVix AI, a friendly study assistant for CBSE students. Answer anything related to the CBSE syllabus. Keep responses concise and helpful.",
      },
      history: history,
    });
    const response = await chat.sendMessage({ message });
    return response.text;
  }
};

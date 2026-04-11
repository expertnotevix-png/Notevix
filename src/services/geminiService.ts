import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // In Vite, process.env.GEMINI_API_KEY is defined in vite.config.ts
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      console.error("GEMINI_API_KEY is missing or undefined");
      throw new Error("Gemini API Key is missing. Please add it to 'Settings > Secrets' in AI Studio.");
    }
    
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const geminiService = {
  async solveDoubt(query: string) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: query,
        config: {
          systemInstruction: "You are an expert CBSE Class 8-10 tutor. Answer the student's doubt in simple Hinglish (Hindi + English). Keep answers short, clear, and student-friendly. Use bullet points if necessary.",
        },
      });
      return response.text;
    } catch (error) {
      console.error("Doubt Solver Error:", error);
      throw error;
    }
  },

  async generateQuiz(subject: string, className: string) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
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
    } catch (error) {
      console.error("Quiz Generator Error:", error);
      throw error;
    }
  },

  async summarizeChapter(text: string) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Summarize the following chapter text in 5 bullet points in simple Hinglish:\n\n${text}`,
        config: {
          systemInstruction: "You are a helpful study assistant. Summarize the provided text into exactly 5 clear bullet points using simple Hinglish.",
        },
      });
      return response.text;
    } catch (error) {
      console.error("Summarizer Error:", error);
      throw error;
    }
  },

  async chatWithBot(message: string, history: any[]) {
    try {
      const ai = getAI();
      const chat = ai.chats.create({
        model: "gemini-flash-latest",
        config: {
          systemInstruction: "You are NoteVix AI, a friendly study assistant for CBSE students. Answer anything related to the CBSE syllabus. Keep responses concise and helpful.",
        },
        history: history,
      });
      const response = await chat.sendMessage({ message });
      return response.text;
    } catch (error) {
      console.error("Chatbot Error:", error);
      throw error;
    }
  }
};

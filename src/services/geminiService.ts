import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname.includes('ais-dev');
      const message = isLocal 
        ? "Gemini API Key is missing in AI Studio. Please add it to 'Settings > Secrets' and click 'Apply Changes'."
        : "Gemini API Key is missing on this website. If this is a deployed site (like Cloudflare), you must add GEMINI_API_KEY to your hosting provider's Environment Variables.";
      
      console.error("GEMINI_API_KEY Error:", message);
      throw new Error(message);
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
  },

  async moderateContent(text: string) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `
          Analyze the following text for a student community forum:
          1. Abusive language/bad words.
          2. Spam/promotional content.
          3. Off-topic content.
          4. Personal info.
          
          Text: "${text}"
          
          Respond ONLY with a JSON object:
          {
            "approved": boolean,
            "reason": "Brief reason if rejected, otherwise null"
          }
        `,
        config: {
          responseMimeType: "application/json",
        },
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Moderation Error:", error);
      return { approved: true };
    }
  },

  async isNotesRequest(text: string) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `
          Analyze if the following text is primarily asking for "notes", "PDFs", "study material", or "resources".
          If the student is asking a conceptual question (e.g. "What is photosynthesis?"), respond "false".
          If the student is asking for a file or notes (e.g. "Give me notes of Chapter 1"), respond "true".
          
          Text: "${text}"
          
          Respond ONLY with "true" or "false".
        `,
      });
      return response.text.toLowerCase().includes('true');
    } catch (error) {
      return false;
    }
  },

  async getCommunityAnswer(title: string, description: string) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `
          Question Title: ${title}
          Question Description: ${description}
          
          Provide a helpful, concise, and accurate answer for this student. 
          Use simple Hinglish (Hindi + English). 
          Keep it under 100 words.
        `,
        config: {
          systemInstruction: "You are NoteVix AI, a helpful study assistant. Provide accurate answers to student questions in simple Hinglish.",
        },
      });
      return response.text;
    } catch (error) {
      console.error("Community Answer Error:", error);
      return "I'm sorry, I couldn't generate an answer right now. Please wait for other students or teachers to reply!";
    }
  }
};

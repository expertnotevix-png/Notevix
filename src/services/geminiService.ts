import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Support both AI Studio (process.env) and external Vite deployments (VITE_ prefix)
    // Note: In Cloudflare Pages, use a regular "Environment Variable", NOT a "Secret" 
    // because Secrets are not available during the 'npm run build' process.
    const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                   (import.meta as any).env?.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname.includes('ais-dev');
      const message = isLocal 
        ? "Gemini API Key is missing in AI Studio. Please add it to 'Settings > Secrets' and click 'Apply Changes'."
        : "Gemini API Key is missing. IMPORTANT: In Cloudflare Pages, you must add 'VITE_GEMINI_API_KEY' as a regular 'Environment Variable', NOT a 'Secret', then REDEPLOY your site.";
      
      console.error("GEMINI_API_KEY Error:", message);
      throw new Error(message);
    }
    
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

function handleAIError(error: any): never {
  console.error("Gemini API Error:", error);
  
  // Check for Rate Limit (429)
  const errorString = error?.message?.toLowerCase() || "";
  if (errorString.includes('429') || error?.status === 429 || errorString.includes('quota') || errorString.includes('exhausted')) {
    throw new Error("AI Limit Reached: The Gemini Free Tier allows 15 requests per minute. Please wait 1 minute and try again! ⏳");
  }
  
  // Check for Safety Filters
  if (errorString.includes('safety') || errorString.includes('blocked')) {
    throw new Error("I can't answer that. Please ask something related to your studies! 📚");
  }

  // API Key issues
  if (errorString.includes('api key') || errorString.includes('invalid')) {
    throw new Error("AI Configuration Error: The API key is invalid or missing. Please contact the admin.");
  }

  // Generic Error
  throw new Error("AI is currently busy or sleepy. Please try again in a few seconds! 😴");
}

export const geminiService = {
  async solveDoubt(query: string) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: query,
        config: {
          systemInstruction: "You are an expert CBSE Class 8-10 tutor. Answer the student's doubt in simple Hinglish (Hindi + English). Keep answers short, clear, and student-friendly. Avoid using complex symbols like '##' or '$' for simple things. Use bold text for headings instead of Markdown headers. Only use math symbols if absolutely necessary for a formula.",
        },
      });
      return response.text;
    } catch (error) {
      return handleAIError(error);
    }
  },

  async generateQuiz(subject: string, className: string) {
    try {
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
    } catch (error) {
      return handleAIError(error);
    }
  },

  async summarizeChapter(text: string) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize the following chapter text in 5 bullet points in simple Hinglish:\n\n${text}`,
        config: {
          systemInstruction: "You are a helpful study assistant. Summarize the provided text into exactly 5 clear bullet points using simple Hinglish.",
        },
      });
      return response.text;
    } catch (error) {
      return handleAIError(error);
    }
  },

  async chatWithBot(message: string, history: any[]) {
    try {
      const ai = getAI();
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are NoteVix AI, a friendly study assistant for CBSE students. Answer anything related to the CBSE syllabus. Keep responses concise and helpful. Use simple language and avoid complex Markdown or LaTeX symbols unless explaining a specific formula. Use bold text for emphasis instead of headers.",
        },
        history: history,
      });
      const response = await chat.sendMessage({ message });
      return response.text;
    } catch (error) {
      return handleAIError(error);
    }
  },

  async moderateContent(text: string): Promise<{ approved: boolean, reason?: string }> {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze if this content is appropriate for a school study community. 
        Content: "${text}"
        Return JSON: { "approved": boolean, "reason": "string if rejected" }`,
        config: {
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(response.text || '{"approved":true}');
    } catch (error) {
      console.warn("Moderation failed, allowing content:", error);
      return { approved: true };
    }
  },

  async processCommunityPost(title: string, description: string): Promise<{ approved: boolean, reason?: string, isNotes: boolean, aiAnswer?: string }> {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this student's question for a community forum:
        Title: ${title}
        Description: ${description}
        
        Tasks:
        1. Moderate: Is it appropriate? (No abuse, spam, or non-educational content)
        2. Notes Check: Is the user primarily asking for notes/PDFs/study material?
        3. Expert Answer: If approved and NOT a notes request, provide a helpful, concise answer in simple Hinglish (under 100 words).
        
        Return ONLY a JSON object:
        {
          "approved": boolean,
          "reason": "reason if rejected",
          "isNotes": boolean,
          "aiAnswer": "your expert answer here"
        }`,
        config: {
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(response.text || '{"approved":true, "isNotes":false}');
    } catch (error) {
      console.error("Process Post Error:", error);
      // Fallback: allow post but no AI answer
      return { approved: true, isNotes: false };
    }
  },

  async getCommunityAnswer(title: string, description: string): Promise<string> {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide a helpful, expert answer to this student's question for the community forum.
        Title: ${title}
        Description: ${description}`,
      });
      return response.text || "That's a great question! I'm looking into it.";
    } catch (error) {
      return handleAIError(error);
    }
  }
};

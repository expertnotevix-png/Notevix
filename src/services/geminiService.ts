import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Support both AI Studio (process.env) and external Vite deployments (VITE_ prefix)
    // Note: In Cloudflare Pages, use a regular "Environment Variable", NOT a "Secret" 
    // because Secrets are not available during the 'npm run build' process.
    const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                   (import.meta as any).env?.VITE_GEMINI_API_KEY;
    
    // Check for NVIDIA API Key if user wants to use NVIDIA
    const nvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY || (import.meta as any).env?.VITE_NVIDIA_API;
    
    if (!apiKey && !nvidiaKey) {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname.includes('ais-dev');
      const message = isLocal 
        ? "AI Configuration Error: Please add VITE_GEMINI_API_KEY or VITE_NVIDIA_API_KEY to 'Settings > Secrets' and click 'Apply Changes'."
        : "AI Configuration Error: Please add AI keys to your environment and redeploy.";
      
      console.error("AI API Key Error:", message);
      throw new Error(message);
    }
    
    // Only initialize Gemini if we have a key
    if (apiKey) {
      aiInstance = new GoogleGenAI({ apiKey });
    }
  }
  return aiInstance;
}

function handleAIError(error: any): never {
  console.error("AI Service Error:", error);
  
  const errorString = error?.message?.toLowerCase() || "";
  
  // Specific NVIDIA errors
  if (errorString.includes('unauthorized') || errorString.includes('401')) {
    throw new Error("AI Configuration Error: The API key is invalid. Please check your NVIDIA or Gemini key in Settings! 🔑");
  }

  // Check for Rate Limit (429)
  if (errorString.includes('429') || error?.status === 429 || errorString.includes('quota') || errorString.includes('exhausted') || errorString.includes('rate limit')) {
    throw new Error("AI Limit Reached: The AI is a bit tired from high usage. Please wait a minute and try again! ⏳");
  }
  
  // Check for Safety Filters
  if (errorString.includes('safety') || errorString.includes('blocked')) {
    throw new Error("I can't answer that. Please ask something related to your studies! 📚");
  }

  // Generic Error
  throw new Error("AI is currently busy or sleepy. This usually happens if the API key is wrong or the service is down. Please try again in a few seconds! 😴");
}

export const geminiService = {
  async solveDoubt(query: string) {
    try {
      const nvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY || (import.meta as any).env?.VITE_NVIDIA_API;
      if (nvidiaKey) {
        return await this.callNvidiaAPI(query, "You are an expert CBSE Class 8-10 tutor. Answer the student's doubt in simple Hinglish (Hindi + English). Keep answers short, clear, and student-friendly. DO NOT use Markdown headers like '##' or '###'. DO NOT use '$' symbols for math unless it's a complex formula. Use plain bold text (e.g., **Heading**) for emphasis. Use bullet points for lists. Make it look like a friendly chat message, not a textbook.");
      }

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: query,
        config: {
          systemInstruction: "You are an expert CBSE Class 8-10 tutor. Answer the student's doubt in simple Hinglish (Hindi + English). Keep answers short, clear, and student-friendly. DO NOT use Markdown headers like '##' or '###'. DO NOT use '$' symbols for math unless it's a complex formula. Use plain bold text (e.g., **Heading**) for emphasis. Use bullet points for lists. Make it look like a friendly chat message, not a textbook.",
        },
      });
      return response.text;
    } catch (error) {
      return handleAIError(error);
    }
  },

  async generateQuiz(subject: string, className: string) {
    const prompt = `Generate 5 challenging MCQ questions for CBSE Class ${className} ${subject} based on the standard NCERT syllabus. 
    Ensure the questions are of high quality, covering conceptual understanding and actual exam-style difficulty. 
    Avoid extremely basic/obvious questions. Include a mix of theory and practical problems if applicable.
    Return ONLY a JSON array of objects.
    Each object must have: question (string), options (array of 4 strings), correctAnswer (string matching one option), explanation (string).`;
    const system = "You are an expert CBSE exam paper setter for top-tier schools. You create high-quality, concept-based MCQs that challenge a student's understanding. Return ONLY raw JSON without markdown code blocks.";

    try {
      const nvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY || (import.meta as any).env?.VITE_NVIDIA_API;
      if (nvidiaKey) {
        const res = await this.callNvidiaAPI(prompt, system, true);
        return JSON.parse(res.replace(/```json|```/g, '').trim());
      }

      const ai = getAI();
      if (!ai) throw new Error("AI not initialized");
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
    const prompt = `Summarize the following chapter text in exactly 5 bullet points in simple Hinglish:\n\n${text}`;
    const system = "You are a helpful study assistant. Summarize the provided text into exactly 5 clear bullet points using simple Hinglish.";

    try {
      const nvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY || (import.meta as any).env?.VITE_NVIDIA_API;
      if (nvidiaKey) {
        return await this.callNvidiaAPI(prompt, system);
      }

      const ai = getAI();
      if (!ai) throw new Error("AI not initialized");
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
    const system = "You are NoteVix AI, a friendly study assistant for CBSE students. Answer anything related to the CBSE syllabus. Keep responses concise and helpful. Use simple Hinglish (Hindi + English). DO NOT use Markdown headers like '##'. DO NOT use '$' symbols for simple variables. Use bold text (**text**) for emphasis. Keep the tone conversational and easy to read for students.";

    try {
      const nvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY || (import.meta as any).env?.VITE_NVIDIA_API;
      if (nvidiaKey) {
        // Simple chat simulation for Nvidia (joining history)
        const chatPrompt = history.map(h => `${h.role}: ${h.parts[0].text}`).join("\n") + `\nuser: ${message}`;
        return await this.callNvidiaAPI(chatPrompt, system);
      }

      const ai = getAI();
      if (!ai) throw new Error("AI not initialized");
      const chat = ai.chats.create({
        model: "gemini-1.5-flash",
        config: {
          systemInstruction: "You are NoteVix AI, a friendly study assistant for CBSE students. Answer anything related to the CBSE syllabus. Keep responses concise and helpful. Use simple Hinglish (Hindi + English). DO NOT use Markdown headers like '##'. DO NOT use '$' symbols for simple variables. Use bold text (**text**) for emphasis. Keep the tone conversational and easy to read for students.",
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
    const prompt = `Analyze if this content is appropriate for a school study community. 
    Content: "${text}"
    Return ONLY JSON: { "approved": boolean, "reason": "string if rejected" }`;

    try {
      const nvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY || (import.meta as any).env?.VITE_NVIDIA_API;
      if (nvidiaKey) {
        const res = await this.callNvidiaAPI(prompt, "You are a strict community moderator. Return ONLY raw JSON.", true);
        return JSON.parse(res.replace(/```json|```/g, '').trim());
      }

      const ai = getAI();
      if (!ai) return { approved: true };
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
    const prompt = `Analyze this student's question for a community forum:
    Title: ${title}
    Description: ${description}
    
    Tasks:
    1. Moderate: Is it appropriate?
    2. Notes Check: Is the user primarily asking for notes/PDFs?
    3. Expert Answer: If approved and NOT a notes request, provide a helpful, concise answer in simple Hinglish (under 100 words).
    
    Return ONLY raw JSON:
    {
      "approved": boolean,
      "reason": "reason if rejected",
      "isNotes": boolean,
      "aiAnswer": "your answer here"
    }`;

    try {
      const nvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY || (import.meta as any).env?.VITE_NVIDIA_API;
      if (nvidiaKey) {
        const res = await this.callNvidiaAPI(prompt, "Expert CBSE Moderator. Return ONLY JSON.", true);
        return JSON.parse(res.replace(/```json|```/g, '').trim());
      }

      const ai = getAI();
      if (!ai) return { approved: true, isNotes: false };
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Analyze this student's question for a community forum:
        Title: ${title}
        Description: ${description}
        
        Tasks:
        1. Moderate: Is it appropriate? (No abuse, spam, or non-educational content)
        2. Notes Check: Is the user primarily asking for notes/PDFs/study material?
        3. Expert Answer: If approved and NOT a notes request, provide a helpful, concise answer in simple Hinglish (under 100 words). DO NOT use '##' headers or '$' symbols. Use bold text for emphasis.
        
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
    const prompt = `Provide a helpful, expert answer to this student's question for the community forum.
    Title: ${title}
    Description: ${description}`;

    try {
      const nvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY || (import.meta as any).env?.VITE_NVIDIA_API;
      if (nvidiaKey) {
        return await this.callNvidiaAPI(prompt, "Expert CBSE Tutor.");
      }

      const ai = getAI();
      if (!ai) throw new Error("AI not initialized");
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Provide a helpful, expert answer to this student's question for the community forum.
        Title: ${title}
        Description: ${description}`,
      });
      return response.text || "That's a great question! I'm looking into it.";
    } catch (error) {
      return handleAIError(error);
    }
  },

  async callNvidiaAPI(prompt: string, systemInstruction: string, isJson: boolean = false) {
    try {
      const response = await fetch("/api/ai/nvidia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta/llama-3.1-405b-instruct",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          temperature: isJson ? 0.1 : 0.5,
          top_p: 0.7,
          max_tokens: 1024,
        })
      });
      const data = await response.json();
      if (data.error) {
        // If it's a configuration error from our server
        if (typeof data.error === 'string' && data.error.includes("Key is not configured")) {
          throw new Error("AI Configuration Error: NVIDIA API Key is missing. Check your 'Secrets'! 🔑");
        }
        throw new Error(data.error.message || data.error);
      }
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error("NVIDIA API Error:", error);
      // Re-throw to be caught by the general handler
      throw error;
    }
  }
};

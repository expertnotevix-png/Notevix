import { GoogleGenAI } from "@google/genai";

let aiInstance: any = null;

function getAI() {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  const nvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY;
  
  if (!apiKey && !nvidiaKey) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname.includes('ais-dev');
    const message = isLocal 
      ? "AI Configuration Error: Please add VITE_GEMINI_API_KEY or VITE_NVIDIA_API_KEY to 'Settings > Secrets'."
      : "AI Configuration Error: Missing API keys in environment.";
    
    console.error("AI API Key Error:", message);
    throw new Error(message);
  }
  return { apiKey, nvidiaKey };
}

const MODEL_FAST = "meta/llama-3.1-8b-instruct";
const MODEL_POWER = "meta/llama-3.1-70b-instruct";

function handleAIError(error: any): never {
  console.error("AI Service Error:", error);
  
  const errorString = error?.message?.toLowerCase() || "";
  const rawMessage = error?.message || "Internal network error";
  
  // Specific check for NVIDIA's "invalid api key" which often means credits or wrong key
  if (errorString.includes('unauthorized') || errorString.includes('401') || errorString.includes('invalid api key')) {
    throw new Error(`AI Key Error: The key appears invalid or expired. Please verify your NVIDIA/Gemini API key in Cloudflare settings.`);
  }

  if (errorString.includes('429') || error?.status === 429 || errorString.includes('quota') || errorString.includes('exhausted')) {
    const service = errorString.includes('nvidia') || errorString.includes('llama') ? 'NVIDIA' : 'Gemini';
    throw new Error(`AI Limit Reached: ${service} is busy or out of credits. Please wait 1 minute or check your dashboard! ⏳`);
  }
  
  if (errorString.includes('failed to fetch') || errorString.includes('method not allowed') || errorString.includes('405')) {
    throw new Error("Direct AI Mode: Server proxy blocked. Using direct fallback... 🔄");
  }

  if (errorString.includes('timeout') || errorString.includes('abort')) {
    throw new Error("AI Timeout: The engine took too long to respond. Retrying with secondary engine...");
  }

  throw new Error(`AI Issue: ${rawMessage.substring(0, 100)}`);
}

export const geminiService = {
  // Use the official AI Studio SDK for direct calls to provide the best fallback experience
  async callGeminiDirect(prompt: string, system: string, key: string) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      // Use the preview model which matches the user's requirement
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${system}\n\nUser: ${prompt}`,
      });
      return response.text;
    } catch (err) {
      console.error("Gemini Direct Error:", err);
      throw err;
    }
  },

  async solveDoubt(query: string) {
    try {
      const { apiKey, nvidiaKey } = getAI();
      if (nvidiaKey) {
        try {
          // Use Faster model for chat tasks to prevent timeouts
          return await this.callNvidiaAPI(query, "You are an expert CBSE Class 8-10 tutor. Answer the student's doubt in simple Hinglish (Hindi + English). Keep answers short, clear, and student-friendly.", false, MODEL_FAST, 20000);
        } catch (nvidiaErr) {
          console.warn("NVIDIA failed, falling back to Gemini:", nvidiaErr);
        }
      }

      if (apiKey) {
        return await this.callGeminiDirect(query, "You are an expert CBSE Class 8-10 tutor. Answer the student's doubt in simple Hinglish (Hindi + English).", apiKey);
      }
      throw new Error("No AI providers available");
    } catch (error) {
      return handleAIError(error);
    }
  },

  async generateQuiz(subject: string, className: string) {
    const prompt = `CBSE Class ${className} ${subject} Quiz:
    Generate 5 deep NCERT MCQs.
    Format: JSON array of objects.
    Fields: question, options (4), correctAnswer, explanation.`;
    const system = "Expert CBSE Exam Setter. ONLY raw JSON []. No markdown.";

    try {
      const { apiKey, nvidiaKey } = getAI();
      if (nvidiaKey) {
        try {
          // Quizzes need more time (30s) but 8b is usually fast enough
          const res = await this.callNvidiaAPI(prompt, system, true, MODEL_FAST, 35000);
          return JSON.parse(res.replace(/```json|```/g, '').trim());
        } catch (nvidiaErr) {
          console.warn("NVIDIA Quiz slow/failed, jumping to Gemini...");
        }
      }

      if (apiKey) {
        const res = await this.callGeminiDirect(prompt, system, apiKey);
        return JSON.parse(res.replace(/```json|```/g, '').trim());
      }
      throw new Error("AI engine currently busy. Please try again in 30 seconds.");
    } catch (error) {
      return handleAIError(error);
    }
  },

  async summarizeChapter(text: string) {
    const prompt = `Summarize the following chapter text in exactly 5 bullet points in simple Hinglish:\n\n${text}`;
    const system = "You are a helpful study assistant. Summarize the provided text into exactly 5 clear bullet points using simple Hinglish.";

    try {
      const { apiKey, nvidiaKey } = getAI();
      if (nvidiaKey) {
        try {
          // Use 70b ONLY for summaries if possible, or fallback
          return await this.callNvidiaAPI(prompt, system, false, MODEL_POWER, 30000);
        } catch (nvidiaErr) {
          console.warn("NVIDIA summarize failed, falling back...");
        }
      }

      if (apiKey) {
        return await this.callGeminiDirect(prompt, system, apiKey);
      }
      throw new Error("AI engine currently busy. Please try again in 30 seconds.");
    } catch (error) {
      return handleAIError(error);
    }
  },

  async summarizeLongText(text: string, pageCount: number) {
    // Dynamic summary length: 50 pages -> 2 pages (~1000 words), 20 pages -> 1 page (~500 words)
    const targetWords = pageCount >= 40 ? 1000 : pageCount >= 20 ? 500 : 300;
    const prompt = `Please provide a detailed, comprehensive summary of this study material.
    Material length: ${pageCount} pages.
    Target summary length: approx ${targetWords} words.
    Style: Detailed yet easy to read, use bullet points for key concepts, bold terms, and Hinglish.
    
    Content:
    ${text}`;
    
    const system = `Expert Academic Summarizer. Provide a ${targetWords}-word detailed breakdown. Focus on core concepts and exam points.`;

    try {
      const { apiKey, nvidiaKey } = getAI();
      // For very long text, Gemini is better due to 1M token window
      if (apiKey) {
        return await this.callGeminiDirect(prompt, system, apiKey);
      }
      if (nvidiaKey) {
        // Long summaries need high tokens and time
        return await this.callNvidiaAPI(prompt, system, false, MODEL_POWER, 60000);
      }
      throw new Error("AI engine currently busy.");
    } catch (error) {
      return handleAIError(error);
    }
  },

  async chatWithBot(message: string, history: any[]) {
    const system = "You are NoteVix AI, a friendly study assistant for CBSE students. Answer anything related to the CBSE syllabus. Keep responses concise and helpful. Use simple Hinglish (Hindi + English). DO NOT use Markdown headers like '##'. DO NOT use '$' symbols for simple variables. Use bold text (**text**) for emphasis. Keep the tone conversational and easy to read for students.";

    try {
      const { apiKey, nvidiaKey } = getAI();
      if (nvidiaKey) {
        try {
          const chatPrompt = history.map(h => `${h.role === 'model' ? 'assistant' : h.role}: ${h.parts[0].text}`).join("\n") + `\nuser: ${message}`;
          // Use 8b for chat to keep it snappy and avoid timeouts
          return await this.callNvidiaAPI(chatPrompt, system, false, MODEL_FAST, 25000);
        } catch (nvidiaErr) {
          console.warn("NVIDIA chat failed, falling back...");
        }
      }

      if (apiKey) {
        return await this.callGeminiDirect(message, system, apiKey);
      }
      throw new Error("No AI providers available");
    } catch (error) {
      return handleAIError(error);
    }
  },

  async moderateContent(text: string): Promise<{ approved: boolean, reason?: string }> {
    const prompt = `Analyze if this content is appropriate for a school study community. 
    Content: "${text}"
    Return ONLY JSON: { "approved": boolean, "reason": "string if rejected" }`;

    try {
      const { apiKey, nvidiaKey } = getAI();
      if (nvidiaKey) {
        try {
          const res = await this.callNvidiaAPI(prompt, "You are a strict community moderator. Return ONLY raw JSON.", true, MODEL_FAST, 10000);
          return JSON.parse(res.replace(/```json|```/g, '').trim());
        } catch (nvidiaErr) {
          console.warn("NVIDIA moderate failed, falling back...");
        }
      }

      if (apiKey) {
        const res = await this.callGeminiDirect(prompt, "You are a strict community moderator. Return ONLY JSON.", apiKey);
        return JSON.parse(res.replace(/```json|```/g, '').trim());
      }
      return { approved: true };
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
      const { apiKey, nvidiaKey } = getAI();
      if (nvidiaKey) {
        try {
          const res = await this.callNvidiaAPI(prompt, "Expert CBSE Moderator. Return ONLY JSON.", true, MODEL_FAST, 20000);
          return JSON.parse(res.replace(/```json|```/g, '').trim());
        } catch (nvidiaErr) {
          console.warn("NVIDIA post process failed, falling back...");
        }
      }

      if (apiKey) {
        const res = await this.callGeminiDirect(prompt, "Expert CBSE Moderator. Return ONLY JSON.", apiKey);
        return JSON.parse(res.replace(/```json|```/g, '').trim());
      }
      return { approved: true, isNotes: false };
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
      const { apiKey, nvidiaKey } = getAI();
      if (nvidiaKey) {
        try {
          return await this.callNvidiaAPI(prompt, "Expert CBSE Tutor.", false, MODEL_FAST, 20000);
        } catch (nvidiaErr) {
          console.warn("NVIDIA community answer failed, falling back...");
        }
      }

      if (apiKey) {
        return await this.callGeminiDirect(prompt, "Expert CBSE Tutor.", apiKey);
      }
      return "That's a great question! I'm looking into it.";
    } catch (error) {
      return handleAIError(error);
    }
  },

  async callNvidiaAPI(prompt: string, systemInstruction: string, isJson: boolean = false, model: string = MODEL_POWER, customTimeout: number = 25000) {
    const { nvidiaKey } = getAI();
    console.log(`AI Transition: Attempting NVIDIA call with model ${model}...`);

    // Create a timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), customTimeout);

    try {
      // 1. Try server-side first (Secure proxy to bypass CORS)
      const response = await fetch("/api/ai/nvidia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          temperature: isJson ? 0.1 : 0.6,
          max_tokens: 2048, // Increased for long summaries
        })
      });

      clearTimeout(timeoutId);

      // If the proxy itself fails or route is not found, attempt direct fallback if we have the key
      if (response.status === 405 || response.status === 404 || response.status === 500) {
        if (nvidiaKey) {
          console.warn("NVIDIA Proxy failed (404/405/500), attempting direct browser call...");
          return await this.callNvidiaDirect(prompt, systemInstruction, nvidiaKey, model, isJson, customTimeout);
        }
      }

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        throw new Error(`Invalid AI response (Status: ${response.status}). The server returned non-JSON data.`);
      }

      if (!response.ok || !data || data.error) {
        const errMsg = data?.error?.message || data?.error || `NVIDIA Error (${response.status})`;
        throw new Error(errMsg);
      }

      if (!data.choices?.[0]?.message?.content) {
        throw new Error("NVIDIA responded but returned no content. Check your credits or usage limits.");
      }

      return data.choices[0].message.content;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`AI Timeout: NVIDIA was too slow (> ${customTimeout/1000}s). Switching engine...`);
      }
      
      // If server fetch fails (e.g. CORS or network issue), try direct with bundled key
      if (nvidiaKey && (error.message?.includes('fetch') || error.message?.includes('Network'))) {
        return await this.callNvidiaDirect(prompt, systemInstruction, nvidiaKey, model, isJson, customTimeout);
      }
      throw error;
    }
  },

  async callNvidiaDirect(prompt: string, system: string, key: string, model: string, isJson: boolean, timeout: number) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
          temperature: isJson ? 0.1 : 0.6,
          max_tokens: 2048,
        })
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        const message = data?.error?.message || data?.error || "NVIDIA Direct Call Failed";
        throw new Error(message);
      }
      return data.choices[0].message.content;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') throw new Error("NVIDIA Direct timed out. Engine is overloaded.");
      throw error;
    }
  }
};

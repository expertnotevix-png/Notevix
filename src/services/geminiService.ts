import { optimizeImageForAI } from "../lib/imageOptimizer";

let aiInstance: any = null;

function getAI() {
  const nvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY;
  
  if (!nvidiaKey) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname.includes('ais-dev');
    const message = isLocal 
      ? "AI Configuration Error: Please add VITE_NVIDIA_API_KEY to 'Settings > Secrets'."
      : "AI Configuration Error: Missing NVIDIA API key in environment.";
    
    console.error("AI API Key Error:", message);
    throw new Error(message);
  }
  return { nvidiaKey };
}

const MODEL_FAST = "meta/llama-3.1-8b-instruct";
const MODEL_POWER = "meta/llama-3.1-70b-instruct";
// Using NVIDIA specialized model for premium tasks
const PREMIUM_MODEL = "meta/llama-4-maverick-17b-128e-instruct";
const VISION_MODEL_FAST = "meta/llama-3.2-11b-vision-instruct";

function handleAIError(error: any): never {
  console.error("AI Service Error:", error);
  
  const errorString = error?.message?.toLowerCase() || "";
  const rawMessage = error?.message || "Internal network error";
  
  if (errorString.includes('unauthorized') || errorString.includes('401') || errorString.includes('invalid api key')) {
    throw new Error(`AI Key Error: The key appears invalid. Please verify your NVIDIA API key in Settings.`);
  }

  if (errorString.includes('429') || error?.status === 429 || errorString.includes('quota') || errorString.includes('exhausted')) {
    throw new Error(`Verification server busy. Try again.`);
  }
  
  if (errorString.includes('404') || errorString.includes('not found')) {
    throw new Error("Verification server busy. Try again.");
  }
  
  if (errorString.includes('failed to fetch') || errorString.includes('method not allowed') || errorString.includes('405')) {
    throw new Error("Verification server busy. Try again.");
  }

  if (errorString.includes('timeout') || errorString.includes('abort')) {
    throw new Error("Verification server busy. Try again.");
  }

  throw new Error("Invalid or unclear payment screenshot.");
}

export const geminiService = {
  async solveDoubt(query: string) {
    try {
      const { nvidiaKey } = getAI();
      if (!nvidiaKey) throw new Error("AI engine offline.");
      
      return await this.callNvidiaAPI(query, "Expert CBSE tutor. Hinglish answers.", false, MODEL_FAST, 15000);
    } catch (error) {
      return handleAIError(error);
    }
  },

  async generateQuiz(subject: string, className: string) {
    const prompt = `CBSE Class ${className} ${subject} Quiz:
    Generate 5 NCERT MCQs.
    Format: JSON array of objects with fields: question, options (4), correctAnswer, explanation.`;
    const system = "Expert CBSE Exam Setter. ONLY raw JSON []. No markdown.";

    try {
      const { nvidiaKey } = getAI();
      if (!nvidiaKey) throw new Error("AI engine busy.");

      const res = await this.callNvidiaAPI(prompt, system, true, MODEL_FAST, 25000);
      return JSON.parse(res.replace(/```json|```/g, '').trim());
    } catch (error) {
      return handleAIError(error);
    }
  },

  async summarizeChapter(text: string) {
    const prompt = `Summarize in 5 bullet points in Hinglish:\n\n${text}`;
    const system = "Helpful study assistant. 5 clear bullets.";

    try {
      const { nvidiaKey } = getAI();
      if (!nvidiaKey) throw new Error("AI engine busy.");

      return await this.callNvidiaAPI(prompt, system, false, MODEL_FAST, 30000);
    } catch (error) {
      return handleAIError(error);
    }
  },

  async summarizeLongText(text: string, pageCount: number) {
    const targetWords = pageCount >= 40 ? 1000 : pageCount >= 20 ? 500 : 300;
    const prompt = `Please provide a detailed, comprehensive summary of this study material.
    Material length: ${pageCount} pages.
    Target summary length: approx ${targetWords} words.
    Style: Detailed yet easy to read, use bullet points for key concepts, bold terms, and Hinglish.
    
    Content:
    ${text}`;
    
    const system = `Expert Academic Summarizer. Provide a ${targetWords}-word detailed breakdown. Focus on core concepts and exam points.`;

    try {
      const { nvidiaKey } = getAI();
      if (!nvidiaKey) throw new Error("AI engine currently busy.");
      
      return await this.callNvidiaAPI(prompt, system, false, MODEL_POWER, 60000);
    } catch (error) {
      return handleAIError(error);
    }
  },

  async chatWithBot(message: string, history: any[]) {
    const system = "You are NoteVix AI, a friendly study assistant for CBSE students. Answer anything related to the CBSE syllabus. Keep responses concise and helpful. Use simple Hinglish (Hindi + English). DO NOT use Markdown headers like '##'. DO NOT use '$' symbols for simple variables. Use bold text (**text**) for emphasis. Keep the tone conversational and easy to read for students.";

    try {
      const { nvidiaKey } = getAI();
      if (!nvidiaKey) throw new Error("No AI available");
      
      const chatPrompt = history.map(h => `${h.role === 'model' ? 'assistant' : h.role}: ${h.parts[0].text}`).join("\n") + `\nuser: ${message}`;
      return await this.callNvidiaAPI(chatPrompt, system, false, MODEL_FAST, 25000);
    } catch (error) {
      return handleAIError(error);
    }
  },

  async moderateContent(text: string): Promise<{ approved: boolean, reason?: string }> {
    const prompt = `Analyze if this content is appropriate for a school study community. 
    Content: "${text}"
    Return ONLY JSON: { "approved": boolean, "reason": "string if rejected" }`;

    try {
      const { nvidiaKey } = getAI();
      if (!nvidiaKey) return { approved: true };

      const res = await this.callNvidiaAPI(prompt, "You are a strict community moderator. Return ONLY raw JSON.", true, MODEL_FAST, 10000);
      return JSON.parse(res.replace(/```json|```/g, '').trim());
    } catch (error) {
      return { approved: true };
    }
  },

  async processCommunityPost(title: string, description: string): Promise<{ approved: boolean, reason?: string, isNotes: boolean, aiAnswer?: string }> {
    const prompt = `Analyze this student's question for a community forum:
    Title: ${title}
    Description: ${description}
    
    Tasks:
    1. Moderate appropriateness.
    2. Notes Check: Is this primarily for notes?
    3. Expert Response: Short Hinglish answer.
    
    Return ONLY JSON: { "approved": boolean, "reason": "...", "isNotes": boolean, "aiAnswer": "..." }`;

    try {
      const { nvidiaKey } = getAI();
      if (!nvidiaKey) return { approved: true, isNotes: false };

      const res = await this.callNvidiaAPI(prompt, "Expert CBSE Moderator. Return ONLY JSON.", true, MODEL_FAST, 20000);
      return JSON.parse(res.replace(/```json|```/g, '').trim());
    } catch (error) {
      return { approved: true, isNotes: false };
    }
  },

  async getCommunityAnswer(title: string, description: string): Promise<string> {
    const prompt = `Answer this student's question for the community forum.
    Title: ${title}
    Description: ${description}`;

    try {
      const { nvidiaKey } = getAI();
      if (!nvidiaKey) return "I'm looking into that for you!";

      return await this.callNvidiaAPI(prompt, "Expert CBSE Tutor.", false, MODEL_FAST, 20000);
    } catch (error) {
      return handleAIError(error);
    }
  },

  async callNvidiaAPI(prompt: string, systemInstruction: string, isJson: boolean = false, model: string = MODEL_POWER, customTimeout: number = 25000, imageData?: string, options: { temperature?: number, max_tokens?: number } = {}) {
    const { nvidiaKey } = getAI();
    console.log(`AI Transition: Attempting NVIDIA call with model ${model}...`);

    // Create a timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), customTimeout);

    try {
      const messages: any[] = [
        { role: "system", content: systemInstruction }
      ];

      if (imageData) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { 
                url: imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}` 
              } 
            }
          ]
        });
      } else {
        messages.push({ role: "user", content: prompt });
      }

      // 1. Try server-side first
      const response = await fetch("/api/ai/nvidia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? (isJson ? 0.1 : 0.6),
          max_tokens: options.max_tokens ?? 2048,
        })
      });

      clearTimeout(timeoutId);

      // If the proxy itself fails or route is not found, attempt direct fallback if we have the key
      if (response.status === 405 || response.status === 404 || response.status === 500) {
        if (nvidiaKey) {
          console.warn("NVIDIA Proxy failed (404/405/500), attempting direct browser call...");
          return await this.callNvidiaDirect(prompt, systemInstruction, nvidiaKey, model, isJson, customTimeout, imageData, options);
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
        throw new Error(`AI Timeout: NVIDIA was too slow (> ${customTimeout/1000}s). Please try again.`);
      }
      
      // If server fetch fails (e.g. CORS or network issue), try direct with bundled key
      if (nvidiaKey && (error.message?.includes('fetch') || error.message?.includes('Network'))) {
        return await this.callNvidiaDirect(prompt, systemInstruction, nvidiaKey, model, isJson, customTimeout, imageData);
      }
      throw error;
    }
  },

  async callNvidiaDirect(prompt: string, system: string, key: string, model: string, isJson: boolean, timeout: number, imageData?: string, options: { temperature?: number, max_tokens?: number } = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const messages: any[] = [
        { role: "system", content: system }
      ];

      if (imageData) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { 
                url: imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}` 
              } 
            }
          ]
        });
      } else {
        messages.push({ role: "user", content: prompt });
      }

      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? (isJson ? 0.1 : 0.6),
          max_tokens: options.max_tokens ?? 2048,
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

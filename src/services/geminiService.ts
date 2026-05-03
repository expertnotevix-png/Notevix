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
const GEMINI_MODEL = "gemini-3-flash-preview";

function handleAIError(error: any): never {
  console.error("AI Service Error:", error);
  
  const errorString = error?.message?.toLowerCase() || "";
  const rawMessage = error?.message || "Internal network error";
  
  if (errorString.includes('unauthorized') || errorString.includes('401') || errorString.includes('invalid api key')) {
    throw new Error(`AI Key Error: The key appears invalid. Please verify your NVIDIA/Gemini API key in Settings.`);
  }

  if (errorString.includes('429') || error?.status === 429 || errorString.includes('quota') || errorString.includes('exhausted')) {
    const service = errorString.includes('nvidia') || errorString.includes('llama') ? 'NVIDIA' : 'Gemini';
    throw new Error(`AI Limit Reached: ${service} is busy. Please wait a moment! ⏳`);
  }
  
  if (errorString.includes('failed to fetch') || errorString.includes('method not allowed') || errorString.includes('405')) {
    throw new Error("AI Connection Error: Server proxy issue. Reconnecting... 🔄");
  }

  if (errorString.includes('timeout') || errorString.includes('abort')) {
    throw new Error("AI Timeout: The engine was slow. Retrying...");
  }

  throw new Error(`AI Issue: ${rawMessage.substring(0, 100)}`);
}

export const geminiService = {
  async callGeminiDirect(prompt: string, system: string, key: string) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
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
          return await this.callNvidiaAPI(query, "Expert CBSE tutor. Hinglish answers.", false, MODEL_FAST, 15000);
        } catch (nvidiaErr) {
          console.warn("NVIDIA failed, trying Gemini...", nvidiaErr);
        }
      }

      if (apiKey) {
        return await this.callGeminiDirect(query, "You are an expert CBSE tutor. Answer CBSE Class 8-10 doubts in simple Hinglish. Keep answers clear and student-friendly.", apiKey);
      }
      
      throw new Error("No AI providers available");
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
      const { apiKey, nvidiaKey } = getAI();

      if (nvidiaKey) {
        try {
          const res = await this.callNvidiaAPI(prompt, system, true, MODEL_FAST, 25000);
          return JSON.parse(res.replace(/```json|```/g, '').trim());
        } catch (err) {
          console.warn("NVIDIA Quiz failed, trying Gemini...");
        }
      }

      if (apiKey) {
        const res = await this.callGeminiDirect(prompt, system, apiKey);
        return JSON.parse(res.replace(/```json|```/g, '').trim());
      }
      throw new Error("AI engine busy.");
    } catch (error) {
      return handleAIError(error);
    }
  },

  async summarizeChapter(text: string) {
    const prompt = `Summarize in 5 bullet points in Hinglish:\n\n${text}`;
    const system = "Helpful study assistant. 5 clear bullets.";

    try {
      const { apiKey, nvidiaKey } = getAI();
      if (nvidiaKey) {
        try {
          return await this.callNvidiaAPI(prompt, system, false, MODEL_FAST, 30000);
        } catch (err) {
          console.warn("NVIDIA Summary failed, trying Gemini...");
        }
      }

      if (apiKey) {
        return await this.callGeminiDirect(prompt, system, apiKey);
      }
      throw new Error("AI engine busy.");
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
      
      if (nvidiaKey) {
        try {
          // Long summaries need high tokens and time
          return await this.callNvidiaAPI(prompt, system, false, MODEL_POWER, 60000);
        } catch (err) {
          console.warn("NVIDIA Long Summary failed, trying Gemini...");
        }
      }

      if (apiKey) {
        return await this.callGeminiDirect(prompt, system, apiKey);
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
          return await this.callNvidiaAPI(chatPrompt, system, false, MODEL_FAST, 25000);
        } catch (err) {
          console.warn("NVIDIA chat failed, trying Gemini...");
        }
      }

      if (apiKey) {
        return await this.callGeminiDirect(message, system, apiKey);
      }
      
      throw new Error("No AI available");
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
        } catch (err) {
          console.warn("NVIDIA Moderate failed, trying Gemini...");
        }
      }

      if (apiKey) {
        const res = await this.callGeminiDirect(prompt, "Moderate school community content. JSON ONLY.", apiKey);
        return JSON.parse(res.replace(/```json|```/g, '').trim());
      }
      return { approved: true };
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
      const { apiKey, nvidiaKey } = getAI();
      
      if (nvidiaKey) {
        try {
          const res = await this.callNvidiaAPI(prompt, "Expert CBSE Moderator. Return ONLY JSON.", true, MODEL_FAST, 20000);
          return JSON.parse(res.replace(/```json|```/g, '').trim());
        } catch (err) {
          console.warn("NVIDIA Post Process failed, trying Gemini...");
        }
      }

      if (apiKey) {
        const res = await this.callGeminiDirect(prompt, "Expert CBSE Moderator. JSON ONLY.", apiKey);
        return JSON.parse(res.replace(/```json|```/g, '').trim());
      }
      return { approved: true, isNotes: false };
    } catch (error) {
      return { approved: true, isNotes: false };
    }
  },

  async getCommunityAnswer(title: string, description: string): Promise<string> {
    const prompt = `Answer this student's question for the community forum.
    Title: ${title}
    Description: ${description}`;

    try {
      const { apiKey, nvidiaKey } = getAI();
      
      if (nvidiaKey) {
        try {
          return await this.callNvidiaAPI(prompt, "Expert CBSE Tutor.", false, MODEL_FAST, 20000);
        } catch (err) {
          console.warn("NVIDIA Community Answer failed, trying Gemini...");
        }
      }

      if (apiKey) {
        return await this.callGeminiDirect(prompt, "Expert CBSE Tutor.", apiKey);
      }
      return "I'm looking into that for you!";
    } catch (error) {
      return handleAIError(error);
    }
  },

  async verifyPaymentScreenshot(imageData: string): Promise<{ isValid: boolean, transactionId?: string, amount?: number, error?: string }> {
    const prompt = `Analyze this receipt screenshot. Extract the transaction ID (UTR/Ref) and the amount paid. Return ONLY JSON: { "isValid": boolean, "transactionId": "string", "amount": number, "error": "string if invalid" }`;
    const system = "Payment Forensics Expert. Return ONLY JSON.";

    try {
      const { apiKey, nvidiaKey } = getAI();
      
      let res;
      if (nvidiaKey) {
        try {
          res = await this.callNvidiaAPI(prompt, system, true, "nvidia/llama-3.2-11b-vision-instruct", 30000, imageData);
        } catch (err) {
          console.warn("NVIDIA Vision failed, falling back to Gemini...", err);
        }
      }

      if (!res && apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: imageData.split(',')[1] } },
              { text: `${system}\n\n${prompt}` }
            ]
          }
        });
        res = response.text;
      }

      if (!res) throw new Error("No AI service available");

      const data = JSON.parse(res.replace(/```json|```/g, '').trim());
      return {
        isValid: data.isValid,
        transactionId: data.transactionId,
        amount: data.amount,
        error: data.error
      };
    } catch (error) {
      console.error("Payment Verification Error:", error);
      return { isValid: false, error: "Verification failed. Please try again or enter details manually." };
    }
  },

  async callNvidiaAPI(prompt: string, systemInstruction: string, isJson: boolean = false, model: string = MODEL_POWER, customTimeout: number = 25000, imageData?: string) {
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
          temperature: isJson ? 0.1 : 0.6,
          max_tokens: 2048,
        })
      });

      clearTimeout(timeoutId);

      // If the proxy itself fails or route is not found, attempt direct fallback if we have the key
      if (response.status === 405 || response.status === 404 || response.status === 500) {
        if (nvidiaKey) {
          console.warn("NVIDIA Proxy failed (404/405/500), attempting direct browser call...");
          return await this.callNvidiaDirect(prompt, systemInstruction, nvidiaKey, model, isJson, customTimeout, imageData);
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
        return await this.callNvidiaDirect(prompt, systemInstruction, nvidiaKey, model, isJson, customTimeout, imageData);
      }
      throw error;
    }
  },

  async callNvidiaDirect(prompt: string, system: string, key: string, model: string, isJson: boolean, timeout: number, imageData?: string) {
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

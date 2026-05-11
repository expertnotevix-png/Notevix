import { GoogleGenAI } from "@google/genai";
import { optimizeImageForAI } from "../lib/imageOptimizer";

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

  if (errorString.includes('429') || error?.status === 429 || errorString.includes('quota') || errorString.includes('exhausted') || errorString.includes('resource_exhausted')) {
    const service = errorString.includes('nvidia') || errorString.includes('llama') ? 'NVIDIA' : 'Gemini AI';
    throw new Error(`AI Limit Reached: ${service} is busy. Please wait 60 seconds before trying again! ⏳`);
  }
  
  if (errorString.includes('404') || errorString.includes('not found')) {
    throw new Error("AI Model Error: The requested AI model is currently unavailable in your region or key type.");
  }
  
  if (errorString.includes('failed to fetch') || errorString.includes('method not allowed') || errorString.includes('405')) {
    throw new Error("AI Connection Error: Server proxy issue. Reconnecting... 🔄");
  }

  if (errorString.includes('timeout') || errorString.includes('abort')) {
    throw new Error("Verification taking too long. Please try again.");
  }

  throw new Error("Verification failed. Please upload a clearer screenshot.");
}

export const geminiService = {
  async callGeminiDirect(prompt: string, system: string, key: string) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        config: {
          systemInstruction: system
        },
        contents: prompt,
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
    const system = `You are NoteVix Forensic Payment Verifier. 
    Analyze this payment screenshot for NoteVix premium notes.
    
    STRICT VERIFICATION CRITERIA (Any failure = Reject):
    1. REALITY CHECK: Image must be a genuine, unedited, high-quality mobile screenshot from a legitimate payment app (PhonePe, Google Pay, Paytm, Amazon Pay, MobiKwik). 
       Reject if: 
       - It is a photo taken from another screen (visible moiré patterns).
       - Any sign of image manipulation (misaligned text, mismatched fonts, shadow artifacts, "cleaning" marks).
       - It looks like a digital recreation or fake template.
    2. RECIPIENT CHECK: Must show payment to:
       - Name: "Poonam Devi" (Primary)
       - UPI ID: "9236489649@mbk" or "9236489649@ybl" or similar ending in 9649.
    3. STATUS CHECK: Transaction state must be "SUCCESSFUL", "PAID", or "DONE". 
       Reject if: "Pending", "Failed", "Processing", or "Cancelled".
    4. AMOUNT CHECK: Amount must follow our pricing (₹39, ₹99, or ₹199). 
       Reject if amount is modified or zero.
    5. TRANSACTION ID: Must have a clear, full, and readable Transaction ID (UTR, Ref No, or Txn ID). 
       Extract at least 10 characters. Reject if obscured or illegible.
    6. TIMESTAMP: Must show a recent date/time (today or within 24 hours of current system time).
    
    DATA EXTRACTION:
    - amount (number)
    - transactionId (string - extract exactly as shown, no extra characters)
    - paymentApp (string - name of the app used)
    - paymentTimestamp (string - as seen on screen)
    
    OUTPUT FORMAT (JSON ONLY):
    {
      "verified": boolean,
      "reason": "Very short, specific reason (e.g. 'Invalid recipient name', 'Suspected image manipulation', 'Amount mismatch')",
      "amount": number,
      "transactionId": "string",
      "paymentApp": "string",
      "paymentTimestamp": "string"
    }`;

    const prompt = "Perform strict forensic verification on this payment receipt for NoteVix.";

    try {
      const { apiKey } = getAI();

      // PER USER REQUEST: Use Gemini ONLY for premium verification
      if (!apiKey) throw new Error("Payment verification engine offline. Missing Gemini API Key.");

      const ai = new GoogleGenAI({ apiKey });
      
      // Optimize image first
      let optimizedImage = imageData;
      try {
        optimizedImage = await optimizeImageForAI(imageData, 1024, 0.8);
      } catch (e) {
        console.warn("Payment image optimization failed:", e);
      }

      const base64Data = optimizedImage.includes(',') ? optimizedImage.split(',')[1] : optimizedImage;
      
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        config: { 
          systemInstruction: system,
          responseMimeType: "application/json"
        },
        contents: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
        ]
      });

      return this.parsePaymentResult(response.text || "");
    } catch (error: any) {
      console.error("Forensic Payment Failure:", error);
      return handleAIError(error);
    }
  },

  parsePaymentResult(res: string): { isValid: boolean, transactionId?: string, amount?: number, error?: string } {
    console.log("Gemini Forensic RAW:", res);
    
    try {
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON response from AI");

      const data = JSON.parse(jsonMatch[0].replace(/\\n/g, ''));
      
      return {
        isValid: Boolean(data.verified),
        transactionId: String(data.transactionId || "").toUpperCase().replace(/[^A-Z0-9]/g, ''),
        amount: Number(data.amount || 0),
        error: data.reason
      };
    } catch (e) {
      // Fallback for non-json or partial extraction using Regex if Gemini fails structured output
      const utrMatch = res.match(/\b\d{12}\b/);
      const phonePeMatch = res.match(/\bT\d{18,}\b/i);
      const foundId = utrMatch ? utrMatch[0] : (phonePeMatch ? phonePeMatch[0] : null);
      
      if (foundId) {
        return {
          isValid: res.toLowerCase().includes('success') || res.toLowerCase().includes('verified": true'),
          transactionId: foundId.toUpperCase(),
          amount: 0
        };
      }
      throw new Error("Verification failed. Please ensure your payment screenshot is clear and shows the UTR number.");
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
        throw new Error(`AI Timeout: NVIDIA was too slow (> ${customTimeout/1000}s). Switching engine...`);
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
  },

  async verifyStoryScreenshot(imageData: string, template: { title: string, link: string }): Promise<{ isValid: boolean, confidence: number, raw: any }> {
    const system = "Analyze screenshot for Instagram/Snapchat Story UI and NoteVix branding. Be lenient. RETURN JSON ONLY: { \"verified\": boolean, \"confidence\": number }";
    
    const prompt = `Is this a genuine social media story post containing "NoteVix" branding/content (ref: ${template.title})? 
    Accept even if blurry or low quality as long as branding seems present.
    Strictly JSON response.`;

    const MAX_RETRIES = 1;
    let attempt = 0;

    const performVerification = async (img: string): Promise<any> => {
      try {
        // NVIDIA Vision with 20s hard timeout (as requested for meta/llama-4-maverick-17b-128e-instruct)
        const res = await this.callNvidiaAPI(
          prompt, 
          system, 
          true, 
          "meta/llama-4-maverick-17b-128e-instruct", 
          20000, 
          img,
          { temperature: 0, max_tokens: 80 }
        );
        
        const cleaned = res.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleaned);
        
        // Lenient verification logic: Auto-verify if confidence > 0.45 or verified is true
        if (result && (typeof result.verified === 'boolean' || typeof result.confidence === 'number')) {
          const isVerified = Boolean(result.verified) || (Number(result.confidence || 0) > 0.45);
          return {
            isValid: isVerified,
            confidence: Number(result.confidence || 0),
            raw: result
          };
        }
        throw new Error("Malformed response");
      } catch (err) {
        throw err;
      }
    };

    try {
      // 1. Image Optimization (Max 720px width)
      let optimizedImage = imageData;
      try {
        optimizedImage = await optimizeImageForAI(imageData, 720, 0.7);
      } catch (optErr) {
        console.warn("Optimization failed:", optErr);
      }

      // 2. Retry Logic
      while (attempt <= MAX_RETRIES) {
        try {
          return await performVerification(optimizedImage);
        } catch (error) {
          attempt++;
          if (attempt > MAX_RETRIES) throw error;
          console.warn(`Verification retry ${attempt}...`);
          await new Promise(r => setTimeout(r, 500));
        }
      }

      throw new Error("Verification taking too long");
    } catch (error: any) {
      console.error("Story Verification Failure:", error);
      // For free verification, we fallback to a safe state if AI fails completely
      return {
        isValid: true, // Emergency verify to not block free users
        confidence: 1.0,
        raw: { fallback: true, error: error.message }
      };
    }
  }
};

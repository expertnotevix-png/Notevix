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

  async verifyPaymentScreenshot(imageData: string, expectedPrice: number, pdfName: string, passwordToReturn: string): Promise<{ verified: boolean, unlock: boolean, password?: string, transactionId?: string, amount?: number, reason?: string, paymentApp?: string }> {
    const system = `You are a strict NoteVix Premium Payment Verification AI.
    
    APPROVE ONLY IF ALL CONDITIONS MATCH:
    1. STATUS: Payment state must be "SUCCESSFUL", "PAID", or "DONE".
    2. RECEIVER: Must be "Poonam Devi" OR UPI ID "9236489649@mbk" (or similar ending in 9649).
    3. AMOUNT: Must EXACTLY match ₹${expectedPrice}.
    4. APP: Must be a real payment app (Paytm, PhonePe, Google Pay, BHIM, Mobikwik).
    5. LEGITIMACY: Reject if:
       - Screenshot looks edited or manipulated (fonts don't match, UI looks fake).
       - It is a photo of another mobile/computer screen.
       - It is a partial screenshot missing critical info.
    6. TRANSACTION ID: Must have a clearly visible UTR / Ref No / Transaction ID (usually 12 digits for UPI).

    IF VERIFIED:
    Immediately return JSON: { "verified": true, "unlock": true, "password": "${passwordToReturn}", "transactionId": "...", "amount": ${expectedPrice}, "paymentApp": "..." }

    IF FAILED:
    Strictly return one of these specific reasons in the JSON:
    - "Transaction ID already used." (Never return this reason yourself, but be aware of it)
    - "Payment amount does not match PDF price." (if amount is wrong)
    - "Receiver verification failed." (if recipient is not Poonam Devi)
    - "Transaction ID not detected." (if UTR is missing or unreadable)
    - "Invalid or unclear payment screenshot." (if edited, blurry, fake, or photo of screen)
    
    Return JSON: { "verified": false, "unlock": false, "reason": "Reason from above list" }`;

    const prompt = `Very strictly verify payment for "${pdfName}" (Price: ₹${expectedPrice}). Extract the 12-digit UTR/Ref ID and Payment App. If valid, return the password "${passwordToReturn}". If invalid, pick the best reason from the approved list.`;

    try {
      const { nvidiaKey } = getAI();
      if (!nvidiaKey) throw new Error("Payment verification engine offline.");

      let optimizedImage = imageData;
      try {
        optimizedImage = await optimizeImageForAI(imageData, 1024, 0.8);
      } catch (e) {
        console.warn("Image optimization failed:", e);
      }

      const res = await this.callNvidiaAPI(
        prompt, 
        system, 
        true, 
        PREMIUM_MODEL, 
        15000, 
        optimizedImage,
        { temperature: 0, max_tokens: 200 }
      );

      const parsed = this.parseStrictPaymentResult(res || "");
      if (parsed.verified && !parsed.password) {
        parsed.password = passwordToReturn;
      }
      return parsed;
    } catch (error: any) {
      console.error("Forensic Payment Failure:", error);
      return { verified: false, unlock: false, reason: error.message || "Connection Error" };
    }
  },

  parseStrictPaymentResult(res: string): any {
    try {
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI response was not in JSON format.");

      const data = JSON.parse(jsonMatch[0]);
      if (data.verified === false && !data.reason) {
        data.reason = "AI rejected the receipt but provided no specific reason.";
      }
      return data;
    } catch (e) {
      const utrMatch = res.match(/\b\d{12}\b/);
      if (utrMatch) {
         return { verified: true, unlock: true, transactionId: utrMatch[0] };
      }
      
      // If we can't parse JSON, try to extract a reason from the raw text
      const failureKeywords = ['reject', 'failed', 'invalid', 'mismatch', 'unclear', 'recipient', 'amount'];
      const lines = res.split('\n');
      const reasonLine = lines.find(l => failureKeywords.some(k => l.toLowerCase().includes(k)));
      
      return { 
        verified: false, 
        unlock: false, 
        reason: reasonLine ? reasonLine.trim().substring(0, 100) : "Could not verify payment details. Please try again with a clearer screenshot."
      };
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

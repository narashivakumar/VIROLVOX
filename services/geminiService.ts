
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedContent, VoiceName, Language, CloudflareConfig } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

function sanitizeJson(jsonStr: string): string {
  return jsonStr
    .replace(/^```json\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
}

export async function generateViralContent(
  topic: string, 
  videoType: string, 
  tone: string,
  language: Language = 'English',
  niche?: string
): Promise<GeneratedContent> {
  const ai = getAI();
  const languageInstruction = language === 'English' 
    ? 'The script and metadata MUST be in English.' 
    : `The script, titles, descriptions, and captions MUST be generated in ${language} using its native script (Devanagari for Hindi, Telugu script for Telugu). 
       MANDATORY: Translate all content naturally into ${language}.
       IMPORTANT: The "visual" descriptions for image generation MUST remain in descriptive English for high-quality AI image results.`;

  const prompt = `
    Create a complete viral social media kit for a "${videoType}" video about "${topic}".
    Target Tone: "${tone}"
    ${languageInstruction}

    Return a valid JSON object. Ensure the "hook" is extremely catchy and native to the selected language.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          script: {
            type: Type.OBJECT,
            properties: {
              hook: { type: Type.STRING },
              body: { type: Type.STRING },
              cta: { type: Type.STRING },
              fullText: { type: Type.STRING }
            },
            required: ["hook", "body", "cta", "fullText"]
          },
          template: {
            type: Type.OBJECT,
            properties: {
              frames: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    visual: { type: Type.STRING },
                    text: { type: Type.STRING },
                    timing: { type: Type.STRING }
                  },
                  required: ["id", "visual", "text", "timing"]
                }
              },
              musicVibe: { type: Type.STRING },
              captionsStyle: { type: Type.STRING }
            },
            required: ["frames", "musicVibe", "captionsStyle"]
          },
          youtubeMetadata: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "description", "tags"]
          },
          instagramMetadata: {
            type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["caption", "hashtags"]
          },
          facebookMetadata: {
            type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING }
            },
            required: ["caption"]
          }
        },
        required: ["script", "template", "youtubeMetadata", "instagramMetadata", "facebookMetadata"]
      }
    }
  });

  const sanitized = sanitizeJson(response.text || '{}');
  return JSON.parse(sanitized) as GeneratedContent;
}

export async function generateSpeech(text: string, voice: VoiceName, tone: string, language: Language = 'English'): Promise<string> {
  const ai = getAI();
  const instruction = `Perform this social media voiceover in ${language}. Tone: ${tone}. Speak clearly and naturally.
  TEXT: "${text}"`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: instruction }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio synthesis failed.");
  return base64Audio;
}

// --- Image Generation Engines ---

export async function generateImageGemini(prompt: string, videoType: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `High quality cinematic vertical 9:16 viral ${videoType} visual: ${prompt}` }],
    },
    config: { imageConfig: { aspectRatio: "9:16" } },
  });

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part?.inlineData?.data) throw new Error("Gemini Image failed.");
  return `data:image/png;base64,${part.inlineData.data}`;
}

export async function generateImageImageRouter(prompt: string, apiKey: string): Promise<string> {
  const url = 'https://api.imagerouter.io/v1/openai/images/generations';
  const payload = {
    prompt: `Vertical 9:16 high-quality viral background: ${prompt}`,
    model: 'test/test',
    quality: 'auto',
    size: 'auto',
    response_format: 'url',
    output_format: 'webp'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error("ImageRouter error");
  const data = await response.json();
  return data.data?.[0]?.url || data.url;
}

export async function generateImageCloudflare(prompt: string, config: CloudflareConfig): Promise<string> {
  const response = await fetch(config.workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({ prompt: `Vertical cinematic background: ${prompt}` })
  });
  if (!response.ok) throw new Error("Cloudflare Engine error");
  
  // Assuming the worker returns the image bytes directly or a URL
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function generateImagePollinations(prompt: string): Promise<string> {
  const enhancedPrompt = encodeURIComponent(`9:16 Vertical cinematic social media viral visual: ${prompt}`);
  return `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=1080&height=1920&nologo=true&seed=${Math.floor(Math.random()*1000)}`;
}

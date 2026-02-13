
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedContent, VoiceName, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateViralContent(
  topic: string, 
  style: string, 
  language: Language = 'English',
  niche?: string
): Promise<GeneratedContent> {
  const languageInstruction = language === 'English' 
    ? 'The script and metadata MUST be in English.' 
    : `The script and metadata (except technical descriptions) MUST be in ${language}. Ensure correct ${language} script characters are used. However, keep the "visual" descriptions for image generation in descriptive English for better quality.`;

  const nicheContext = niche ? `specifically tailored for the "${niche}" niche` : '';

  const prompt = `
    Create a complete viral social media kit ${nicheContext} for the topic: "${topic}" in a "${style}" style.
    
    ${languageInstruction}

    Deliver:
    1. A script with hook, body, and cta. The hook must be extremely catchy for short-form video (0-3 seconds).
    2. A 5-frame story template with detailed visual prompts and captions. The "visual" part should be a detailed prompt for an image generator.
    3. YouTube Kit: High CTR Title, Description (with timestamps), and 10 Tags.
    4. Instagram Kit: A viral caption with a "Follow for daily motivation" style CTA and 6 trending hashtags.
    5. Facebook Kit: An engagement-focused caption ending with a specific community prompt like "If you agree, comment YES 👇".
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
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

  const result = JSON.parse(response.text || '{}');
  return result as GeneratedContent;
}

export async function generateSpeech(text: string, voice: VoiceName, language: Language = 'English'): Promise<string> {
  const instruction = language === 'English' 
    ? `Read this with high energy and a viral social media vibe: ${text}`
    : `Read this social media script in ${language} with natural, engaging tone. Text: ${text}`;

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
  if (!base64Audio) throw new Error("Failed to generate audio");
  return base64Audio;
}

export async function generateImage(prompt: string, style: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { 
      parts: [{ 
        text: `Cinematic professional photography, high-quality, 8k resolution, 9:16 vertical ratio. Style: ${style}. Scene: ${prompt}` 
      }] 
    },
    config: {
      imageConfig: { aspectRatio: "9:16" }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated");
}

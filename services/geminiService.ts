import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedContent, VoiceName, Language } from "../types";

// Always initialize fresh to ensure latest environment key
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

function sanitizeJson(jsonStr: string): string {
  return jsonStr
    .replace(/^```json\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
}

/**
 * Generates viral script, frames, and social metadata using Gemini 3 Flash
 */
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
    : `The script, titles, descriptions, and captions MUST be generated in ${language} using its native script characters. 
       MANDATORY: Translate all spoken and written content naturally into ${language}.
       IMPORTANT: The "visual" descriptions for image generation MUST remain in descriptive English to ensure high-quality AI image results.`;

  const prompt = `
    Create a complete viral social media kit for a "${videoType}" video about "${topic}".
    Niche Context: "${niche || 'General'}"
    Target Tone: "${tone}"
    ${languageInstruction}

    Return a valid JSON object matching the requested schema. Ensure the "hook" is extremely catchy and native to the selected language.
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
                    visual: { type: Type.STRING, description: "Detailed English visual prompt for Gemini Image" },
                    text: { type: Type.STRING, description: "Caption text in the target language script" },
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

/**
 * Generates speech audio using Gemini 2.5 Flash TTS
 */
export async function generateSpeech(text: string, voice: VoiceName, tone: string, language: Language = 'English'): Promise<string> {
  const ai = getAI();
  const instruction = `Perform this social media voiceover in ${language}. Tone: ${tone}. Speak naturally and engagingly.
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

/**
 * Generates an image using Gemini 2.5 Flash Image
 */
export async function generateImage(prompt: string, videoType: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `High-quality cinematic vertical 9:16 viral ${videoType} content: ${prompt}` }],
    },
    config: {
      imageConfig: {
        aspectRatio: "9:16"
      }
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part?.inlineData?.data) throw new Error("Image generation failed.");
  return `data:image/png;base64,${part.inlineData.data}`;
}

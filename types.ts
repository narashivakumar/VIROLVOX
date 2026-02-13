
export type Language = 'English' | 'Hindi' | 'Telugu';
export type VideoQuality = '720p' | '1080p' | '1440p';
export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
export type ImageEngine = 'gemini' | 'imagerouter' | 'cloudflare' | 'pollinations';

export interface ViralScript {
  hook: string;
  body: string;
  cta: string;
  fullText: string;
}

export interface StoryFrame {
  id: number;
  visual: string;
  text: string;
  timing: string;
  imageUrl?: string;
}

export interface YoutubeMetadata {
  title: string;
  description: string;
  tags: string[];
}

export interface InstagramMetadata {
  caption: string;
  hashtags: string[];
}

export interface FacebookMetadata {
  caption: string;
}

export interface ViralStoryTemplate {
  frames: StoryFrame[];
  musicVibe: string;
  captionsStyle: string;
}

export interface GeneratedContent {
  script: ViralScript;
  template: ViralStoryTemplate;
  youtubeMetadata: YoutubeMetadata;
  instagramMetadata: InstagramMetadata;
  facebookMetadata: FacebookMetadata;
}

export interface GenerationState {
  isGenerating: boolean;
  isGeneratingImages: boolean;
  error: string | null;
  content: GeneratedContent | null;
  audioBlobWav: Blob | null;
  audioBlobMp3: Blob | null;
  audioUrl: string | null;
  language: Language;
}

export interface SavedScript {
  id: string;
  topic: string;
  niche: string;
  videoType: string;
  tone: string;
  language: Language;
  content: GeneratedContent;
  timestamp: number;
}

export interface CloudflareConfig {
  workerUrl: string;
  apiKey: string;
}

export interface Scene {
  id: string;
  sceneNumber: string;
  title: string;
  description: string;
  visualPrompt: string;
  imageUrl?: string;
  isGenerating?: boolean;
  error?: string;
}

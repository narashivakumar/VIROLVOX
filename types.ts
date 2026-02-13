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

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
export type Language = 'English' | 'Hindi' | 'Telugu';
export type VideoQuality = '720p' | '1080p' | '1440p';

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
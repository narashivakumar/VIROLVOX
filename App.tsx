
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Mic, 
  Download, 
  Loader2, 
  ArrowRight, 
  Clapperboard,
  Image as ImageIcon,
  Video,
  Youtube,
  Instagram,
  Facebook,
  Copy,
  FileText,
  FileCode,
  Hash,
  Monitor,
  RefreshCw,
  LayoutGrid,
  ChevronDown,
  Music
} from 'lucide-react';
import { generateViralContent, generateSpeech, generateImage } from './services/geminiService';
import { GenerationState, VoiceName, Language, VideoQuality } from './types';
import { decodeBase64, createWavBlob, createMp3Blob } from './utils/audioUtils';
import { renderStoryToVideo } from './utils/videoUtils';
import { NICHE_CATEGORIES, NicheCategory } from './constants/niches';

const VOICES: VoiceName[] = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
const STYLES = ['Motivational', 'Funny', 'Suspenseful', 'Educational', 'Controversial'];
const LANGUAGES: Language[] = ['English', 'Hindi', 'Telugu'];
const QUALITIES: VideoQuality[] = ['720p', '1080p', '1440p'];

type TabType = 'story' | 'youtube' | 'instagram' | 'facebook';

export default function App() {
  const [topic, setTopic] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NicheCategory | null>(null);
  const [selectedSubNiche, setSelectedSubNiche] = useState<string>('');
  const [style, setStyle] = useState(STYLES[0]);
  const [voice, setVoice] = useState<VoiceName>('Kore');
  const [language, setLanguage] = useState<Language>('English');
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('story');
  const [regeneratingFrames, setRegeneratingFrames] = useState<Record<number, boolean>>({});
  
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    isGeneratingImages: false,
    error: null,
    content: null,
    audioBlobWav: null,
    audioBlobMp3: null,
    audioUrl: null,
    language: 'English'
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-set topic placeholder when sub-niche changes
  useEffect(() => {
    if (selectedSubNiche) {
      setTopic(`Highly engaging content about ${selectedSubNiche}`);
    }
  }, [selectedSubNiche]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      isGeneratingImages: true, 
      error: null, 
      content: null,
      language: language 
    }));

    try {
      const content = await generateViralContent(topic, style, language, selectedSubNiche);
      setState(prev => ({ ...prev, content, isGenerating: false }));

      const audioPromise = (async () => {
        const base64Audio = await generateSpeech(content.script.fullText, voice, language);
        const binaryData = decodeBase64(base64Audio);
        const pcmData = new Int16Array(binaryData.buffer);
        const wavBlob = createWavBlob(pcmData, 24000);
        const mp3Blob = createMp3Blob(pcmData, 24000);
        return { wavBlob, mp3Blob, audioUrl: URL.createObjectURL(wavBlob) };
      })();

      const imagesPromise = Promise.all(
        content.template.frames.map(async (frame) => {
          try {
            const imageUrl = await generateImage(frame.visual, style);
            return { ...frame, imageUrl };
          } catch (err) {
            console.error(`Failed frame ${frame.id}`, err);
            return frame;
          }
        })
      );

      const [audioResult, framesWithImages] = await Promise.all([audioPromise, imagesPromise]);

      setState(prev => ({
        ...prev,
        isGeneratingImages: false,
        content: prev.content ? {
          ...prev.content,
          template: { ...prev.content.template, frames: framesWithImages }
        } : null,
        audioBlobWav: audioResult.wavBlob,
        audioBlobMp3: audioResult.mp3Blob,
        audioUrl: audioResult.audioUrl
      }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        isGeneratingImages: false,
        error: err.message || 'Something went wrong.' 
      }));
    }
  };

  const handleRegenerateImage = async (frameId: number) => {
    if (!state.content) return;
    const frame = state.content.template.frames.find(f => f.id === frameId);
    if (!frame) return;

    setRegeneratingFrames(prev => ({ ...prev, [frameId]: true }));
    try {
      const newImageUrl = await generateImage(frame.visual, style);
      setState(prev => {
        if (!prev.content) return prev;
        const newFrames = prev.content.template.frames.map(f => 
          f.id === frameId ? { ...f, imageUrl: newImageUrl } : f
        );
        return {
          ...prev,
          content: {
            ...prev.content,
            template: { ...prev.content.template, frames: newFrames }
          }
        };
      });
    } catch (err) {
      console.error("Regeneration failed", err);
      alert("Failed to regenerate this image. Please try again.");
    } finally {
      setRegeneratingFrames(prev => ({ ...prev, [frameId]: false }));
    }
  };

  const handleDownloadAudio = (format: 'wav' | 'mp3') => {
    const blob = format === 'wav' ? state.audioBlobWav : state.audioBlobMp3;
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `viralvox-audio-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownloadVideo = async () => {
    if (!state.content || !state.audioUrl) return;
    try {
      setVideoProgress(0);
      const videoBlob = await renderStoryToVideo({
        frames: state.content.template.frames,
        audioUrl: state.audioUrl,
        language: state.language,
        quality: quality,
        onProgress: (p) => setVideoProgress(Math.round(p))
      });
      const videoUrl = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `viralvox-video-${quality}-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(videoUrl);
    } catch (err) {
      console.error(err);
      alert("Video export failed.");
    } finally {
      setVideoProgress(null);
    }
  };

  const getLangClass = (lang: Language) => {
    if (lang === 'Hindi') return 'lang-hi';
    if (lang === 'Telugu') return 'lang-te';
    return '';
  };

  const MetadataField = ({ label, value, icon: Icon, filename }: { label: string, value: string, icon: any, filename: string }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Icon className="w-3 h-3" /> {label}
        </label>
        <div className="flex gap-2">
          <button onClick={() => handleCopy(value)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDownloadText(value, filename)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar">
        {value}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${getLangClass(state.language)}`}>
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-pink-500 to-violet-500 p-2 rounded-lg"><Sparkles className="w-6 h-6 text-white" /></div>
            <h1 className="text-2xl font-bold tracking-tight viral-font bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">ViralVox</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Mic className="w-5 h-5 text-pink-500" />Creator Studio</h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              
              {/* Niche Selection */}
              <div className="space-y-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <LayoutGrid className="w-3 h-3" /> Select Niche Category
                  </label>
                  <select 
                    onChange={(e) => {
                      const cat = NICHE_CATEGORIES.find(c => c.name === e.target.value);
                      setSelectedCategory(cat || null);
                      setSelectedSubNiche('');
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500/50 outline-none"
                  >
                    <option value="">Choose a category...</option>
                    {NICHE_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                {selectedCategory && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <ChevronDown className="w-3 h-3" /> Select Topic Niche
                    </label>
                    <select 
                      value={selectedSubNiche}
                      onChange={(e) => setSelectedSubNiche(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500/50 outline-none"
                    >
                      <option value="">Choose a sub-niche...</option>
                      {selectedCategory.subNiches.map(sn => <option key={sn} value={sn}>{sn}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Topic / Custom Prompt</label>
                <textarea 
                  value={topic} 
                  onChange={(e) => setTopic(e.target.value)} 
                  placeholder="E.g., Benefits of daily exercise..." 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500/50 outline-none h-24" 
                  required 
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500/50 outline-none">
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tone</label>
                  <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500/50 outline-none">
                    {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Voice</label>
                  <select value={voice} onChange={(e) => setVoice(e.target.value as VoiceName)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500/50 outline-none">
                    {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={state.isGenerating || state.isGeneratingImages || !topic.trim()} className="w-full bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all">
                {state.isGenerating || state.isGeneratingImages ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Generate Viral Kit <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
          </div>
          {state.error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{state.error}</div>}
        </section>

        <section className="lg:col-span-8 space-y-8">
          {state.content ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit overflow-x-auto">
                {[
                  { id: 'story', icon: ImageIcon, label: 'Story Preview' },
                  { id: 'youtube', icon: Youtube, label: 'YouTube Kit' },
                  { id: 'instagram', icon: Instagram, label: 'Instagram Kit' },
                  { id: 'facebook', icon: Facebook, label: 'Facebook Kit' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <tab.icon className={`w-3.5 h-3.5 ${tab.id === 'youtube' ? 'text-red-500' : tab.id === 'instagram' ? 'text-pink-500' : tab.id === 'facebook' ? 'text-blue-500' : ''}`} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'story' ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black viral-font text-white italic">Export Center</h3>
                        <p className="text-slate-400 text-sm">Download audio and high-quality video.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-700">
                           <Monitor className="w-4 h-4 text-slate-500 ml-1" />
                           <select 
                             value={quality} 
                             onChange={(e) => setQuality(e.target.value as VideoQuality)}
                             className="bg-transparent text-xs font-bold text-slate-300 outline-none pr-1"
                           >
                             {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
                           </select>
                        </div>
                        <button onClick={() => handleDownloadAudio('wav')} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-2 text-xs font-bold"><Download className="w-4 h-4" /> WAV</button>
                        <button onClick={() => handleDownloadAudio('mp3')} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-2 text-xs font-bold"><Music className="w-4 h-4" /> MP3</button>
                        <button onClick={handleDownloadVideo} disabled={videoProgress !== null} className="bg-gradient-to-r from-pink-600 to-violet-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg">
                          {videoProgress !== null ? <><Loader2 className="w-4 h-4 animate-spin" /> {videoProgress}%</> : <><Video className="w-4 h-4" /> Export MP4 ({quality})</>}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                      <h4 className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-4">Live Script</h4>
                      <p className="text-lg font-bold text-white leading-tight italic mb-4">"{state.content.script.hook}"</p>
                      <p className="text-slate-300 text-sm leading-relaxed mb-6">{state.content.script.body}</p>
                      <audio ref={audioRef} src={state.audioUrl || undefined} className="w-full h-10 accent-pink-500" controls />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {state.content.template.frames.map(f => (
                        <div key={f.id} className="aspect-[9/16] bg-slate-800 rounded-lg overflow-hidden relative group">
                          {f.imageUrl && !regeneratingFrames[f.id] ? (
                            <>
                              <img src={f.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleRegenerateImage(f.id)}
                                  className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-pink-600 transition-colors"
                                  title="Regenerate this frame"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = f.imageUrl!;
                                    a.download = `frame-${f.id}.png`;
                                    a.click();
                                  }}
                                  className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-violet-600 transition-colors"
                                  title="Download frame"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-900/80">
                              <Loader2 className="w-6 h-6 animate-spin text-pink-500 mb-2" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {regeneratingFrames[f.id] ? "Regenerating..." : "Asset Pending"}
                              </span>
                              {!f.imageUrl && !regeneratingFrames[f.id] && (
                                <button 
                                  onClick={() => handleRegenerateImage(f.id)}
                                  className="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-full text-[10px] font-bold flex items-center gap-1.5 border border-slate-700"
                                >
                                  <RefreshCw className="w-3 h-3" /> Retry
                                </button>
                              )}
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 backdrop-blur-sm text-[8px] font-medium leading-tight text-white border-t border-white/5">{f.text}</div>
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold text-white border border-white/10">{f.id}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeTab === 'youtube' ? (
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-4"><Youtube className="w-8 h-8 text-red-500" /><div><h3 className="text-xl font-bold">YouTube Studio</h3></div></div>
                  <MetadataField label="Viral Title" value={state.content.youtubeMetadata.title} icon={Sparkles} filename="youtube-title" />
                  <MetadataField label="Description" value={state.content.youtubeMetadata.description} icon={FileText} filename="youtube-desc" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><FileCode className="w-3 h-3" /> SEO Tags</label>
                      <div className="flex gap-2">
                        <button onClick={() => handleCopy(state.content!.youtubeMetadata.tags.join(', '))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDownloadText(state.content!.youtubeMetadata.tags.join(', '), 'youtube-tags')} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                      {state.content.youtubeMetadata.tags.map((t, i) => <span key={i} className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-full text-xs text-slate-400">#{t.replace(/\s+/g, '')}</span>)}
                    </div>
                  </div>
                </div>
              ) : activeTab === 'instagram' ? (
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-4"><Instagram className="w-8 h-8 text-pink-500" /><div><h3 className="text-xl font-bold">Instagram Creator</h3></div></div>
                  <MetadataField label="Reels Caption" value={state.content.instagramMetadata.caption} icon={FileText} filename="insta-caption" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Hash className="w-3 h-3" /> Trending Hashtags</label>
                      <div className="flex gap-2">
                        <button onClick={() => handleCopy(state.content!.instagramMetadata.hashtags.map(h => `#${h.replace(/\s+/g, '')}`).join(' '))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDownloadText(state.content!.instagramMetadata.hashtags.map(h => `#${h.replace(/\s+/g, '')}`).join(' '), 'insta-hashtags')} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-pink-400 font-mono text-xs">
                      {state.content.instagramMetadata.hashtags.map(h => `#${h.replace(/\s+/g, '')}`).join(' ')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-4"><Facebook className="w-8 h-8 text-blue-500" /><div><h3 className="text-xl font-bold">Facebook Business</h3></div></div>
                  <MetadataField label="Post Caption" value={state.content.facebookMetadata.caption} icon={FileText} filename="fb-caption" />
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl">
              <Sparkles className="w-12 h-12 text-slate-700 mb-6" />
              <h3 className="text-xl font-bold text-slate-400 mb-2">Ready to go viral?</h3>
              <p className="text-slate-500 max-w-sm text-sm">Select a niche from the categories or enter a custom topic to generate your full Social Media Kit.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8 bg-slate-900/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-xs">
          © 2024 ViralVox AI • Multi-Platform Creator Suite
        </div>
      </footer>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: #020617; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}</style>
    </div>
  );
}

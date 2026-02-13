
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Download, 
  Loader2, 
  ArrowRight, 
  Image as ImageIcon,
  Video,
  Youtube,
  Instagram,
  Facebook,
  Mic,
  Music,
  Trash2,
  Settings,
  Globe,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { 
  generateViralContent, 
  generateSpeech, 
  generateImageGemini,
  generateImageImageRouter,
  generateImageCloudflare,
  generateImagePollinations
} from './services/geminiService';
import { 
  GenerationState, 
  VoiceName, 
  Language, 
  VideoQuality, 
  SavedScript, 
  StoryFrame,
  ImageEngine,
  CloudflareConfig
} from './types';
import { decodeBase64, createWavBlob, createMp3Blob } from './utils/audioUtils';
import { renderStoryToVideo } from './utils/videoUtils';
import { NICHE_CATEGORIES, NicheCategory } from './constants/niches';

const VOICES: VoiceName[] = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
const LANGUAGES: Language[] = ['English', 'Hindi', 'Telugu'];
const QUALITIES: VideoQuality[] = ['720p', '1080p'];
const VIDEO_TYPES = ['Storytelling', 'Devotional', 'Horror', 'Children', 'Educational', 'Finance'];

export default function App() {
  const [topic, setTopic] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NicheCategory | null>(null);
  const [selectedSubNiche, setSelectedSubNiche] = useState<string>('');
  const [videoType, setVideoType] = useState(VIDEO_TYPES[0]);
  const [voice, setVoice] = useState<VoiceName>('Kore');
  const [language, setLanguage] = useState<Language>('English');
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [activeTab, setActiveTab] = useState<'story' | 'youtube' | 'instagram' | 'facebook' | 'vault'>('story');
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [frameStatuses, setFrameStatuses] = useState<Record<number, 'loading' | 'ready' | 'error'>>({});
  
  // Settings for external keys
  const [showSettings, setShowSettings] = useState(false);
  const [imageEngine, setImageEngine] = useState<ImageEngine>('gemini');
  const [imageRouterKey, setImageRouterKey] = useState('');
  const [cfConfig, setCfConfig] = useState<CloudflareConfig>({ workerUrl: '', apiKey: '' });

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

  useEffect(() => {
    const stored = localStorage.getItem('viralvox_scripts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSavedScripts(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('viralvox_scripts', JSON.stringify(savedScripts));
  }, [savedScripts]);

  const handleGenerateImage = async (prompt: string, type: string) => {
    switch (imageEngine) {
      case 'imagerouter': return await generateImageImageRouter(prompt, imageRouterKey);
      case 'cloudflare': return await generateImageCloudflare(prompt, cfConfig);
      case 'pollinations': return await generateImagePollinations(prompt);
      default: return await generateImageGemini(prompt, type);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setState(prev => ({ 
      ...prev, isGenerating: true, isGeneratingImages: true, error: null, content: null, audioUrl: null, audioBlobWav: null, audioBlobMp3: null, language 
    }));
    setFrameStatuses({});

    try {
      const content = await generateViralContent(topic, videoType, 'Viral', language, selectedSubNiche);
      setState(prev => ({ ...prev, content, isGenerating: false }));
      setActiveTab('story');

      // 1. Generate Audio concurrently
      const audioPromise = (async () => {
        try {
          const base64Audio = await generateSpeech(content.script.fullText, voice, 'Storyteller', language);
          const binaryData = decodeBase64(base64Audio);
          const pcmData = new Int16Array(binaryData.buffer, 0, binaryData.byteLength / 2);
          
          const wavBlob = createWavBlob(pcmData, 24000);
          const mp3Blob = createMp3Blob(pcmData, 24000);
          const audioUrl = URL.createObjectURL(wavBlob);
          
          setState(prev => ({ ...prev, audioBlobWav: wavBlob, audioBlobMp3: mp3Blob, audioUrl }));
        } catch (err) {
          console.error("Audio generation failed", err);
        }
      })();

      // 2. Generate Images Frame by Frame
      const framesWithImages: StoryFrame[] = [];
      for (const frame of content.template.frames) {
        setFrameStatuses(prev => ({ ...prev, [frame.id]: 'loading' }));
        try {
          const imageUrl = await handleGenerateImage(frame.visual, videoType);
          setState(prev => {
            if (!prev.content) return prev;
            const updatedFrames = prev.content.template.frames.map(f => f.id === frame.id ? { ...f, imageUrl } : f);
            return { ...prev, content: { ...prev.content, template: { ...prev.content.template, frames: updatedFrames } } };
          });
          setFrameStatuses(prev => ({ ...prev, [frame.id]: 'ready' }));
          framesWithImages.push({ ...frame, imageUrl });
        } catch (err) {
          setFrameStatuses(prev => ({ ...prev, [frame.id]: 'error' }));
          framesWithImages.push(frame);
        }
      }

      await audioPromise;

      const newSaved: SavedScript = {
        id: Date.now().toString(),
        topic,
        niche: selectedSubNiche || 'General',
        videoType,
        tone: 'Viral',
        language,
        content: { ...content, template: { ...content.template, frames: framesWithImages } },
        timestamp: Date.now()
      };
      setSavedScripts(prev => [newSaved, ...prev]);
      setState(prev => ({ ...prev, isGeneratingImages: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isGenerating: false, isGeneratingImages: false, error: err.message || 'Generation failed.' }));
    }
  };

  const handleDownloadVideo = async () => {
    if (!state.content || !state.audioUrl) return;
    setVideoProgress(0);
    try {
      const videoBlob = await renderStoryToVideo({
        frames: state.content.template.frames,
        audioUrl: state.audioUrl,
        language: state.language,
        quality: quality,
        onProgress: (p) => setVideoProgress(Math.round(p)),
      });
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `viralvox-${quality}-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed.");
    } finally {
      setVideoProgress(null);
    }
  };

  const handleDownloadAudio = (format: 'wav' | 'mp3') => {
    const blob = format === 'wav' ? state.audioBlobWav : state.audioBlobMp3;
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `viralvox-audio-${language}-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleLoadSaved = (saved: SavedScript) => {
    setState(prev => ({
      ...prev,
      content: saved.content,
      language: saved.language,
      error: null,
      audioUrl: null,
      audioBlobWav: null,
      audioBlobMp3: null
    }));
    setTopic(saved.topic);
    setVideoType(saved.videoType);
    setLanguage(saved.language);
    setActiveTab('story');
    const statuses: Record<number, 'ready'> = {};
    saved.content.template.frames.forEach(f => statuses[f.id] = 'ready');
    setFrameStatuses(statuses);
  };

  const getLangClass = (lang: Language) => {
    if (lang === 'Hindi') return 'lang-hi';
    if (lang === 'Telugu') return 'lang-te';
    return '';
  };

  return (
    <div className={`min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans ${getLangClass(state.language)}`}>
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight viral-font">ViralVox</h1>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
               <Settings className="w-5 h-5" />
             </button>
             <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Engine Connected
            </div>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="bg-slate-900 border-b border-slate-800 p-6 animate-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Image Engine</label>
              <select value={imageEngine} onChange={(e) => setImageEngine(e.target.value as ImageEngine)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm outline-none">
                <option value="gemini">Gemini 2.5 (Free Model)</option>
                <option value="imagerouter">ImageRouter API</option>
                <option value="cloudflare">Cloudflare Worker</option>
                <option value="pollinations">Pollinations (Free)</option>
              </select>
            </div>
            {imageEngine === 'imagerouter' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">ImageRouter Key</label>
                <input type="password" value={imageRouterKey} onChange={(e) => setImageRouterKey(e.target.value)} placeholder="Enter API Key" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm outline-none" />
              </div>
            )}
            {imageEngine === 'cloudflare' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Worker Config</label>
                <input type="text" value={cfConfig.workerUrl} onChange={(e) => setCfConfig({...cfConfig, workerUrl: e.target.value})} placeholder="URL" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm outline-none mb-2" />
                <input type="password" value={cfConfig.apiKey} onChange={(e) => setCfConfig({...cfConfig, apiKey: e.target.value})} placeholder="API Key" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm outline-none" />
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Controls */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-sm font-bold mb-6 flex items-center gap-2 text-indigo-400 uppercase tracking-widest">Creator Studio</h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-3">
                <select 
                  onChange={(e) => setSelectedCategory(NICHE_CATEGORIES.find(c => c.name === e.target.value) || null)} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-indigo-500/50"
                >
                  <option value="">Select Category</option>
                  {NICHE_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                {selectedCategory && (
                  <select 
                    value={selectedSubNiche} 
                    onChange={(e) => setSelectedSubNiche(e.target.value)} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none mt-2 animate-in fade-in"
                  >
                    <option value="">Select Sub-niche</option>
                    {selectedCategory.subNiches.map(sn => <option key={sn} value={sn}>{sn}</option>)}
                  </select>
                )}
              </div>

              <textarea 
                disabled={state.isGenerating} 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)} 
                placeholder="Story idea or video prompt..." 
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none h-32 focus:ring-2 ring-indigo-500/50 resize-none" 
                required 
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2 text-xs outline-none">
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Speaker</label>
                  <select value={voice} onChange={(e) => setVoice(e.target.value as VoiceName)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2 text-xs outline-none">
                    {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Video Style</label>
                <select value={videoType} onChange={(e) => setVideoType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2 text-xs outline-none">
                  {VIDEO_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                </select>
              </div>

              <button 
                type="submit" 
                disabled={state.isGenerating || !topic.trim()} 
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]"
              >
                {state.isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Generate Viral Kit <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
          </div>
          {state.error && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-xs">{state.error}</div>}
        </aside>

        {/* Content Area */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit shadow-xl">
            {['story', 'youtube', 'instagram', 'facebook', 'vault'].map(id => (
              <button 
                key={id} 
                onClick={() => setActiveTab(id as any)} 
                className={`px-5 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest ${activeTab === id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {id}
              </button>
            ))}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {activeTab === 'vault' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedScripts.length === 0 && <p className="text-slate-500 text-center col-span-2 py-24">No saved kits yet.</p>}
                {savedScripts.map(s => (
                  <div key={s.id} onClick={() => handleLoadSaved(s)} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] cursor-pointer hover:border-indigo-500 group transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full uppercase">{s.language}</span>
                      <button onClick={(e) => { e.stopPropagation(); setSavedScripts(prev => prev.filter(x => x.id !== s.id)); }} className="text-slate-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100 truncate">{s.topic}</h4>
                    <p className="text-[10px] text-slate-500">{new Date(s.timestamp).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : state.content ? (
              <div className="space-y-6">
                {activeTab === 'story' && (
                  <div className="space-y-8">
                    {/* Header Controls */}
                    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2.5rem] p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xl">
                      <div className="text-center lg:text-left">
                        <h3 className="text-2xl font-black italic tracking-tight mb-1">EXPORT CENTER</h3>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest flex items-center justify-center lg:justify-start gap-2">
                           <Globe className="w-3 h-3" /> {state.language} Content
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                          <select value={quality} onChange={(e) => setQuality(e.target.value as VideoQuality)} className="bg-transparent text-[10px] font-bold px-4 py-2 outline-none">
                            {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleDownloadAudio('wav')} disabled={!state.audioBlobWav} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-2xl text-[10px] font-bold flex items-center gap-2 border border-slate-700 transition-colors">
                            <Download className="w-4 h-4" /> WAV
                          </button>
                          <button onClick={() => handleDownloadAudio('mp3')} disabled={!state.audioBlobMp3} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-2xl text-[10px] font-bold flex items-center gap-2 border border-slate-700 transition-colors">
                            <Music className="w-4 h-4" /> MP3
                          </button>
                        </div>
                        <button onClick={handleDownloadVideo} disabled={videoProgress !== null} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl text-[10px] font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
                          {videoProgress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />} {videoProgress !== null ? `${videoProgress}%` : 'EXPORT VIDEO'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] space-y-6 shadow-xl h-fit">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Mic className="w-4 h-4" /> Script Preview</h4>
                        <p className="text-xl font-black text-white italic leading-tight">"{state.content.script.hook}"</p>
                        <p className="text-sm text-slate-400 leading-relaxed">{state.content.script.body}</p>
                        {state.audioUrl && (
                          <div className="pt-4 border-t border-slate-800">
                            <audio controls src={state.audioUrl} className="w-full h-10 rounded-xl accent-indigo-500" />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {state.content.template.frames.map(f => (
                          <div key={f.id} className="aspect-[9/16] bg-slate-950 rounded-[2rem] overflow-hidden relative border border-slate-800 shadow-xl group">
                            {frameStatuses[f.id] === 'loading' ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Painting...</span>
                              </div>
                            ) : f.imageUrl ? (
                              <>
                                <img src={f.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-[2s]" alt={f.visual} />
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleGenerateImage(f.visual, videoType)} className="p-2 bg-black/60 backdrop-blur-md rounded-xl text-white hover:bg-indigo-600 transition-colors shadow-lg">
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-center h-full text-slate-700">
                                <ImageIcon className="w-8 h-8 opacity-10" />
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/40 to-transparent">
                               <p className="text-[9px] font-bold text-white leading-tight drop-shadow-lg line-clamp-3">{f.text}</p>
                            </div>
                            <div className="absolute top-4 left-4 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg">{f.id}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'youtube' && (
                  <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] space-y-8 shadow-2xl">
                    <div className="flex items-center gap-4"><Youtube className="w-8 h-8 text-red-500" /><h3 className="text-2xl font-black italic">YouTube Shorts Kit</h3></div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Catchy Title</label>
                      <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-lg font-bold text-white">{state.content.youtubeMetadata.title}</div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {state.content.youtubeMetadata.tags.map(t => <span key={t} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-indigo-400">#{t.replace(/\s+/g, '')}</span>)}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'instagram' && (
                  <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] space-y-8 shadow-2xl">
                    <div className="flex items-center gap-4"><Instagram className="w-8 h-8 text-pink-500" /><h3 className="text-2xl font-black italic">Instagram Reels Kit</h3></div>
                    <div className="p-8 bg-slate-950 border border-slate-800 rounded-[2rem] text-sm leading-relaxed whitespace-pre-wrap text-slate-300 italic">
                      {state.content.instagramMetadata.caption}
                      <div className="mt-6 flex flex-wrap gap-2 text-indigo-400 font-mono text-xs">
                        {state.content.instagramMetadata.hashtags.map(h => <span key={h}>#{h.replace(/\s+/g, '')}</span>)}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'facebook' && (
                  <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] space-y-8 shadow-2xl">
                    <div className="flex items-center gap-4"><Facebook className="w-8 h-8 text-blue-500" /><h3 className="text-2xl font-black italic">Facebook Post Kit</h3></div>
                    <div className="p-8 bg-slate-950 border border-slate-800 rounded-[2rem] text-sm leading-relaxed text-slate-300 italic">
                      {state.content.facebookMetadata.caption}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-center p-12 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[3.5rem] shadow-inner">
                <Sparkles className="w-12 h-12 text-slate-800 mb-8" />
                <h3 className="text-2xl font-black text-slate-400 mb-2 italic tracking-tight">AI CREATOR READY</h3>
                <p className="text-slate-600 text-sm max-w-sm">Select your niche and topic to synthesize a complete viral content kit using the world's most advanced Gemini models.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <footer className="border-t border-slate-800 py-10 mt-auto bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">ViralVox Synthesizer Engine v3.0</p>
          <div className="flex flex-wrap justify-center gap-8 items-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div> Engine Active</span>
            <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-indigo-500" /> Multilingual Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

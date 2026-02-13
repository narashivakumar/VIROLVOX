
import React from 'react';
import { Scene } from '../types';
import Button from './Button';

interface SceneCardProps {
  scene: Scene;
  onGenerate: (id: string) => void;
  onEdit: (scene: Scene) => void;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, onGenerate, onEdit }) => {
  const downloadImage = () => {
    if (!scene.imageUrl) return;
    const link = document.createElement('a');
    link.href = scene.imageUrl;
    link.download = `Scene-${scene.sceneNumber}-${scene.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-full group">
      <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
        {scene.imageUrl ? (
          <>
            <img 
              src={scene.imageUrl} 
              alt={scene.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="secondary" 
                className="p-2 !rounded-full bg-slate-900/80 backdrop-blur-sm"
                onClick={downloadImage}
                title="Download Image"
              >
                <i className="fas fa-download"></i>
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center p-6">
            {scene.isGenerating ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 text-sm animate-pulse">Creating visual...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <i className="fas fa-image text-slate-600 text-4xl mb-2"></i>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => onGenerate(scene.id)}
                >
                  Generate Scene
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            {scene.sceneNumber}
          </span>
          <button 
            onClick={() => onEdit(scene)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <i className="fas fa-pen-to-square"></i>
          </button>
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-2 line-clamp-1">{scene.title}</h3>
        <p className="text-slate-400 text-sm line-clamp-3 mb-4 flex-1 italic">
          "{scene.description}"
        </p>
        
        <div className="mt-auto">
          <div className="bg-slate-900/50 rounded p-3 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Visual Prompt</p>
            <p className="text-xs text-slate-300 line-clamp-2">{scene.visualPrompt}</p>
          </div>
        </div>
      </div>
      
      {scene.error && (
        <div className="bg-rose-500/20 text-rose-400 text-[10px] p-2 text-center border-t border-rose-500/30">
          <i className="fas fa-exclamation-triangle mr-1"></i> {scene.error}
        </div>
      )}
    </div>
  );
};

export default SceneCard;

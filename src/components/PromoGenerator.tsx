import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Video, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface PromoGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  fighterName: string;
}

export function PromoGenerator({ isOpen, onClose, fighterName }: PromoGeneratorProps) {
  const [prompt, setPrompt] = useState(`A cinematic promotional video of an MMA fighter named ${fighterName || 'The Contender'} training intensely in a dark, gritty gym. Neon lights.`);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('');

  const generateVideo = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setVideoUri(null);
      setVideoBlobUrl(null);
      setProgressStatus('Checking access...');

      // Follow the AI Studio window pattern for API key
      const win = window as unknown as { handleAIVideoRequest?: (param: string) => Promise<string> };
      if (win.aistudio && win.aistudio.hasSelectedApiKey) {
        if (!(await win.aistudio.hasSelectedApiKey())) {
          await win.aistudio.openSelectKey();
        }
      } else {
        // Fallback for missing api key dialog in dev
        console.warn("window.aistudio not available, relying on process.env.API_KEY");
      }

      // The key is injected to process.env.API_KEY or we can just pass empty config and let SDK pick it up
      // In the preview environment, the SDK might just use process.env.API_KEY behind the scenes 
      // or we have to pass process.env.API_KEY manually. Oh, wait, the instructions say:
      // "The selected API key is available using process.env.API_KEY. It is injected automatically, so you do not need to modify the API key code."
      // BUT, for Vite, process.env doesn't work directly on client unless we use `process.env` from Vite or `import.meta.env`. 
      // Wait, "The selected API key is available using process.env.API_KEY. It is injected automatically, so you do not need to modify the API key code."
      // In standard Vite, it's import.meta.env, but AI Studio polyfills process.env.API_KEY for this specific use case.
      
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
         throw new Error("Missing API Key. Please configure your Gemini API Key.");
      }

      const ai = new GoogleGenAI({ apiKey });

      setProgressStatus('Initiating Veo generation...');
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      console.log('Video Generation started. Operation: ', operation.name);

      while (!operation.done) {
        setProgressStatus('Rendering frames (this may take a few minutes)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      setProgressStatus('Finalizing video generation...');
      console.log('Video Generation complete. Operation: ', operation);

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (!downloadLink) {
        throw new Error("Failed to retrieve generated video URI from response.");
      }

      setVideoBlobUrl(downloadLink);
      setProgressStatus('Downloading generation...');

      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (!response.ok) {
         throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setVideoBlobUrl(objectUrl);
      setProgressStatus('');

    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Video generation error:', errorMsg);
      // specific catch for 'entity was not found' -> reset key
      if (errorMsg.includes('Requested entity was not found')) {
        setError('Google Cloud API Error: Ensure you have an active GCP project with Vertex AI/Gemini billing enabled. You may need to re-select your key.');
      } else {
        setError(errorMsg || "An unexpected error occurred during video generation.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 relative overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-black rounded-full hover:bg-zinc-800 transition border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-8 pr-12">
              <h2 className="text-2xl font-black uppercase text-white flex items-center gap-3 italic tracking-tighter">
                <Video className="w-6 h-6 text-[#E31837]" />
                Veo Promo Generator
              </h2>
              <p className="text-zinc-400 text-sm mt-2 font-bold uppercase tracking-widest text-[10px]">Generate cinematic fight promos with Google's premier video model</p>
            </div>

            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Cinematic Direction</label>
                 <textarea 
                   value={prompt}
                   onChange={e => setPrompt(e.target.value)}
                   disabled={isGenerating}
                   className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all resize-none h-32 leading-relaxed disabled:opacity-50"
                 />
               </div>

               {error && (
                 <div className="px-4 py-3 bg-red-950/40 border border-[#E31837]/50 text-[#E31837] text-[10px] uppercase font-black tracking-widest rounded-xl shadow-xl">
                   {error}
                 </div>
               )}

               {!videoBlobUrl && (
                 <button 
                   onClick={generateVideo}
                   disabled={isGenerating || !prompt.trim()}
                   className="w-full flex items-center justify-center gap-3 bg-white text-black font-black uppercase italic tracking-tighter text-sm px-10 py-5 rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                 >
                   {isGenerating ? (
                     <>
                       <Loader2 className="w-5 h-5 animate-spin text-[#E31837]" />
                       Generator Active
                     </>
                   ) : (
                     <>
                       <Video className="w-5 h-5 group-hover:scale-110 transition-transform text-[#E31837]" />
                       Ignite Synthesis
                     </>
                   )}
                 </button>
               )}

               {isGenerating && (
                 <div className="text-center font-bold text-zinc-500 uppercase tracking-widest text-[10px] animate-pulse">
                   {progressStatus}
                 </div>
               )}

               {videoBlobUrl && (
                 <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-white/10 relative shadow-2xl">
                       <video 
                         src={videoBlobUrl} 
                         controls 
                         autoPlay 
                         loop 
                         className="w-full h-full object-cover"
                       />
                       <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                           Veo Generated
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <button 
                         onClick={() => setVideoBlobUrl(null)}
                         className="flex-1 bg-zinc-900 border border-white/10 text-white font-bold uppercase tracking-widest text-[10px] py-4 rounded-xl hover:bg-zinc-800 transition"
                       >
                         Generate Another
                       </button>
                       <a 
                         href={videoBlobUrl}
                         download={`${fighterName.replace(/\s+/g, '_')}_promo.mp4`}
                         className="flex-1 text-center bg-[#E31837] text-white font-bold uppercase tracking-widest text-[10px] py-4 rounded-xl hover:bg-red-700 transition shadow-xl shadow-red-900/20"
                       >
                         Download MP4
                       </a>
                    </div>
                 </div>
               )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState, useCallback } from "react";
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useConnectionState,
  useDataChannel,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";

interface ToolUpdate {
  id?: string;
  type: string;
  tool: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

interface SummaryData {
  summary?: string;
  actions?: string[];
}

interface VoiceAgentProps {
  token: string;
  serverUrl: string;
  onDisconnect: () => void;
}

function AvatarDisplay() {
  const { state, audioTrack } = useVoiceAssistant();
  const videoTracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const avatarTrack = videoTracks.find(
    (track) => track.participant?.isAgent || track.participant?.identity?.includes("agent")
  );

  return (
    <div className="flex flex-col items-center justify-center gap-10">
      <div className="relative group">
        {/* Background Blob */}
        <div className={`absolute inset-0 bg-accent rounded-[3rem] rotate-6 scale-110 opacity-20 blur-xl transition-all duration-700 ${state === 'speaking' ? 'scale-125 opacity-40 rotate-12' : ''}`} />
        
        {/* Main Frame */}
        <div className={`
            relative w-[320px] h-[320px] bg-white border-2 border-border rounded-[2.5rem] shadow-sketch overflow-hidden transition-all duration-500
            ${state === 'speaking' ? 'shadow-sketch-hover -translate-y-2' : ''}
        `}>
            
            {avatarTrack ? (
              <VideoTrack trackRef={avatarTrack} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-surface relative overflow-hidden">
                {/* Noise overlay inside avatar */}
                <div className="absolute inset-0 bg-noise opacity-30 mix-blend-multiply pointer-events-none" />
                
                <div className={`
                    w-40 h-40 bg-foreground rounded-full flex items-center justify-center relative transition-all duration-300
                    ${state === 'speaking' ? 'scale-110' : 'scale-100'}
                `}>
                    {state === 'speaking' && (
                       <div className="absolute inset-0 border-2 border-dashed border-white/30 rounded-full animate-spin-slow" />
                    )}
                    
                    <span className="text-6xl animate-wiggle">
                      {state === 'listening' ? '👂' : 
                       state === 'thinking' ? '🧠' : 
                       state === 'speaking' ? '🗣️' : '💤'}
                    </span>
                </div>
              </div>
            )}
            
            {/* Status Badge */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white/90 backdrop-blur border-2 border-border rounded-full shadow-sm">
               <span className="text-sm font-bold uppercase tracking-wider text-foreground">
                 {state}
               </span>
            </div>
        </div>
      </div>

      {/* Visualizer */}
      {audioTrack && (
        <div className="h-24 w-64 bg-surface border-2 border-border rounded-2xl p-4 shadow-sketch-sm flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none" />
          <BarVisualizer
            state={state}
            barCount={6}
            trackRef={audioTrack}
            className="h-full w-full gap-2 [&>div]:bg-foreground [&>div]:rounded-full [&>div]:w-3"
          />
        </div>
      )}
    </div>
  );
}

function ToolCallsDisplay() {
  const [toolCalls, setToolCalls] = useState<ToolUpdate[]>([]);
  const [callSummary, setCallSummary] = useState<{summary: string, actions: string[]} | null>(null);

  const onDataReceived = useCallback((msg: { payload: Uint8Array }) => {
    try {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(msg.payload)) as ToolUpdate;
      
      if (!data.id) {
        data.id = data.timestamp || Date.now().toString() + Math.random();
      }

      if (data.type === "TOOL_UPDATE") {
        if (data.tool === "end_conversation" && data.data) {
          const summaryData = data.data as unknown as SummaryData;
          setCallSummary({
            summary: summaryData.summary || "",
            actions: summaryData.actions || [],
          });
        }
        
        setToolCalls((prev) => {
          // Deduplicate: Don't add if same tool & data exists in any recent entry
          const isDuplicate = prev.some(
            (existing) => existing.tool === data.tool && JSON.stringify(existing.data) === JSON.stringify(data.data)
          );
          if (isDuplicate) {
            return prev;
          }
          return [...prev.slice(-4), data];
        });
      }
    } catch (e) {
      console.error("Failed to parse message", e);
    }
  }, []);

  useDataChannel("ui_state", onDataReceived);

  if (callSummary) {
    return (
      <div className="w-full max-w-sm card-trendy bg-[#F0FDF4] border-success">
        <h3 className="text-xl mb-4 flex items-center gap-2 font-serif text-foreground">
          <span>✨</span> All Done!
        </h3>
        <div className="space-y-3 mb-6">
           {callSummary.actions.map((action, i) => (
             <div key={i} className="flex gap-3 items-start p-3 bg-white/50 rounded-xl border border-success/30 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="text-success text-lg">✓</span>
                <span className="font-medium text-foreground">{action}</span>
             </div>
           ))}
        </div>
        <p className="text-sm text-muted font-medium italic border-t border-success/20 pt-4">
          &quot;{callSummary.summary}&quot;
        </p>
      </div>
    );
  }

  if (toolCalls.length === 0) return (
     <div className="w-full max-w-sm h-64 border-2 border-dashed border-border/30 rounded-3xl flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none" />
        <p className="text-muted font-medium">Waiting for action...</p>
     </div>
  );

  return (
    <div className="w-full max-w-sm relative pl-8">
      {/* Timeline Line */}
      <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-border/20" />

      <div className="space-y-6">
        {toolCalls.map((call, index) => (
          <div
            key={index}
            className="relative animate-fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Timeline Dot */}
            <div className={`
              absolute -left-8 top-6 w-6 h-6 rounded-full border-2 border-border flex items-center justify-center z-10 bg-background
              ${index === toolCalls.length - 1 ? 'animate-pulse ring-4 ring-accent/20' : ''}
            `}>
              <div className={`w-2 h-2 rounded-full ${index === toolCalls.length - 1 ? 'bg-accent' : 'bg-muted'}`} />
            </div>

            {/* Card */}
            <div className={`
              card-trendy !p-4 transition-all duration-500
              ${index === toolCalls.length - 1 ? 'border-accent shadow-sketch scale-100' : 'border-border/50 opacity-80 scale-95'}
            `}>
              <div className="flex items-center gap-4">
                <div className={`
                  w-10 h-10 rounded-xl border-2 border-border flex items-center justify-center shadow-sm transition-colors
                  ${index === toolCalls.length - 1 ? 'bg-accent' : 'bg-surface-alt'}
                `}>
                   <span className="text-lg">
                     {call.tool.includes('book') ? '📅' : 
                      call.tool.includes('user') ? '👤' : 
                      call.tool.includes('cancel') ? '❌' : 
                      call.tool.includes('fetch') ? '🔍' : '⚡'}
                   </span>
                </div>
                <div className="flex-1 min-w-0">
                   <p className="font-bold text-foreground text-base capitalize flex items-center gap-2">
                     {call.tool.replace(/_/g, ' ')}
                     {index === toolCalls.length - 1 && (
                       <span className="flex h-2 w-2 relative">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                       </span>
                     )}
                   </p>
                   {call.data && (
                     <p className="text-xs font-mono text-muted bg-surface-alt/50 px-2 py-1 rounded border border-border/10 mt-1 inline-block truncate max-w-full">
                        {Object.entries(call.data).map(([, v]) => `${v}`).join(', ')}
                     </p>
                   )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomContent({ onDisconnect }: { onDisconnect: () => void }) {
  const connectionState = useConnectionState();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col font-sans">
      <div className="fixed inset-0 bg-noise opacity-40 pointer-events-none z-50 mix-blend-multiply" />
      
      {/* Header */}
      <header className="relative z-10 w-full p-6 flex justify-between items-center border-b-2 border-border/10 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center rounded border border-transparent">
            <span className="font-serif font-bold">K</span>
          </div>
          <span className="font-serif text-xl font-bold text-foreground">Kairos Live</span>
        </div>

        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full border border-border text-xs font-bold flex items-center gap-2 ${connectionState === 'connected' ? 'bg-success/20 text-foreground' : 'bg-surface-alt'}`}>
             <div className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-success animate-pulse' : 'bg-muted'}`} />
             {connectionState.toUpperCase()}
          </div>
          
          <button onClick={onDisconnect} className="px-4 py-2 bg-error text-white font-bold rounded-lg border-2 border-border shadow-sketch-sm hover:translate-y-0.5 hover:shadow-none transition-all active:translate-y-1">
            End Call
          </button>
        </div>
      </header>

      {/* Main Stage */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-20 p-8 relative z-10">
        <AvatarDisplay />
        <ToolCallsDisplay />
      </main>

      <div className="hidden">
         <VoiceAssistantControlBar controls={{ leave: false }} />
         <RoomAudioRenderer />
      </div>
    </div>
  );
}

export default function VoiceAgent(props: VoiceAgentProps) {
  return (
    <LiveKitRoom
      token={props.token}
      serverUrl={props.serverUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={props.onDisconnect}
    >
      <RoomContent onDisconnect={props.onDisconnect} />
    </LiveKitRoom>
  );
}

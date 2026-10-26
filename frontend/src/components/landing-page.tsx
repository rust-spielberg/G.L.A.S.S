import { WebGLShader } from "./ui/web-gl-shader"
import { LiquidButton } from "./ui/liquid-button"

interface LandingPageProps {
  onStart: () => void
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black flex items-center justify-center">
      {/* Background WebGL Shader */}
      <WebGLShader />

      {/* Centered Glass Card Overlay */}
      <div className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl border border-white/10 bg-black/40 p-2 backdrop-blur-xl shadow-2xl">
        <main className="rounded-xl border border-white/10 py-10 px-8 text-center bg-black/20">
          
          {/* Title */}
          <h1 className="text-white text-6xl md:text-7xl font-extrabold tracking-tighter mb-2">
            G.L.A.S.S.
          </h1>

          {/* Subtitle / Acronym */}
          <p className="text-white/70 text-sm md:text-base font-medium max-w-md mx-auto mb-6">
            Guided Language Agent for Software Synthesis
          </p>

          {/* Status Indicator */}
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <span className="text-xs text-green-400 font-mono font-medium">Available for New Tasks</span>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <LiquidButton 
              className="text-white border border-white/20 rounded-full cursor-pointer px-8 py-3" 
              onClick={onStart}
              size="xl"
            >
              Let's Go
            </LiquidButton>
          </div>

        </main>
      </div>
    </div>
  )
}
  
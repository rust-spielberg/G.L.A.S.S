import React, { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowUp } from "lucide-react";

interface MorphOrbProps {
  onSubmit?: (prompt: string) => Promise<any> | void;
  minThinkMs?: number;
  placeholder?: string;
}

export default function MorphOrb({
  onSubmit,
  minThinkMs = 3500,
  placeholder = "Describe what software, API endpoint, or script you want G.L.A.S.S. to build...",
}: MorphOrbProps) {
  const [promptText, setPromptText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 60 FPS 3D Particle Sphere Renderer (Enlarged viewport)
  useEffect(() => {
    if (!isThinking) return;

    const mountTimer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let animationFrameId: number;
      const numParticles = 900;
      const particles: Array<{ baseR: number; phi: number; theta: number }> = [];

      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      for (let i = 0; i < numParticles; i++) {
        const theta = (2 * Math.PI * i) / goldenRatio;
        const phi = Math.acos(1 - (2 * (i + 0.5)) / numParticles);
        particles.push({ baseR: 145, phi, theta }); // Increased sphere radius
      }

      let rotX = 0;
      let rotY = 0;
      let waveTime = 0;

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;
        const fov = 350;

        rotX += 0.008;
        rotY += 0.016;
        waveTime += 0.05;

        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);

        const projected = particles.map((p) => {
          const dynamicR = p.baseR + Math.sin(p.phi * 4 + waveTime) * 10 + Math.cos(p.theta * 4 + waveTime) * 6;

          const x = dynamicR * Math.sin(p.phi) * Math.cos(p.theta);
          const y = dynamicR * Math.sin(p.phi) * Math.sin(p.theta);
          const z = dynamicR * Math.cos(p.phi);

          const rx1 = x * cosY + z * sinY;
          const ry1 = y;
          const rz1 = -x * sinY + z * cosY;

          const rx2 = rx1;
          const ry2 = ry1 * cosX - rz1 * sinX;
          const rz2 = ry1 * sinX + rz1 * cosX;

          const scale = fov / (fov + rz2 + 220);
          const projX = cx + rx2 * scale;
          const projY = cy + ry2 * scale;
          const alpha = Math.max(0.2, Math.min(1.0, (rz2 + 200) / 350));
          const size = Math.max(1.0, 2.8 * scale);

          return { x: projX, y: projY, z: rz2, alpha, size };
        });

        projected.sort((a, b) => a.z - b.z);

        projected.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(216, 180, 254, ${p.alpha})`;
          ctx.fill();
        });

        animationFrameId = requestAnimationFrame(render);
      };

      render();

      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
    }, 50);

    return () => clearTimeout(mountTimer);
  }, [isThinking]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptText.trim() || isThinking) return;

    const submittedText = promptText;
    setIsThinking(true);
    const startTime = Date.now();

    try {
      if (onSubmit) {
        await onSubmit(submittedText);
      }
    } catch (err) {
      console.error("Agent dispatch error:", err);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minThinkMs - elapsed);

      setTimeout(() => {
        setIsThinking(false);
        setPromptText("");
      }, remaining);
    }
  };

  if (isThinking) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-6">
        <canvas
          ref={canvasRef}
          width={460}
          height={460}
          className="h-[440px] w-[440px] object-contain"
        />
        <p className="text-sm font-mono tracking-[0.35em] text-purple-300/90 uppercase animate-pulse">
          Synthesizing Architecture...
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-3xl items-center justify-center py-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full items-center gap-4 rounded-2xl border border-white/20 bg-black/80 px-6 py-4 shadow-[0_0_50px_rgba(168,85,247,0.15)] backdrop-blur-2xl transition-all duration-300 focus-within:border-purple-500/50 focus-within:shadow-[0_0_60px_rgba(168,85,247,0.25)]"
      >
        <Sparkles className="h-6 w-6 text-purple-400 flex-shrink-0" />
        <input
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-base text-white placeholder-white/35 outline-none font-mono"
        />
        <button
          type="submit"
          disabled={!promptText.trim()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-black transition hover:bg-purple-200 disabled:opacity-30 cursor-pointer shadow-lg"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  GitBranch, 
  Check, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ArrowUp, 
  FileCode, 
  CheckCircle2, 
  Code2,
  RotateCcw,
  Paperclip,
  X,
  FileText
} from 'lucide-react';

// -----------------------------------------------------------------------------
// 3D FIBONACCI PARTICLE SYNTHESIS ORB
// -----------------------------------------------------------------------------
function HeroOrb() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    const numParticles = 800;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    const resize = () => {
      canvas.width = 440;
      canvas.height = 440;
    };
    resize();

    const render = () => {
      time += 0.035;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const baseRadius = 140 + Math.sin(time * 3.5) * 16;
      const fov = 380;

      const particles = [];

      for (let i = 0; i < numParticles; i++) {
        const theta = (2 * Math.PI * i) / goldenRatio;
        const phi = Math.acos(1 - (2 * (i + 0.5)) / numParticles);
        const r = baseRadius + Math.sin(time * 4 + i * 0.08) * 12;

        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        const angleX = time * 0.4;
        const angleY = time * 0.6;

        let y1 = y * Math.cos(angleX) - z * Math.sin(angleX);
        let z1 = y * Math.sin(angleX) + z * Math.cos(angleX);

        let x2 = x * Math.cos(angleY) + z1 * Math.sin(angleY);
        let z2 = -x * Math.sin(angleY) + z1 * Math.cos(angleY);

        const scale = fov / (fov + z2 + 220);
        const px = cx + x2 * scale;
        const py = cy + y1 * scale;
        const alpha = Math.max(0.15, Math.min(1, (z2 + baseRadius) / (baseRadius * 2.2)));

        particles.push({ px, py, scale, alpha, z: z2 });
      }

      particles.sort((a, b) => a.z - b.z);

      particles.forEach((p) => {
        const size = Math.max(0.9, p.scale * 2.5);
        ctx.beginPath();
        ctx.arc(p.px, p.py, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(216, 180, 254, ${p.alpha})`;
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#c084fc';
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative flex items-center justify-center my-2 pointer-events-none shrink-0">
      <div className="absolute w-96 h-96 rounded-full bg-purple-500/40 blur-[130px] scale-110 opacity-90 pointer-events-none" />
      <canvas ref={canvasRef} className="relative z-10 w-[420px] h-[420px]" />
    </div>
  );
}

// -----------------------------------------------------------------------------
// WORKSPACE ACTIONS (Export .zip + Git Push Modal)
// -----------------------------------------------------------------------------
function WorkspaceActions({ sessionId }: { sessionId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDownloadZip = () => {
    window.location.href = `http://localhost:8000/api/workspace/download/${sessionId}`;
  };

  const handleGitPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName || !githubToken) return;

    setPushing(true);
    setPushStatus(null);

    try {
      const res = await fetch("http://localhost:8000/api/workspace/git-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          repo_name: repoName,
          github_token: githubToken,
          commit_message: "Synthesized workspace exported via G.L.A.S.S."
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to push to GitHub.");

      setPushStatus({ type: 'success', message: data.message });
      setTimeout(() => setIsModalOpen(false), 2000);
    } catch (err: any) {
      setPushStatus({ type: 'error', message: err.message });
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleDownloadZip}
        title="Download Workspace (.zip)"
        className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-purple-200 transition-all active:scale-95"
      >
        <Download className="w-3.5 h-3.5 text-purple-400" />
        <span>Export .zip</span>
      </button>

      <button
        onClick={() => setIsModalOpen(true)}
        title="Push Workspace to GitHub"
        className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-medium text-purple-300 transition-all active:scale-95"
      >
        <GitBranch className="w-3.5 h-3.5 text-purple-400" />
        <span>Git Push</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md p-6 bg-zinc-950/90 border border-purple-500/20 rounded-2xl shadow-2xl relative">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-400" /> Push to GitHub
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Push your synthesized multi-file code workspace directly to a GitHub repository.
            </p>

            <form onSubmit={handleGitPush} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Repository Name (username/repository)
                </label>
                <input
                  type="text"
                  placeholder="rustspielberg/my-synthesized-app"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  GitHub Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              {pushStatus && (
                <div className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 ${
                  pushStatus.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                }`}>
                  {pushStatus.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{pushStatus.message}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pushing}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  {pushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Push Repository"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// REUSABLE PROMPT BAR COMPONENT
// -----------------------------------------------------------------------------
interface PromptBarProps {
  prompt: string;
  setPrompt: (val: string) => void;
  attachedFile: File | null;
  removeAttachedFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRun: (e?: React.FormEvent) => void;
  loading: boolean;
  placeholderText: string;
}

function PromptBar({
  prompt,
  setPrompt,
  attachedFile,
  removeAttachedFile,
  fileInputRef,
  handleFileChange,
  handleRun,
  loading,
  placeholderText
}: PromptBarProps) {
  return (
    <form onSubmit={handleRun} className="w-full relative group shrink-0">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur opacity-35 group-hover:opacity-75 transition duration-500" />
      <div className="relative bg-zinc-950/90 border border-white/10 rounded-2xl p-3 flex flex-col gap-2 shadow-2xl">
        
        {/* ATTACHED FILE CHIP */}
        {attachedFile && (
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-purple-950/50 border border-purple-500/30 text-purple-300 text-xs w-fit">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>{attachedFile.name}</span>
            <button
              type="button"
              onClick={removeAttachedFile}
              className="hover:text-white text-zinc-400 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center">
          <Sparkles className="w-5 h-5 text-purple-400 ml-2 mr-3 shrink-0" />
          
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholderText}
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none font-mono"
          />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".py,.c,.cpp,.java,.js,.ts,.html,.css,.rs,.go,.json,.md"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach local code file to audit & refine"
            className="p-2 text-zinc-400 hover:text-purple-300 transition-colors shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="submit"
            disabled={loading || (!prompt.trim() && !attachedFile)}
            className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-50 shrink-0 ml-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// MAIN PLAYGROUND COMPONENT
// -----------------------------------------------------------------------------
export function Playground() {
  // DYNAMIC SESSION ID: Isolates each workspace session cleanly
  const [sessionId, setSessionId] = useState<string>(() => `session_${Date.now()}`);

  const [prompt, setPrompt] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [steps, setSteps] = useState<any[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRun = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() && !attachedFile) return;

    const currentPrompt = prompt;
    setPrompt(""); // Clear input bar for next prompt

    setLoading(true);
    
    const initialTool = attachedFile ? "analyze_codebase" : (steps.length > 0 ? "update_codebase" : "synthesize_codebase");
    const initialStatus = attachedFile 
      ? `Analyzing attached file '${attachedFile.name}' for bugs & optimizations...` 
      : "Querying G.L.A.S.S. model engine...";

    const currentIteration = steps.length + 1;
    const newStep = {
      type: "tool_step",
      iteration: currentIteration,
      tool: initialTool,
      args: { 
        prompt: currentPrompt || `Refine and audit ${attachedFile?.name}`, 
        file: attachedFile?.name || null,
        status: initialStatus 
      },
      output: attachedFile 
        ? `Inspecting ${attachedFile.name} in isolated execution workspace...` 
        : "Synthesizing multi-file codebase in isolated workspace..."
    };

    setSteps(prev => [...prev, newStep]);

    try {
      const formData = new FormData();
      formData.append("prompt", currentPrompt);
      formData.append("session_id", sessionId);
      if (attachedFile) {
        formData.append("file", attachedFile);
      }

      const res = await fetch("http://localhost:8000/api/agent/run", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Backend server returned an error.");
      }

      setTokens(prev => prev + (data.tokens?.total || 0));
      if (data.steps) {
        setSteps(data.steps);
      }

      const createdFiles: string[] = [];
      data.steps?.forEach((step: any) => {
        if ((step.tool === "create_or_update_file" || step.tool === "refine_codebase") && step.args?.path) {
          if (!createdFiles.includes(step.args.path)) {
            createdFiles.push(step.args.path);
          }
        }
      });

      if (createdFiles.length > 0) {
        setFiles(createdFiles);
        if (!activeFile || !createdFiles.includes(activeFile)) {
          selectFile(createdFiles[0]);
        } else {
          selectFile(activeFile);
        }
      }
    } catch (err: any) {
      setSteps(prev => [
        ...prev,
        {
          type: "completion",
          content: `Synthesis Error\n${err.message || "Backend server unreachable. Ensure Uvicorn is running on port 8000."}`
        }
      ]);
    } finally {
      setLoading(false);
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReset = () => {
    // Generate a new session ID for the new synthesis
    setSessionId(`session_${Date.now()}`);
    setPrompt("");
    setAttachedFile(null);
    setLoading(false);
    setSteps([]);
    setFiles([]);
    setActiveFile("");
    setFileContent("");
    setTokens(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectFile = async (filename: string) => {
    setActiveFile(filename);
    try {
      const res = await fetch(`http://localhost:8000/api/workspace/file/${filename}?session_id=${sessionId}`);
      const data = await res.json();
      setFileContent(data.content || "");
    } catch {
      setFileContent("# Error loading file content.");
    }
  };

  const placeholderText = attachedFile
    ? `Refine, audit, or edit ${attachedFile.name}...`
    : files.length > 0
    ? "Ask G.L.A.S.S. to modify, add features, or refine this codebase..."
    : "Describe what software, API endpoint, or script you want G.L.A.S.S. to build...";

  return (
    <div className="min-h-screen bg-[#06050a] text-white font-mono flex flex-col relative overflow-hidden">
      {/* PURPLE RADIAL AMBIENT BACKGROUND GLOW */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/20 blur-[140px] rounded-full pointer-events-none" />

      {/* TOP NAVBAR */}
      <header className="h-14 border-b border-white/10 px-6 flex items-center justify-between z-10 bg-black/40 backdrop-blur-md shrink-0">
        <div className="flex items-center space-x-3">
          <span className="font-bold tracking-wider text-white text-base">G.L.A.S.S.</span>
          <span className="text-zinc-600">|</span>
          <span className="text-xs text-zinc-400">Workspace</span>
        </div>

        <div className="flex items-center space-x-4">
          {(files.length > 0 || steps.length > 0) && (
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Synthesis</span>
            </button>
          )}

          <div className="flex items-center space-x-3 text-xs bg-zinc-900/80 px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-zinc-400">Tokens:</span>
            <span className="font-semibold text-purple-300">{tokens}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE VIEW */}
      <main className="flex-1 flex overflow-hidden z-10 p-6 gap-6 min-h-0">
        {/* LEFT COLUMN */}
        <div className={`flex flex-col transition-all duration-500 min-h-0 ${files.length > 0 ? 'w-1/2 gap-4' : 'w-full max-w-4xl mx-auto justify-center items-center gap-4'}`}>
          
          {/* 1. IDLE STATE: CENTERED PROMPT PILL (Before first run) */}
          {!loading && steps.length === 0 && (
            <div className="w-full max-w-2xl">
              <PromptBar
                prompt={prompt}
                setPrompt={setPrompt}
                attachedFile={attachedFile}
                removeAttachedFile={removeAttachedFile}
                fileInputRef={fileInputRef}
                handleFileChange={handleFileChange}
                handleRun={handleRun}
                loading={loading}
                placeholderText={placeholderText}
              />
            </div>
          )}

          {/* 2. SYNTHESIZING STATE: SHOW HERO ORB */}
          {loading && <HeroOrb />}

          {/* 3. EXECUTION LOG PANEL */}
          {steps.length > 0 && (
            <div className="w-full flex-1 min-h-0 bg-zinc-950/70 border border-white/10 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto shadow-2xl">
              <div className="text-xs font-semibold text-zinc-400 tracking-wider uppercase flex items-center justify-between shrink-0">
                <span>Execution Log</span>
                {loading && <span className="text-purple-400 animate-pulse">Synthesizing Codebase...</span>}
              </div>

              {steps.map((step, idx) => (
                <div key={idx} className="space-y-2 shrink-0">
                  {step.type === "tool_step" && (
                    <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3 text-xs space-y-2">
                      <div className="text-purple-400 font-medium flex items-center gap-1.5">
                        <span>&gt;_ Step {step.iteration}: {step.tool}</span>
                      </div>
                      <pre className="text-zinc-300 overflow-x-auto p-2 bg-black/40 rounded-lg text-[11px]">
                        {JSON.stringify(step.args, null, 2)}
                      </pre>
                      <div className="text-zinc-400 text-[11px] pt-1 border-t border-white/5">
                        <span className="text-zinc-500 uppercase font-semibold">Output: </span>
                        {step.output}
                      </div>
                    </div>
                  )}

                  {step.type === "completion" && (
                    <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-3 text-xs text-purple-200 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="whitespace-pre-wrap">{step.content}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 4. COMPLETED STATE: DOCKED BOTTOM PROMPT BAR FOR ITERATIONS */}
          {!loading && steps.length > 0 && (
            <div className="w-full shrink-0">
              <PromptBar
                prompt={prompt}
                setPrompt={setPrompt}
                attachedFile={attachedFile}
                removeAttachedFile={removeAttachedFile}
                fileInputRef={fileInputRef}
                handleFileChange={handleFileChange}
                handleRun={handleRun}
                loading={loading}
                placeholderText={placeholderText}
              />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SYNTHESIZED FILE INSPECTOR PANEL */}
        {files.length > 0 && (
          <div className="w-1/2 bg-zinc-950/80 border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl min-h-0">
            <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between bg-black/30 shrink-0">
              <div className="flex items-center space-x-2 overflow-x-auto">
                <Code2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs text-zinc-400 shrink-0 font-medium mr-2">Synthesized Files:</span>

                {files.map((file) => (
                  <button
                    key={file}
                    onClick={() => selectFile(file)}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs transition-all shrink-0 ${
                      activeFile === file
                        ? 'bg-purple-600/30 border border-purple-500/40 text-purple-200'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{file}</span>
                  </button>
                ))}
              </div>

              <WorkspaceActions sessionId={sessionId} />
            </div>

            <div className="flex-1 p-4 overflow-auto bg-black/60 min-h-0">
              <pre className="text-xs font-mono text-zinc-200 leading-relaxed whitespace-pre">
                {fileContent}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Playground;
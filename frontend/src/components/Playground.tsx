import { useState } from "react"
import { Play, Code, Terminal, FileText, CheckCircle2, RefreshCw } from "lucide-react"

interface Step {
  type: string
  iteration?: number
  tool?: string
  args?: any
  output?: string
  content?: string
}

export default function Playground() {
  const [prompt, setPrompt] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  // Track only session-generated files
  const [sessionFiles, setSessionFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>("")
  const [tokens, setTokens] = useState({ prompt: 0, completion: 0, total: 0 })

  // Fetch content for a specific session file
  const fetchFileContent = async (filename: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/workspace/file/${filename}`)
      const data = await res.json()
      setFileContent(data.content || "")
      setSelectedFile(filename)
    } catch (e) {
      console.error("Failed to fetch file content:", e)
    }
  }

  const handleRunAgent = async () => {
    if (!prompt.trim() || isRunning) return
    setIsRunning(true)
    setSteps([])

    try {
      const response = await fetch("http://localhost:8000/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })

      const data = await response.json()
      const newSteps: Step[] = data.steps || []
      setSteps(newSteps)
      setTokens(data.tokens || { prompt: 0, completion: 0, total: 0 })

      // Extract only files created or updated during this run
      const createdFiles: string[] = []
      newSteps.forEach((step) => {
        if (step.tool === "create_or_update_file" && step.args?.path) {
          if (!createdFiles.includes(step.args.path)) {
            createdFiles.push(step.args.path)
          }
        }
      })

      setSessionFiles(createdFiles)
      if (createdFiles.length > 0) {
        fetchFileContent(createdFiles[0])
      }
    } catch (error) {
      console.error("Error executing agent loop:", error)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0A0A0C] text-white">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-6 backdrop-blur-md bg-black/40">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-wider">G.L.A.S.S.</span>
          <span className="text-xs text-white/40 font-mono">| Workspace</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-white/60">
          <div>Tokens: <span className="text-green-400">{tokens.total}</span></div>
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Input & Tool Execution Feed */}
        <div className="flex w-1/2 flex-col border-r border-white/10 p-4 gap-4">
          <div className="relative rounded-xl border border-white/10 bg-black/40 p-3">
            <textarea
              className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none resize-none h-20"
              placeholder="Describe what you want G.L.A.S.S. to build and execute..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="flex justify-end pt-2">
              <button
                onClick={handleRunAgent}
                disabled={isRunning}
                className="flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 cursor-pointer"
              >
                {isRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {isRunning ? "Synthesizing..." : "Run Agent"}
              </button>
            </div>
          </div>

          {/* Running Indicator */}
          {isRunning && (
            <div className="flex flex-col items-center justify-center p-6 border border-white/10 rounded-xl bg-black/20">
              <div className="h-10 w-10 rounded-full border-2 border-green-500 border-t-transparent animate-spin mb-3" />
              <p className="text-xs text-white/60 font-mono">Agent reasoning & synthesizing software...</p>
            </div>
          )}

          {/* Execution Steps */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {steps.map((step, idx) => (
              <div key={idx} className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs font-mono">
                {step.type === "tool_step" && (
                  <div>
                    <div className="flex items-center gap-2 text-green-400 mb-1">
                      <Terminal className="h-3.5 w-3.5" />
                      <span>Step {step.iteration}: {step.tool}</span>
                    </div>
                    <pre className="text-white/70 bg-black/50 p-2 rounded overflow-x-auto text-[11px]">
                      {JSON.stringify(step.args, null, 2)}
                    </pre>
                    {step.output && (
                      <div className="mt-2 text-white/50 border-t border-white/5 pt-2">
                        <span className="text-white/30">Output:</span>
                        <pre className="whitespace-pre-wrap max-h-32 overflow-y-auto">{step.output}</pre>
                      </div>
                    )}
                  </div>
                )}
                {step.type === "completion" && (
                  <div className="text-white/90">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Synthesis Complete</span>
                    </div>
                    <p className="whitespace-pre-wrap">{step.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Dynamic File Inspector */}
        <div className="flex w-1/2 flex-col">
          {sessionFiles.length > 0 ? (
            <>
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 bg-black/20 overflow-x-auto">
                <span className="text-xs text-white/40 mr-2 flex items-center gap-1">
                  <Code className="h-3.5 w-3.5" /> Generated Files:
                </span>
                {sessionFiles.map((file) => (
                  <button
                    key={file}
                    onClick={() => fetchFileContent(file)}
                    className={`flex items-center gap-1 rounded px-3 py-1 text-xs transition cursor-pointer ${
                      selectedFile === file ? "bg-white/10 text-white font-medium" : "text-white/50 hover:text-white"
                    }`}
                  >
                    <FileText className="h-3 w-3" />
                    {file}
                  </button>
                ))}
              </div>
              <div className="flex-1 p-4 bg-[#050507] overflow-auto">
                <pre className="font-mono text-xs text-white/80 whitespace-pre leading-relaxed">
                  {fileContent}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-xs text-white/30 font-mono gap-2">
              <Code className="h-8 w-8 text-white/10" />
              <span>No newly synthesized files in this session.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

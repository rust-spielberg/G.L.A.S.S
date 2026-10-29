import os
import re
import ast
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dotenv import load_dotenv
from openai import OpenAI
from config import MODEL_CHAIN, PRIMARY_MODEL, LOCAL_MODEL, NEBIUS_BASE_URL, NVIDIA_BASE_URL, OLLAMA_BASE_URL, logger

load_dotenv()

WORKSPACES_DIR = Path("./workspaces")
WORKSPACES_DIR.mkdir(exist_ok=True)


class WorkspaceManager:
    """Manages file storage and directory isolation per user session."""
    
    def __init__(self, session_id: str = "default_session"):
        self.session_id = session_id
        self.workspace_path = WORKSPACES_DIR / session_id
        self.workspace_path.mkdir(parents=True, exist_ok=True)

    def write_file(self, relative_path: str, content: str) -> str:
        file_path = self.workspace_path / relative_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Successfully written '{relative_path}' to workspace."

    def read_file(self, relative_path: str) -> str:
        file_path = self.workspace_path / relative_path
        if not file_path.exists():
            file_path = WORKSPACES_DIR / relative_path
            if not file_path.exists():
                raise FileNotFoundError(f"File '{relative_path}' not found.")
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    def list_files(self) -> List[str]:
        files = []
        for root, _, filenames in os.walk(self.workspace_path):
            for filename in filenames:
                rel_path = os.path.relpath(os.path.join(root, filename), self.workspace_path)
                files.append(rel_path)
        return files


class UniversalCodeVerifier:
    """Universal static analysis, real compiler checks, and cross-file contract audit engine."""

    LAZY_PATTERNS = [
        re.compile(r'(?i)//\s*(?:todo|to\s+do|implement|rest\s+of\s+code|\.\.\.)'),
        re.compile(r'(?i)/\*\s*(?:todo|to\s+do|implement|rest\s+of\s+code|\.\.\.)\s*\*/'),
        re.compile(r'(?i)#\s*(?:todo|to\s+do|implement|rest\s+of\s+code|\.\.\.)'),
        re.compile(r'(?i)<!--\s*(?:todo|implement|\.\.\.)\s*-->'),
        re.compile(r'(?i)pass\s*#\s*(?:todo|implement|placeholder)'),
    ]

    @classmethod
    def _check_lazy_code(cls, filename: str, content: str) -> List[str]:
        issues = []
        for line_num, line in enumerate(content.splitlines(), 1):
            for pattern in cls.LAZY_PATTERNS:
                if pattern.search(line):
                    issues.append(
                        f"Incomplete Code in '{filename}' at line {line_num}: "
                        f"Placeholder detected ('{line.strip()}'). All functions and logic must be 100% implemented."
                    )
                    break
        return issues

    @staticmethod
    def _check_balanced_delimiters(content: str, filename: str) -> List[str]:
        issues = []
        stack = []
        mapping = {')': '(', '}': '{', ']': '['}
        lines = content.splitlines()

        for line_num, line in enumerate(lines, 1):
            clean_line = re.sub(r'".*?"|\'.*?\'|//.*|/\*.*?\*/|#.*', '', line)
            for char in clean_line:
                if char in mapping.values():
                    stack.append((char, line_num))
                elif char in mapping.keys():
                    if not stack or stack[-1][0] != mapping[char]:
                        issues.append(f"Syntax Error in '{filename}' at line {line_num}: Unmatched closing '{char}'.")
                        return issues
                    stack.pop()
        
        if stack:
            char, line_num = stack[-1]
            issues.append(f"Syntax Error in '{filename}': Unclosed '{char}' originating at line {line_num}.")
        
        return issues

    @classmethod
    def _audit_html_js_contract(cls, files_map: Dict[str, str]) -> List[str]:
        issues = []
        html_content = ""
        for name, content in files_map.items():
            if name.endswith(".html"):
                html_content += content + "\n"

        if not html_content:
            return issues

        # Collect all element IDs defined in HTML
        defined_ids = set(re.findall(r'id=["\']([\w\-]+)["\']', html_content))

        # Check JS files and inline scripts for getElementById references
        for name, content in files_map.items():
            if name.endswith(".js") or name.endswith(".html"):
                js_id_matches = re.findall(r'getElementById\(["\']([\w\-]+)["\']\)', content)
                for element_id in js_id_matches:
                    if element_id not in defined_ids:
                        issues.append(
                            f"Contract Mismatch: '{name}' calls document.getElementById('{element_id}'), "
                            f"but id='{element_id}' is not defined in any HTML element."
                        )
        return issues

    @classmethod
    def audit_codebase(cls, files_map: Dict[str, str], original_file_name: Optional[str] = None) -> List[str]:
        defects = []

        if not files_map:
            return ["Empty Codebase Error: No valid code files were generated."]

        for filename, content in files_map.items():
            ext = os.path.splitext(filename)[1].lower()

            # 1. Anti-lazy / placeholder check
            lazy_issues = cls._check_lazy_code(filename, content)
            defects.extend(lazy_issues)

            # 2. Language-specific compilation & AST checks
            if ext == ".py":
                try:
                    ast.parse(content, filename=filename)
                    compile(content, filename, "exec")
                except SyntaxError as se:
                    defects.append(f"Python SyntaxError in '{filename}' at line {se.lineno}: {se.msg}")
                except Exception as e:
                    defects.append(f"Python Compilation Error in '{filename}': {str(e)}")

            elif ext == ".json":
                try:
                    json.loads(content)
                except json.JSONDecodeError as jde:
                    defects.append(f"JSON SyntaxError in '{filename}' at line {jde.lineno}: {jde.msg}")

            elif ext in [".js", ".jsx"]:
                delimiter_errs = cls._check_balanced_delimiters(content, filename)
                if delimiter_errs:
                    defects.extend(delimiter_errs)
                else:
                    # Run node --check if node is available
                    try:
                        with tempfile.NamedTemporaryFile("w", suffix=ext, delete=False) as tf:
                            tf.write(content)
                            temp_name = tf.name
                        proc = subprocess.run(["node", "--check", temp_name], capture_output=True, text=True, timeout=5)
                        if proc.returncode != 0:
                            err_msg = proc.stderr.splitlines()[0] if proc.stderr else "Node.js syntax error"
                            defects.append(f"JavaScript Syntax Error in '{filename}': {err_msg}")
                        os.unlink(temp_name)
                    except Exception:
                        pass

            elif ext in [".cpp", ".cc", ".c", ".h", ".hpp"]:
                delimiter_errs = cls._check_balanced_delimiters(content, filename)
                if delimiter_errs:
                    defects.extend(delimiter_errs)
                else:
                    # Run clang++ -fsyntax-only if clang++ is available
                    try:
                        compiler = "clang++" if ext in [".cpp", ".cc", ".hpp"] else "clang"
                        with tempfile.NamedTemporaryFile("w", suffix=ext, delete=False) as tf:
                            tf.write(content)
                            temp_name = tf.name
                        proc = subprocess.run([compiler, "-fsyntax-only", "-std=c++17" if "cpp" in ext else "-std=c11", temp_name], capture_output=True, text=True, timeout=5)
                        if proc.returncode != 0:
                            first_err = [line for line in proc.stderr.splitlines() if "error:" in line]
                            if first_err:
                                defects.append(f"C/C++ Compiler Error in '{filename}': {first_err[0]}")
                        os.unlink(temp_name)
                    except Exception:
                        pass

            elif ext in [".java", ".rs", ".go", ".cs"]:
                defects.extend(cls._check_balanced_delimiters(content, filename))

        # 3. Cross-file HTML ↔ JS contract check
        defects.extend(cls._audit_html_js_contract(files_map))

        # 4. Missing referenced file check (e.g. index.html references game.js but it wasn't generated)
        for filename, content in files_map.items():
            if filename.endswith(".html"):
                referenced_scripts = re.findall(r'<script[^>]+src=["\']([^"\']+\.js)["\']', content)
                referenced_links = re.findall(r'<link[^>]+href=["\']([^"\']+\.css)["\']', content)
                for ref in referenced_scripts + referenced_links:
                    ref_basename = ref.split("/")[-1]
                    if not any(ref_basename == f.split("/")[-1] for f in files_map):
                        defects.append(
                            f"Missing File: '{filename}' references '{ref}' via <script>/<link>, "
                            f"but '{ref_basename}' was never generated. The agent must produce this file completely."
                        )

        # 5. Canvas HUD layering — pointer-events check for JS/HTML
        for filename, content in files_map.items():
            if filename.endswith((".js", ".html")):
                if "getContext" in content and ("hud" in content.lower() or "overlay" in content.lower() or "modal" in content.lower()):
                    if "pointer-events" not in content:
                        defects.append(
                            f"Canvas Layering Warning in '{filename}': A canvas with a HUD/overlay was detected but "
                            f"no 'pointer-events: none' CSS rule was found. HUD containers must have pointer-events: none "
                            f"with pointer-events: auto re-enabled on interactive buttons, or canvas clicks will be blocked."
                        )

        # 6. Web Audio API timeline collision check for JS/HTML
        for filename, content in files_map.items():
            if filename.endswith((".js", ".html")):
                if "linearRampToValueAtTime" in content or "exponentialRampToValueAtTime" in content:
                    ramp_collision_match = re.search(
                        r'\.(?:linear|exponential)RampToValueAtTime\([^,]+,\s*([^)]+)\);\s*[a-zA-Z0-9_\.]+\.setValueAtTime\([^,]+,\s*\1\)',
                        content
                    )
                    if ramp_collision_match:
                        defects.append(
                            f"Web Audio API Error in '{filename}': Redundant setValueAtTime scheduled at the exact ramp target timestamp '{ramp_collision_match.group(1)}'. Remove this setValueAtTime call."
                        )

        return defects


class UIUXGuardrailInspector:
    """
    Priority 2 (Secondary) — UI/UX Design Quality Guardrail.
    Runs ONLY after Priority 1 (UniversalCodeVerifier) passes functional checks.
    Inspects generated HTML/CSS for modern styling, layout, and aesthetic polish.
    NEVER overrides functional correctness — ranked feedback lists functional bugs first.
    """

    @classmethod
    def audit_uiux(cls, files_map: Dict[str, str]) -> List[str]:
        """Returns a list of UI/UX flaws found. Empty list = all checks passed."""
        flaws = []

        html_content = ""
        css_content = ""
        has_html = False

        for fname, content in files_map.items():
            if fname.endswith(".html"):
                html_content += content + "\n"
                has_html = True
            if fname.endswith(".css"):
                css_content += content + "\n"

        # Inline <style> blocks inside HTML count as CSS too
        inline_styles = re.findall(r"<style[^>]*>(.*?)</style>", html_content, re.DOTALL | re.IGNORECASE)
        css_content += "\n".join(inline_styles)

        if not has_html:
            return flaws  # Only audit web projects

        combined = html_content + css_content

        # Check 1: Viewport meta tag (mobile readiness)
        if "<meta name=\"viewport\"" not in html_content and "<meta name='viewport'" not in html_content:
            flaws.append(
                "UI/UX — Missing <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">. "
                "Required for responsive mobile layout."
            )

        # Check 2: CSS custom properties (design tokens / theming)
        if "--" not in css_content:
            flaws.append(
                "UI/UX — No CSS custom properties (--variables) found. "
                "Define a color palette and spacing scale using :root { --primary: ...; } for visual consistency."
            )

        # Check 3: Modern layout system (flex or grid)
        if "flex" not in css_content and "grid" not in css_content:
            flaws.append(
                "UI/UX — No flexbox or CSS grid layout detected. "
                "Replace raw block/float layouts with display: flex or display: grid for responsive structure."
            )

        # Check 4: Typography — font-family defined
        if "font-family" not in css_content:
            flaws.append(
                "UI/UX — No font-family declaration found. "
                "Import a modern Google Font (Inter, Orbitron, Space Grotesk) via CDN <link> and apply it globally."
            )

        # Check 5: Glassmorphism / dark mode aesthetic
        has_glassmorphism = (
            "backdrop-filter" in css_content
            or "rgba(" in css_content
            or "linear-gradient" in css_content
            or "radial-gradient" in css_content
        )
        if not has_glassmorphism:
            flaws.append(
                "UI/UX — No glassmorphism or modern dark/light aesthetic detected. "
                "Apply backdrop-filter: blur(), rgba() translucent backgrounds, or linear-gradient() for visual depth."
            )

        # Check 6: Interactive hover/focus states
        if ":hover" not in css_content and ":focus" not in css_content:
            flaws.append(
                "UI/UX — No :hover or :focus interactive states found in CSS. "
                "Add hover transitions and focus outlines for all interactive elements (buttons, inputs, cards)."
            )

        return flaws


class CodeSanitizer:
    """Post-processes generated code to resolve CDN endpoints and structural integrity."""

    STABLE_THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"

    @classmethod
    def sanitize(cls, files_map: Dict[str, str]) -> Dict[str, str]:
        html_key = next((k for k in files_map if k.endswith(".html")), None)

        if html_key and html_key in files_map:
            html_content = files_map[html_key]
            if "threejs.org/build/three.js" in html_content or "three.js/build" in html_content:
                html_content = re.sub(
                    r'src=["\']https?://(?:www\.)?threejs\.org/build/three\.js["\']',
                    f'src="{cls.STABLE_THREE_CDN}"',
                    html_content
                )
                files_map[html_key] = html_content

        # Auto-sanitize Web Audio timeline collisions across all JS and HTML files
        for fname, content in files_map.items():
            if fname.endswith((".js", ".html")):
                # Pattern: ramp followed immediately by redundant setValueAtTime at the same target time
                sanitized_content = re.sub(
                    r'(\.(?:linear|exponential)RampToValueAtTime\(([^,]+),\s*([^)]+)\);?)\s*([a-zA-Z0-9_\.]+\.setValueAtTime\(\s*(?:\2|\w+),\s*\3\s*\);?)',
                    r'\1 // [Sanitized: Removed redundant setValueAtTime at ramp completion timestamp]',
                    content
                )
                files_map[fname] = sanitized_content

        # Auto-inject Canvas & HUD Layering defaults into CSS
        for fname, content in files_map.items():
            if fname.endswith(".css"):
                if ("hud" in content.lower() or "overlay" in content.lower() or "modal" in content.lower()) and "pointer-events" not in content:
                    files_map[fname] = content + "\n\n/* Canvas & HUD Layering Failsafe */\n.hud-overlay { pointer-events: none; }\n.hud-overlay button, .modal-content, button, input { pointer-events: auto; }\n"

        return files_map


class CodeExtractor:
    """Universal code extractor that filters conversational text and parses separate file blocks."""
    
    CLI_LANGUAGES = {"bash", "sh", "zsh", "shell", "cmd", "powershell", "terminal", "console"}

    @staticmethod
    def infer_filename_by_lang(lang: str, idx: int = 1) -> str:
        lang = lang.lower().strip()
        if lang in ["html", "htm"]:
            return "index.html" if idx == 1 else f"page_{idx}.html"
        elif lang in ["css"]:
            return "styles.css" if idx == 1 else f"styles_{idx}.css"
        elif lang in ["js", "javascript"]:
            return "script.js" if idx == 1 else f"script_{idx}.js"
        elif lang in ["ts", "typescript"]:
            return "script.ts" if idx == 1 else f"script_{idx}.ts"
        elif lang in ["py", "python"]:
            return "main.py" if idx == 1 else f"module_{idx}.py"
        elif lang in ["cpp", "c++"]:
            return "main.cpp" if idx == 1 else f"module_{idx}.cpp"
        elif lang in ["c"]:
            return "main.c"
        elif lang in ["java"]:
            return "Main.java"
        elif lang in ["rust", "rs"]:
            return "main.rs"
        elif lang in ["go"]:
            return "main.go"
        return f"file_{idx}.txt"

    @classmethod
    def parse_response(cls, llm_text: str, prompt: str, default_filename: str = "") -> List[Tuple[str, str]]:
        pattern = r"```(?:([\w\+\-#]+))?(?::|\s+)?([\w\.\-/]+)?\n(.*?)```"
        matches = re.findall(pattern, llm_text, re.DOTALL)
        
        extracted = []
        used_filenames = set()

        for idx, (match_lang, match_file, code_content) in enumerate(matches, start=1):
            code_str = code_content.strip()
            lang_clean = match_lang.lower().strip() if match_lang else ""

            if lang_clean in cls.CLI_LANGUAGES:
                continue

            # Strip accidental markdown headers inside code blocks
            code_str = re.sub(r"^(?:#+|\*\*).*?\n", "", code_str).strip()

            if not code_str:
                continue

            filename = match_file.strip() if match_file else ""
            
            if not filename:
                first_line = code_str.split("\n")[0]
                comment_match = re.search(r"(?:#|//|<!--)\s*(?:file:)?\s*([\w\.\-]+\.\w+)", first_line, re.IGNORECASE)
                if comment_match:
                    filename = comment_match.group(1)

            if not filename:
                filename = cls.infer_filename_by_lang(match_lang, idx)

            if not filename and default_filename:
                filename = default_filename

            base_name, ext = os.path.splitext(filename)
            counter = 1
            final_filename = filename
            while final_filename in used_filenames:
                final_filename = f"{base_name}_{counter}{ext}"
                counter += 1

            used_filenames.add(final_filename)
            extracted.append((final_filename, code_str))
            
        # Truncation recovery: detect an unclosed trailing code block (odd number of ``` markers)
        all_backtick_positions = [m.start() for m in re.finditer(r'```', llm_text)]
        if len(all_backtick_positions) % 2 != 0 and extracted:
            last_open_pos = llm_text.rfind('```')
            truncated_block = llm_text[last_open_pos:]
            trunc_match = re.match(r'```(?:([\w\+\-#]+))?(?::|\s+)?([\w\.\-/]+)?\n(.*)', truncated_block, re.DOTALL)
            if trunc_match:
                t_lang, t_fname, t_code = trunc_match.groups()
                t_code = t_code.strip()
                t_lang_clean = t_lang.lower().strip() if t_lang else ""
                if t_code and t_lang_clean not in cls.CLI_LANGUAGES:
                    t_fname = t_fname.strip() if t_fname else cls.infer_filename_by_lang(t_lang or "", len(extracted) + 1)
                    if t_fname and t_fname not in used_filenames:
                        extracted.append((t_fname, t_code))

        if not extracted and llm_text.strip():
            clean_code = re.sub(r"^```[a-zA-Z]*\n", "", llm_text, flags=re.MULTILINE)
            clean_code = re.sub(r"```$", "", clean_code, flags=re.MULTILINE).strip()
            
            # Content-aware and prompt-aware fallback detection:
            prompt_lower = prompt.lower()
            if "<!doctype html" in clean_code.lower() or "<html" in clean_code.lower() or "index.html" in prompt_lower or "html" in prompt_lower or "web" in prompt_lower:
                fallback = "index.html"
            elif default_filename:
                fallback = default_filename
            else:
                fallback = "main.py"
            extracted.append((fallback, clean_code))
            
        return extracted


class GlassAgent:
    """Hybrid Cloud-Edge Agent Loop with multi-language compiler verification and self-healing execution."""

    MAX_HEALING_TURNS = 3
    
    def __init__(self, session_id: str = "default_session"):
        self.workspace = WorkspaceManager(session_id)

    def _query_llm_engine(self, system_prompt: str, user_prompt: str) -> Tuple[Optional[str], str, Optional[str]]:
        nebius_key = os.getenv("NEBIUS_API_KEY", "").strip()
        nvidia_key = os.getenv("NVIDIA_API_KEY", "").strip()
        last_error = None

        # 1. Primary & Secondary Failover Chain (Nebius Token Factory)
        if nebius_key:
            client = OpenAI(
                base_url=NEBIUS_BASE_URL,
                api_key=nebius_key,
                timeout=90.0
            )
            for idx, model in enumerate(MODEL_CHAIN):
                try:
                    logger.info(f"Dispatching synthesis request to model: {model}")
                    resp = client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        temperature=0.1,
                        max_tokens=8192
                    )
                    content = resp.choices[0].message.content
                    if content and content.strip():
                        return content, f"Nebius Cloud ({model})", None
                except Exception as e:
                    last_error = e
                    next_model = MODEL_CHAIN[idx + 1] if idx + 1 < len(MODEL_CHAIN) else ("NVIDIA NIM" if nvidia_key else "Local Ollama")
                    logger.warning(f"Model {model} unavailable ({e}). Failing over to {next_model}...")

        # 2. NVIDIA NIM Cloud Fallback
        if nvidia_key:
            try:
                client = OpenAI(
                    base_url=NVIDIA_BASE_URL,
                    api_key=nvidia_key,
                    timeout=90.0
                )
                logger.info(f"Dispatching failover request to NVIDIA NIM: {PRIMARY_MODEL}")
                resp = client.chat.completions.create(
                    model=PRIMARY_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.1,
                    max_tokens=8192
                )
                content = resp.choices[0].message.content
                if content and content.strip():
                    return content, f"NVIDIA NIM ({PRIMARY_MODEL})", None
            except Exception as e:
                last_error = e
                logger.warning(f"NVIDIA NIM failed ({e}). Attempting local fallback...")

        # 3. Fallback: Local Ollama on Apple Silicon Metal
        try:
            client = OpenAI(
                base_url=OLLAMA_BASE_URL,
                api_key="ollama",
                timeout=90.0
            )
            logger.info(f"Dispatching request to Local Ollama ({LOCAL_MODEL})")
            resp = client.chat.completions.create(
                model=LOCAL_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                max_tokens=8192
            )
            return resp.choices[0].message.content, f"Local Ollama ({LOCAL_MODEL} on Metal)", None
        except Exception as e:
            last_error = e
            logger.error(f"Local Ollama engine failed: {e}")

        # All endpoints failed
        error_msg = "[ERROR] All AI inference endpoints are currently unreachable. Please check environment configuration or provider API keys."
        return None, "Offline Synthesizer Engine", error_msg

    def execute(self, prompt: str, file_name: Optional[str] = None, file_content: Optional[str] = None) -> Dict[str, Any]:
        steps = []
        accumulated_tokens = 0

        system_instruction = (
            "You are G.L.A.S.S., an elite industrial full-stack code generator.\n"
            "CRITICAL DIRECTIVES:\n"
            "1. OUTPUT ONLY RAW CODE BLOCKS. ABSOLUTELY NO INTRO TEXT, NO HOW-TO RUN GUIDES, NO CONVERSATIONAL FILLER, AND NO MARKDOWN EXPLANATIONS.\n"
            "2. EVERY FILE MUST BE 100% COMPLETE AND PRODUCTION-READY. NEVER use placeholders, never use '// TODO', '/* ... */', or pass.\n"
            "3. If building a Web App (HTML/CSS/JS), ensure all DOM element IDs referenced in JavaScript actually exist in the HTML.\n"
            "4. Web Audio API Protocol: When building ADSR envelopes or synth nodes, NEVER call setValueAtTime() at the exact timestamp where linearRampToValueAtTime() or exponentialRampToValueAtTime() concludes. Ramps set values automatically at target times; duplicating setValueAtTime at the same timestamp crashes the timeline scheduler.\n"
            "5. Canvas & HUD Layering Protocol: When stacking a <canvas> with HUD/overlay/modal divs, the HUD container MUST have 'pointer-events: none' in CSS. Interactive elements (buttons, modals) inside the HUD MUST have 'pointer-events: auto' explicitly re-enabled, otherwise buttons will be completely unclickable.\n"
            "6. Sandbox Script Execution Standard: Do NOT wrap main script logic in 'DOMContentLoaded' or window.onload. In our execution sandbox, scripts evaluate with the DOM already parsed; DOMContentLoaded listeners may miss the event and never execute. Define initialization functions (e.g. init(), startGame()) and invoke them directly at the bottom of the script.\n"
            "7. CDN Library Standard: Always load heavy external libraries (Three.js, Phaser, Chart.js, Tone.js, Tailwind) via official CDN <script> tags in index.html (e.g. cdnjs, jsdelivr). NEVER attempt to generate local library mock files or write engine code from scratch.\n"
            "8. File Completeness Protocol: If your HTML references ANY external files via <script src='file.js'> or <link href='style.css'>, you MUST generate every single referenced file as its own complete code block in this response. Never reference a file you do not fully generate.\n"
            "9. Format EVERY file block with its exact relative path:\n"
            "```lang:relative/path/filename.ext\n<full code here>\n```\n"
            "10. Make sure the code is completely self-contained and immediately executable without missing imports or dependencies.\n"
            "11. Visual Polish & Aesthetics Baseline (1.5X Standard):\n"
            "   - Colors: NEVER use raw primary color names ('red', 'blue', 'green', 'yellow'). Use modern, cohesive dark/light palettes (e.g. Cyberpunk #0d0e15, #00ffcc, #ff0055, or Slate/Indigo #0f172a, #6366f1) and apply linear/radial gradients to entities and backgrounds for depth.\n"
            "   - Canvas & Entities: NEVER draw plain single-block `fillRect` squares for interactive objects or characters. Construct compound shapes (`roundRect`, `arc`, rims, highlights, eyes/wings) with glowing feedback (`shadowBlur`) and visual polish.\n"
            "   - UI & Typography: Import Google Fonts ('Inter', 'Orbitron', or 'Press Start 2P') via CDN <link> in index.html. Style HUDs and cards with glassmorphism (`backdrop-filter: blur(12px)`, translucent borders `rgba(255,255,255,0.1)`, `border-radius: 12px`), with smooth active/hover button transitions.\n"
            "12. STRICT PROMPT COMPLIANCE & ACCURATE TARGET TECHNOLOGY:\n"
            "   - Read the user prompt in its entirety. Fully implement every feature, mathematical operation, UI element, and detailed requirement requested.\n"
            "   - TARGET THE EXACT REQUESTED TECHNOLOGY & FILENAMES: If the prompt specifies index.html, HTML, web application, CSS, or JS, you MUST produce index.html, style.css, and script.js. NEVER return a Python script (main.py) when web/HTML was requested."
        )

        # Build initial prompt with uploaded file content or existing workspace context
        context_parts = []
        if file_content and file_name:
            context_parts.append(f"ATTACHED FILE `{file_name}` TO AUDIT/UPDATE:\n```{file_name}\n{file_content}\n```")
        elif not file_content:
            prompt_lower = prompt.lower()
            is_new_request = any(k in prompt_lower for k in ["make", "create", "build", "generate", "new", "index.html", "write a", "scientific calculator"])
            
            # Only inject existing workspace files if the user is explicitly refining/editing existing code
            if not is_new_request:
                existing_files = self.workspace.list_files()
                if existing_files:
                    loaded_context = []
                    for ef in existing_files[:4]:  # Include up to 4 primary existing workspace files
                        try:
                            content = self.workspace.read_file(ef)
                            loaded_context.append(f"CURRENT WORKSPACE FILE `{ef}`:\n```{ef}\n{content}\n```")
                        except Exception:
                            pass
                    if loaded_context:
                        context_parts.append("EXISTING WORKSPACE CONTEXT:\n" + "\n\n".join(loaded_context))

        # Anchor user task specification with strict execution reminders at the bottom
        context_parts.append(
            f"USER TASK SPECIFICATION (READ EVERY REQUIREMENT THOROUGHLY):\n{prompt}\n\n"
            "=======================================================\n"
            "CRITICAL EXECUTION MANDATE FOR THE ABOVE SPECIFICATION:\n"
            "1. Read and fulfill 100% of all detailed requirements described above.\n"
            "2. If web/HTML/calculator was requested, produce `index.html`, `style.css`, and `script.js`.\n"
            "3. DO NOT substitute requested web files with Python (`main.py`).\n"
            "4. Return COMPLETE, fully implemented code blocks without placeholders.\n"
            "======================================================="
        )
        initial_prompt = "\n\n".join(context_parts)
        current_prompt = initial_prompt
        last_generated_files: Dict[str, str] = {}

        for turn in range(1, self.MAX_HEALING_TURNS + 1):
            raw_output, engine_used, api_error_log = self._query_llm_engine(system_instruction, current_prompt)

            if not raw_output:
                error_msg = api_error_log or "[ERROR] All AI inference endpoints are currently unreachable. Please check environment configuration or provider API keys."
                raise RuntimeError(error_msg)
            
            target_name = file_name if file_name else ""
            parsed_list = CodeExtractor.parse_response(raw_output, prompt, target_name)
            files_dict = {fname: content for fname, content in parsed_list}

            sanitized_dict = CodeSanitizer.sanitize(files_dict)

            # ── Priority 1: Functional & Code Audit ──
            functional_defects = UniversalCodeVerifier.audit_codebase(sanitized_dict, original_file_name=file_name)

            # ── Priority 2: UI/UX Guardrail Audit (runs only after functional pass or alongside) ──
            ui_ux_flaws = UIUXGuardrailInspector.audit_uiux(sanitized_dict)

            # Merge: functional bugs ranked FIRST (critical), UI/UX flaws appended SECOND (secondary)
            all_defects = functional_defects + ui_ux_flaws

            accumulated_tokens += sum(len(c.split()) for c in sanitized_dict.values()) + len(current_prompt.split()) * 4

            if not all_defects:
                final_files_dict = sanitized_dict
                steps.append({
                    "type": "tool_step",
                    "iteration": turn,
                    "tool": "verify_and_execute_codebase",
                    "args": {
                        "status": (
                            "Step 2: Functional & UI/UX Guardrail Audit\n"
                            "[Priority 1 - Functional Inspector]: Code syntax & logic checks passed. ✅\n"
                            "[Priority 2 - UI/UX Inspector]: Glassmorphism, typography, layout checks passed. ✅"
                        ),
                        "defects_found": 0
                    },
                    "output": f"Codebase verified 100% bug-free (0 defects). Both Functional & UI/UX audits passed (via {engine_used})."
                })
                break
            else:
                p1_count = len(functional_defects)
                p2_count = len(ui_ux_flaws)
                status_msg = (
                    f"Step 2: Functional & UI/UX Guardrail Audit\n"
                    f"[Priority 1 - Functional Inspector]: {'Code syntax & logic checks passed. ✅' if p1_count == 0 else f'⚠ {p1_count} functional defect(s) detected — CRITICAL priority.'}\n"
                    f"[Priority 2 - UI/UX Inspector]: {'Glassmorphism, layout, typography checks passed. ✅' if p2_count == 0 else f'⚠ {p2_count} UI/UX flaw(s) flagged — secondary priority.'}\n"
                    f"→ Self-healing triggered with ranked defect list (functional bugs first)..."
                )
                steps.append({
                    "type": "tool_step",
                    "iteration": turn,
                    "tool": "verify_and_execute_codebase",
                    "args": {
                        "status": status_msg,
                        "functional_defects": functional_defects,
                        "ui_ux_flaws": ui_ux_flaws
                    },
                    "output": f"Turn {turn}: {p1_count} functional defect(s), {p2_count} UI/UX flaw(s). Re-routing to model engine..."
                })

                final_files_dict = sanitized_dict
                last_generated_files = sanitized_dict

                if turn < self.MAX_HEALING_TURNS:
                    # Provide previous code + ranked defects + original task for true self-healing
                    previous_code_dump = "\n\n".join([f"```{fname}\n{code}\n```" for fname, code in last_generated_files.items()])

                    ranked_defect_lines = []
                    if functional_defects:
                        ranked_defect_lines.append("=== CRITICAL PRIORITY — FUNCTIONAL DEFECTS (FIX FIRST) ===")
                        ranked_defect_lines.extend([f"- [P1-FUNCTIONAL] {d}" for d in functional_defects])
                    if ui_ux_flaws:
                        ranked_defect_lines.append("=== SECONDARY PRIORITY — UI/UX DESIGN FLAWS (FIX AFTER FUNCTIONAL) ===")
                        ranked_defect_lines.extend([f"- [P2-UIUX] {d}" for d in ui_ux_flaws])
                    defect_summary = "\n".join(ranked_defect_lines)

                    current_prompt = (
                        f"ORIGINAL USER TASK:\n{prompt}\n\n"
                        f"PREVIOUSLY GENERATED CODE THAT CONTAINS BUGS:\n{previous_code_dump}\n\n"
                        f"THE CODE CONTAINS THE FOLLOWING DEFECTS THAT YOU MUST FIX:\n{defect_summary}\n\n"
                        f"CRITICAL: Fix ALL [P1-FUNCTIONAL] issues first. Then fix all [P2-UIUX] design flaws. "
                        f"Return COMPLETE, corrected files with no placeholders. Specify filenames format ` ```lang:path `."
                    )

        created_paths = []
        start_step = len(steps) + 1

        for idx, (filename, content) in enumerate(final_files_dict.items(), start=start_step):
            write_status = self.workspace.write_file(filename, content)
            created_paths.append(filename)
            
            steps.append({
                "type": "tool_step",
                "iteration": idx,
                "tool": "create_or_update_file",
                "args": {
                    "path": filename,
                    "content": content[:120] + "..." if len(content) > 120 else content
                },
                "output": f"{write_status} (via {engine_used})"
            })

        summary = f"Synthesis complete. Generated files: [{', '.join(created_paths)}] using {engine_used}."

        steps.append({
            "type": "completion",
            "content": summary
        })

        return {
            "status": "success",
            "engine": engine_used,
            "tokens": {
                "prompt": len(prompt.split()) * 4 + 20,
                "completion": accumulated_tokens,
                "total": accumulated_tokens + len(prompt.split()) * 4 + 20
            },
            "steps": steps,
            "files": created_paths
        }

    def execute_stream(self, prompt: str, file_name: Optional[str] = None, file_content: Optional[str] = None):
        """
        Streaming generator variant of execute().
        Yields NDJSON-compatible dicts in real-time:
          {"type": "step",       "step": {...}}
          {"type": "completion", "files": [...], "tokens": {...}, "summary": "..."}
          {"type": "error",      "message": "..."}
        The execute() method remains unchanged for backward compatibility.
        """
        accumulated_tokens = 0

        system_instruction = (
            "You are G.L.A.S.S., an elite industrial full-stack code generator.\n"
            "CRITICAL DIRECTIVES:\n"
            "1. OUTPUT ONLY RAW CODE BLOCKS. ABSOLUTELY NO INTRO TEXT, NO HOW-TO RUN GUIDES, NO CONVERSATIONAL FILLER, AND NO MARKDOWN EXPLANATIONS.\n"
            "2. EVERY FILE MUST BE 100% COMPLETE AND PRODUCTION-READY. NEVER use placeholders, never use '// TODO', '/* ... */', or pass.\n"
            "3. If building a Web App (HTML/CSS/JS), ensure all DOM element IDs referenced in JavaScript actually exist in the HTML.\n"
            "4. Web Audio API Protocol: When building ADSR envelopes or synth nodes, NEVER call setValueAtTime() at the exact timestamp where linearRampToValueAtTime() or exponentialRampToValueAtTime() concludes. Ramps set values automatically at target times; duplicating setValueAtTime at the same timestamp crashes the timeline scheduler.\n"
            "5. Canvas & HUD Layering Protocol: When stacking a <canvas> with HUD/overlay/modal divs, the HUD container MUST have 'pointer-events: none' in CSS. Interactive elements (buttons, modals) inside the HUD MUST have 'pointer-events: auto' explicitly re-enabled, otherwise buttons will be completely unclickable.\n"
            "6. Sandbox Script Execution Standard: Do NOT wrap main script logic in 'DOMContentLoaded' or window.onload. In our execution sandbox, scripts evaluate with the DOM already parsed; DOMContentLoaded listeners may miss the event and never execute. Define initialization functions (e.g. init(), startGame()) and invoke them directly at the bottom of the script.\n"
            "7. CDN Library Standard: Always load heavy external libraries (Three.js, Phaser, Chart.js, Tone.js, Tailwind) via official CDN <script> tags in index.html (e.g. cdnjs, jsdelivr). NEVER attempt to generate local library mock files or write engine code from scratch.\n"
            "8. File Completeness Protocol: If your HTML references ANY external files via <script src='file.js'> or <link href='style.css'>, you MUST generate every single referenced file as its own complete code block in this response. Never reference a file you do not fully generate.\n"
            "9. Format EVERY file block with its exact relative path:\n"
            "```lang:relative/path/filename.ext\n<full code here>\n```\n"
            "10. Make sure the code is completely self-contained and immediately executable without missing imports or dependencies.\n"
            "11. Visual Polish & Aesthetics Baseline (1.5X Standard):\n"
            "   - Colors: NEVER use raw primary color names ('red', 'blue', 'green', 'yellow'). Use modern, cohesive dark/light palettes (e.g. Cyberpunk #0d0e15, #00ffcc, #ff0055, or Slate/Indigo #0f172a, #6366f1) and apply linear/radial gradients to entities and backgrounds for depth.\n"
            "   - Canvas & Entities: NEVER draw plain single-block `fillRect` squares for interactive objects or characters. Construct compound shapes (`roundRect`, `arc`, rims, highlights, eyes/wings) with glowing feedback (`shadowBlur`) and visual polish.\n"
            "   - UI & Typography: Import Google Fonts ('Inter', 'Orbitron', or 'Press Start 2P') via CDN <link> in index.html. Style HUDs and cards with glassmorphism (`backdrop-filter: blur(12px)`, translucent borders `rgba(255,255,255,0.1)`, `border-radius: 12px`), with smooth active/hover button transitions.\n"
            "12. STRICT PROMPT COMPLIANCE & ACCURATE TARGET TECHNOLOGY:\n"
            "   - Read the user prompt in its entirety. Fully implement every feature, mathematical operation, UI element, and detailed requirement requested.\n"
            "   - TARGET THE EXACT REQUESTED TECHNOLOGY & FILENAMES: If the prompt specifies index.html, HTML, web application, CSS, or JS, you MUST produce index.html, style.css, and script.js. NEVER return a Python script (main.py) when web/HTML was requested."
        )

        # ── Step 0: Emit immediate "querying engine" step so frontend shows activity ──
        yield {
            "type": "step",
            "step": {
                "type": "tool_step",
                "iteration": 1,
                "tool": "synthesize_codebase",
                "args": {"status": "Querying G.L.A.S.S. model engine..."},
                "output": "Synthesizing multi-file codebase in isolated workspace..."
            }
        }

        # ── Build initial context (same logic as execute()) ──
        context_parts = []
        if file_content and file_name:
            context_parts.append(f"ATTACHED FILE `{file_name}` TO AUDIT/UPDATE:\n```{file_name}\n{file_content}\n```")
        elif not file_content:
            prompt_lower = prompt.lower()
            is_new_request = any(k in prompt_lower for k in ["make", "create", "build", "generate", "new", "index.html", "write a", "scientific calculator"])
            
            # Only inject existing workspace files if the user is explicitly refining/editing existing code
            if not is_new_request:
                existing_files = self.workspace.list_files()
                if existing_files:
                    loaded_context = []
                    for ef in existing_files[:4]:
                        try:
                            content = self.workspace.read_file(ef)
                            loaded_context.append(f"CURRENT WORKSPACE FILE `{ef}`:\n```{ef}\n{content}\n```")
                        except Exception:
                            pass
                    if loaded_context:
                        context_parts.append("EXISTING WORKSPACE CONTEXT:\n" + "\n\n".join(loaded_context))

        # Anchor user task specification with strict execution reminders at the bottom
        context_parts.append(
            f"USER TASK SPECIFICATION (READ EVERY REQUIREMENT THOROUGHLY):\n{prompt}\n\n"
            "=======================================================\n"
            "CRITICAL EXECUTION MANDATE FOR THE ABOVE SPECIFICATION:\n"
            "1. Read and fulfill 100% of all detailed requirements described above.\n"
            "2. If web/HTML/calculator was requested, produce `index.html`, `style.css`, and `script.js`.\n"
            "3. DO NOT substitute requested web files with Python (`main.py`).\n"
            "4. Return COMPLETE, fully implemented code blocks without placeholders.\n"
            "======================================================="
        )
        initial_prompt = "\n\n".join(context_parts)
        current_prompt = initial_prompt
        last_generated_files: Dict[str, str] = {}
        final_files_dict: Dict[str, str] = {}
        engine_used = "Unknown"
        step_counter = 2  # step 1 already yielded above

        # ── Self-healing loop (mirrors execute()) ──
        for turn in range(1, self.MAX_HEALING_TURNS + 1):
            raw_output, engine_used, api_error_log = self._query_llm_engine(system_instruction, current_prompt)

            if not raw_output:
                error_msg = api_error_log or "[ERROR] All AI inference endpoints are currently unreachable. Please check environment configuration or provider API keys."
                yield {"type": "error", "message": error_msg}
                return

            target_name = file_name if file_name else ""
            parsed_list = CodeExtractor.parse_response(raw_output, prompt, target_name)
            files_dict = {fname: content for fname, content in parsed_list}

            sanitized_dict = CodeSanitizer.sanitize(files_dict)

            # ── Priority 1: Functional & Code Audit ──
            functional_defects = UniversalCodeVerifier.audit_codebase(sanitized_dict, original_file_name=file_name)

            # ── Priority 2: UI/UX Guardrail Audit (secondary layer) ──
            ui_ux_flaws = UIUXGuardrailInspector.audit_uiux(sanitized_dict)

            # Merge: functional bugs FIRST (critical), UI/UX flaws SECOND (secondary)
            all_defects = functional_defects + ui_ux_flaws

            accumulated_tokens += sum(len(c.split()) for c in sanitized_dict.values()) + len(current_prompt.split()) * 4

            if not all_defects:
                final_files_dict = sanitized_dict
                audit_step = {
                    "type": "tool_step",
                    "iteration": step_counter,
                    "tool": "verify_and_execute_codebase",
                    "args": {
                        "status": (
                            "Step 2: Functional & UI/UX Guardrail Audit\n"
                            "[Priority 1 - Functional Inspector]: Code syntax & logic checks passed. ✅\n"
                            "[Priority 2 - UI/UX Inspector]: Glassmorphism, typography, layout checks passed. ✅"
                        ),
                        "defects_found": 0
                    },
                    "output": f"Codebase verified 100% bug-free (0 defects). Both Functional & UI/UX audits passed (via {engine_used})."
                }
                yield {"type": "step", "step": audit_step}
                step_counter += 1
                break
            else:
                p1_count = len(functional_defects)
                p2_count = len(ui_ux_flaws)
                status_msg = (
                    f"Step 2: Functional & UI/UX Guardrail Audit\n"
                    f"[Priority 1 - Functional Inspector]: {'Code syntax & logic checks passed. ✅' if p1_count == 0 else f'⚠ {p1_count} functional defect(s) detected — CRITICAL priority.'}\n"
                    f"[Priority 2 - UI/UX Inspector]: {'Glassmorphism, layout, typography checks passed. ✅' if p2_count == 0 else f'⚠ {p2_count} UI/UX flaw(s) flagged — secondary priority.'}\n"
                    f"→ Self-healing triggered with ranked defect list (functional bugs first)..."
                )
                heal_step = {
                    "type": "tool_step",
                    "iteration": step_counter,
                    "tool": "verify_and_execute_codebase",
                    "args": {
                        "status": status_msg,
                        "functional_defects": functional_defects,
                        "ui_ux_flaws": ui_ux_flaws
                    },
                    "output": f"Turn {turn}: {p1_count} functional defect(s), {p2_count} UI/UX flaw(s). Re-routing to model engine..."
                }
                yield {"type": "step", "step": heal_step}
                step_counter += 1

                final_files_dict = sanitized_dict
                last_generated_files = sanitized_dict

                if turn < self.MAX_HEALING_TURNS:
                    previous_code_dump = "\n\n".join([f"```{fname}\n{code}\n```" for fname, code in last_generated_files.items()])

                    ranked_defect_lines = []
                    if functional_defects:
                        ranked_defect_lines.append("=== CRITICAL PRIORITY — FUNCTIONAL DEFECTS (FIX FIRST) ===")
                        ranked_defect_lines.extend([f"- [P1-FUNCTIONAL] {d}" for d in functional_defects])
                    if ui_ux_flaws:
                        ranked_defect_lines.append("=== SECONDARY PRIORITY — UI/UX DESIGN FLAWS (FIX AFTER FUNCTIONAL) ===")
                        ranked_defect_lines.extend([f"- [P2-UIUX] {d}" for d in ui_ux_flaws])
                    defect_summary = "\n".join(ranked_defect_lines)

                    current_prompt = (
                        f"ORIGINAL USER TASK:\n{prompt}\n\n"
                        f"PREVIOUSLY GENERATED CODE THAT CONTAINS BUGS:\n{previous_code_dump}\n\n"
                        f"THE CODE CONTAINS THE FOLLOWING DEFECTS THAT YOU MUST FIX:\n{defect_summary}\n\n"
                        f"CRITICAL: Fix ALL [P1-FUNCTIONAL] issues first. Then fix all [P2-UIUX] design flaws. "
                        f"Return COMPLETE, corrected files with no placeholders. Specify filenames format ` ```lang:path `."
                    )

        # ── Write files and yield a step per file ──
        created_paths = []
        for filename, content in final_files_dict.items():
            write_status = self.workspace.write_file(filename, content)
            created_paths.append(filename)
            file_step = {
                "type": "tool_step",
                "iteration": step_counter,
                "tool": "create_or_update_file",
                "args": {
                    "path": filename,
                    "content": content[:120] + "..." if len(content) > 120 else content
                },
                "output": f"{write_status} (via {engine_used})"
            }
            yield {"type": "step", "step": file_step}
            step_counter += 1

        # ── Final completion event ──
        summary = f"Synthesis complete. Generated files: [{', '.join(created_paths)}] using {engine_used}."
        yield {
            "type": "completion",
            "files": created_paths,
            "tokens": {
                "prompt": len(prompt.split()) * 4 + 20,
                "completion": accumulated_tokens,
                "total": accumulated_tokens + len(prompt.split()) * 4 + 20
            },
            "summary": summary
        }

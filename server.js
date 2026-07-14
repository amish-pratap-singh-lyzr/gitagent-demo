#!/usr/bin/env node
// Local test UI for gap-pr-reviewer.
//
// Runs a REAL claude -p session against this repo's compiled persona,
// with the read-only github MCP server (mcp-servers/github-readonly) and
// the security-scanner sub-agent wired in, and relays the actual
// stream-json events (text, tool calls, sub-agent delegation) to the
// browser over SSE as they happen — nothing here is simulated.
//
// Posting a comment to GitHub is a separate, explicit action
// (POST /api/post-comment) that this server performs directly — the agent
// itself never gets a write-capable tool. See DUTIES.md.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = process.env.PORT || 4173;
const REPO_ROOT = __dirname;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("GITHUB_TOKEN is not set — source .env first: `set -a; source .env; set +a`");
  process.exit(1);
}

// ---- compile the persona + sub-agent prompt once at startup ----------

function sh(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: REPO_ROOT });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`${cmd} ${args.join(" ")} exited ${code}: ${err}`));
      else resolve(out);
    });
  });
}

let SYSTEM_PROMPT = null;
let AGENTS_JSON = null;

async function compilePersona() {
  const tmpOut = path.join(REPO_ROOT, ".compiled-persona.tmp");
  await sh("gitagent", ["export", "-f", "claude-code", "-d", REPO_ROOT, "-o", tmpOut]);
  const raw = fs.readFileSync(tmpOut, "utf8");
  fs.unlinkSync(tmpOut);
  SYSTEM_PROMPT = raw.split("# === .mcp.json ===")[0]
    .replace("# === CLAUDE.md ===\n", "")
    .trim();

  const soul = fs.readFileSync(path.join(REPO_ROOT, "agents/security-scanner/SOUL.md"), "utf8");
  const duties = fs.readFileSync(path.join(REPO_ROOT, "agents/security-scanner/DUTIES.md"), "utf8");
  AGENTS_JSON = JSON.stringify({
    "security-scanner": {
      description:
        "Scans PR diffs for security-sensitive changes (auth, secrets, injection surfaces, deserialization) and reports findings. Never approves/rejects.",
      prompt: soul + "\n\n" + duties,
    },
  });
  console.log("Persona compiled:", SYSTEM_PROMPT.length, "chars");
}

// ---- SSE relay of a real claude -p run --------------------------------

const ALLOWED_TOOLS =
  "Task mcp__github__get_pull_request mcp__github__get_pull_request_diff mcp__github__list_pull_request_files";

function runReview(repo, pullNumber, extra, onEvent, onChild) {
  return new Promise((resolve, reject) => {
    const prompt =
      `Review PR #${pullNumber} on ${repo}. Use get_pull_request and get_pull_request_diff ` +
      `(and list_pull_request_files if useful) to read it, then follow the code-review skill ` +
      `and give your verdict with specific, actionable comments.` +
      (extra ? `\n\nAdditional instruction from the requester: ${extra}` : "");

    const args = [
      "-p",
      prompt,
      "--mcp-config",
      path.join(REPO_ROOT, ".mcp.json"),
      "--strict-mcp-config",
      "--system-prompt",
      SYSTEM_PROMPT,
      "--agents",
      AGENTS_JSON,
      "--tools",
      "Task",
      "--allowedTools",
      ALLOWED_TOOLS,
      "--output-format",
      "stream-json",
      "--verbose",
      "--no-session-persistence",
      "--max-budget-usd",
      "2",
    ];

    const child = spawn("claude", args, {
      cwd: REPO_ROOT,
      env: { ...process.env },
    });
    if (onChild) onChild(child);

    // Stack of open Task/Agent tool_use ids, so nested sub-agent events
    // can be attributed correctly in the UI.
    const subagentStack = [];
    let finalText = "";
    let buf = "";

    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      let idx;
      while ((idx = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (!line.trim()) continue;
        handleLine(line);
      }
    });

    function currentAgent() {
      return subagentStack.length
        ? subagentStack[subagentStack.length - 1].subagent_type
        : "gap-pr-reviewer";
    }

    function handleLine(line) {
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        return;
      }

      if (ev.type === "assistant") {
        for (const block of ev.message?.content || []) {
          if (block.type === "text" && block.text) {
            onEvent({ type: "text", agent: currentAgent(), text: block.text });
            if (!subagentStack.length) finalText += block.text;
          } else if (block.type === "tool_use") {
            if (block.name === "Agent" || block.name === "Task") {
              subagentStack.push({ id: block.id, subagent_type: block.input?.subagent_type || "general-purpose" });
              onEvent({
                type: "subagent_start",
                subagent_type: block.input?.subagent_type || "general-purpose",
                description: block.input?.description || "",
              });
            } else {
              onEvent({
                type: "tool_call",
                agent: currentAgent(),
                tool: block.name,
                input: block.input,
              });
            }
          }
        }
      } else if (ev.type === "user") {
        for (const block of ev.message?.content || []) {
          if (block && block.type === "tool_result") {
            const closed = subagentStack.length && subagentStack[subagentStack.length - 1].id === block.tool_use_id;
            if (closed) {
              subagentStack.pop();
              onEvent({ type: "subagent_end" });
            } else {
              onEvent({ type: "tool_result", agent: currentAgent() });
            }
          }
        }
      } else if (ev.type === "result") {
        onEvent({ type: "status", message: ev.subtype === "success" ? "Review complete" : `Ended: ${ev.subtype}` });
      }
    }

    child.stderr.on("data", (d) => onEvent({ type: "log", message: d.toString() }));

    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`claude exited with code ${code}`));
      else resolve(finalText);
    });
  });
}

// ---- posting a comment for real — the ONLY write path, human-triggered ---

async function postComment(repo, pullNumber, body) {
  const res = await fetch(`https://api.github.com/repos/${repo}/issues/${pullNumber}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "gap-pr-reviewer-ui",
    },
    body: JSON.stringify({ body }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

// ---- HTTP server -------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/") {
    const html = fs.readFileSync(path.join(REPO_ROOT, "public/index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/review") {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", async () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400);
        return res.end("bad json");
      }
      const { repo, pullNumber, message } = payload;

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      let ended = false;
      const send = (obj) => {
        if (!ended) res.write(`data: ${JSON.stringify(obj)}\n\n`);
      };
      let child = null;
      req.on("close", () => {
        ended = true;
        if (child && !child.killed) child.kill();
      });

      try {
        send({ type: "status", message: `Reviewing PR #${pullNumber} on ${repo}...` });
        const finalText = await runReview(repo, pullNumber, message, send, (c) => (child = c));
        send({ type: "review_ready", text: finalText, repo, pullNumber });
      } catch (e) {
        send({ type: "error", message: e.message });
      }
      if (!ended) res.end();
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/post-comment") {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", async () => {
      try {
        const { repo, pullNumber, text } = JSON.parse(body);
        const result = await postComment(repo, pullNumber, text);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, url: result.html_url }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

compilePersona()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`gap-pr-reviewer test UI: http://localhost:${PORT}`);
    });
  })
  .catch((e) => {
    console.error("Failed to compile persona:", e);
    process.exit(1);
  });

#!/usr/bin/env node
// Read-only GitHub MCP server for gap-pr-reviewer.
//
// Deliberately exposes ONLY read operations (get PR, get diff, list files).
// There is no create_review_comment / create_pull_request_review tool here
// on purpose: this agent proposes a review, a human confirms and posts it
// via the UI's own direct call to GitHub — see RULES.md / DUTIES.md for why
// (segregation of duties: this agent holds `reviewer`, never `merger`).

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const TOKEN = process.env.GITHUB_TOKEN;

async function gh(path, accept = "application/vnd.github+json") {
  if (!TOKEN) throw new Error("GITHUB_TOKEN is not set");
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: accept,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gap-pr-reviewer",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${text.slice(0, 500)}`);
  return { text, contentType: res.headers.get("content-type") || "" };
}

const server = new McpServer({ name: "github-readonly", version: "1.0.0" });

server.tool(
  "get_pull_request",
  "Get a pull request's title, description, author, and base/head branches",
  { repo: z.string().describe("owner/repo"), pull_number: z.number() },
  async ({ repo, pull_number }) => {
    const { text } = await gh(`/repos/${repo}/pulls/${pull_number}`);
    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "get_pull_request_diff",
  "Get the unified diff for a pull request",
  { repo: z.string().describe("owner/repo"), pull_number: z.number() },
  async ({ repo, pull_number }) => {
    const { text } = await gh(
      `/repos/${repo}/pulls/${pull_number}`,
      "application/vnd.github.v3.diff"
    );
    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "list_pull_request_files",
  "List the files changed in a pull request, with per-file patch/status",
  { repo: z.string().describe("owner/repo"), pull_number: z.number() },
  async ({ repo, pull_number }) => {
    const { text } = await gh(`/repos/${repo}/pulls/${pull_number}/files`);
    return { content: [{ type: "text", text }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

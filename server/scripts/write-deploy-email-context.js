#!/usr/bin/env node
/**
 * CI only: writes deploy-email-context.json in cwd (repo root on GitHub Actions).
 * Env: COMMIT_MSG, plus optional DEPLOY_* overrides; GITHUB_SHA set by Actions.
 */

const fs = require("fs");
const path = require("path");

const outName = process.env.DEPLOY_EMAIL_CONTEXT_OUT || "deploy-email-context.json";
const outPath = path.resolve(process.cwd(), outName);

const sha = process.env.GITHUB_SHA || process.env.DEPLOY_GIT_SHA || "";
const ctx = {
  sha,
  shortSha: sha.length >= 7 ? sha.slice(0, 7) : sha,
  ref: process.env.DEPLOY_GIT_REF || process.env.GITHUB_REF_NAME || "",
  repository: process.env.DEPLOY_REPOSITORY || "",
  runId: process.env.DEPLOY_RUN_ID || "",
  workflow: process.env.DEPLOY_WORKFLOW || "",
  actor: process.env.DEPLOY_ACTOR || "",
  commitMessage:
    process.env.COMMIT_MSG ||
    process.env.DEPLOY_COMMIT_MESSAGE ||
    "(No commit message in this run — e.g. manual workflow_dispatch or re-run.)",
  runUrl: process.env.DEPLOY_RUN_URL || "",
  generatedAt: new Date().toISOString(),
};

fs.writeFileSync(outPath, JSON.stringify(ctx, null, 2), "utf8");
console.log("Wrote", outPath);

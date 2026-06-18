import { Router } from "express";
import path from "node:path";
import { spawn } from "node:child_process";
import fs from "node:fs";

const router = Router();

const workspaceRoot = (() => {
  let dir = process.cwd();
  while (dir !== "/" && !fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    dir = path.dirname(dir);
  }
  return dir;
})();

const SOURCE_DIRS = [
  "artifacts/cipherlock",
  "artifacts/api-server",
  "lib/db",
  "lib/api-spec",
  "lib/api-client-react",
  "lib/api-zod",
];

const ROOT_FILES = [
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "tsconfig.base.json",
];

router.get("/download/source", (_req, res) => {
  const excludePatterns = [
    "--exclude=*/node_modules",
    "--exclude=*/dist",
    "--exclude=*/.tsbuildinfo",
    "--exclude=*/.tsbuildinfo.*",
    "--exclude=*/pnpm-lock.yaml",
  ];

  const include = [
    ...SOURCE_DIRS.filter((d) => fs.existsSync(path.join(workspaceRoot, d))),
    ...ROOT_FILES.filter((f) => fs.existsSync(path.join(workspaceRoot, f))),
  ];

  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", 'attachment; filename="cipherlock-source.tar.gz"');

  const tar = spawn("tar", [
    "-czf", "-",
    ...excludePatterns,
    ...include,
  ], { cwd: workspaceRoot });

  tar.stdout.pipe(res);

  tar.stderr.on("data", () => {});

  tar.on("close", (code) => {
    if (code !== 0 && !res.headersSent) {
      res.status(500).json({ error: "Failed to create archive" });
    }
  });
});

export default router;

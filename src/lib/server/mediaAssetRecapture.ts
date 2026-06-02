import { spawn } from 'child_process';
import path from 'path';
import { getRecaptureSummary } from '@/lib/marketing/mediaAssetTypes';

const REPO_ROOT = process.cwd();
const RECAPTURE_SCRIPT = path.join(REPO_ROOT, 'scripts', 'recapture-media-asset.mjs');

export type RecapturePlan = {
  script: string;
  args: string[];
  summary: string;
};

export function getRecapturePlan(relPath: string): RecapturePlan | null {
  const summary = getRecaptureSummary(relPath);
  if (!summary) return null;
  const normalized = relPath.replace(/\\/g, '/');
  return {
    script: RECAPTURE_SCRIPT,
    args: [`--path=${normalized}`],
    summary,
  };
}

export function runMediaAssetRecapture(relPath: string): Promise<{
  ok: boolean;
  exitCode: number;
  output: string;
}> {
  const plan = getRecapturePlan(relPath);
  if (!plan) {
    return Promise.resolve({
      ok: false,
      exitCode: 1,
      output: `No recapture recipe for ${relPath}`,
    });
  }

  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const child = spawn(isWin ? 'node.exe' : 'node', [plan.script, ...plan.args], {
      cwd: REPO_ROOT,
      shell: false,
      env: process.env,
    });

    let output = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.on('close', (code) => {
      const exitCode = code ?? 1;
      resolve({
        ok: exitCode === 0,
        exitCode,
        output: output.slice(-4000),
      });
    });

    child.on('error', (err) => {
      resolve({
        ok: false,
        exitCode: 1,
        output: err.message,
      });
    });
  });
}

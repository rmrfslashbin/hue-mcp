#!/usr/bin/env tsx
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

interface BuildInfo {
  timestamp: string;
  gitCommit: string;
  gitTag?: string;
  gitBranch: string;
  gitDirty: boolean;
  nodeVersion: string;
  npmVersion: string;
  environment: string;
}

function execCommand(command: string): string {
  try {
    return execSync(command, { cwd: projectRoot, encoding: 'utf-8' }).trim();
  } catch (error) {
    return '';
  }
}

function generateBuildInfo(): BuildInfo {
  // Get git information
  const gitCommit = execCommand('git rev-parse HEAD');
  const gitCommitShort = execCommand('git rev-parse --short HEAD');
  const gitTag = execCommand('git describe --tags --exact-match 2>/dev/null');
  const gitBranch = execCommand('git rev-parse --abbrev-ref HEAD');
  const gitStatus = execCommand('git status --porcelain');
  const gitDirty = gitStatus.length > 0;

  // Get Node.js and npm versions
  const nodeVersion = process.version;
  const npmVersion = execCommand('npm --version');

  // Build timestamp
  const timestamp = new Date().toISOString();

  // Environment
  const environment = process.env.NODE_ENV || 'production';

  const buildInfo: BuildInfo = {
    timestamp,
    gitCommit: gitCommitShort || gitCommit,
    gitTag: gitTag || undefined,
    gitBranch,
    gitDirty,
    nodeVersion,
    npmVersion,
    environment,
  };

  return buildInfo;
}

function main() {
  console.log('📊 Generating build information...');
  
  const buildInfo = generateBuildInfo();
  
  // Create output directories
  const srcOutputDir = join(projectRoot, 'src', 'generated');
  const distOutputDir = join(projectRoot, 'dist', 'generated');
  
  mkdirSync(srcOutputDir, { recursive: true });
  mkdirSync(distOutputDir, { recursive: true });
  
  // Write build info to both src and dist
  const buildInfoJson = JSON.stringify(buildInfo, null, 2);
  const srcOutputPath = join(srcOutputDir, 'build-info.json');
  const distOutputPath = join(distOutputDir, 'build-info.json');
  
  writeFileSync(srcOutputPath, buildInfoJson);
  writeFileSync(distOutputPath, buildInfoJson);
  
  console.log('✅ Build info generated:');
  console.log('  Source:', srcOutputPath);
  console.log('  Dist:', distOutputPath);
  console.log(JSON.stringify(buildInfo, null, 2));
}

main();
import { execSync } from 'child_process';

function sanitizeName(name: string): string {
  if (!/^[a-zA-Z0-9\-_]+$/.test(name)) {
    throw new Error(`Session name contains invalid characters: ${name}`);
  }
  return name;
}

export function launchNewSession(name: string): void {
  const safeName = sanitizeName(name);
  execSync(
    `osascript -e 'tell application "Terminal"' -e 'activate' -e 'do script "claude -n ${safeName}"' -e 'end tell'`
  );
}

export function resumeSession(name: string): void {
  const safeName = sanitizeName(name);
  execSync(
    `osascript -e 'tell application "Terminal"' -e 'activate' -e 'do script "claude --resume ${safeName}"' -e 'end tell'`
  );
}

import { execFileSync } from 'child_process';

function validateUUID(id: string): string {
  if (!/^[0-9a-f-]+$/i.test(id)) {
    throw new Error(`Invalid session ID: ${id}`);
  }
  return id;
}

// Escape double quotes and backslashes for use inside an AppleScript double-quoted string
function escapeForAppleScript(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function osascript(command: string): void {
  execFileSync('osascript', [
    '-e', 'tell application "Terminal"',
    '-e', 'activate',
    '-e', `do script "${command}"`,
    '-e', 'end tell',
  ]);
}

export function launchNewSession(sessionId: string, folderPath: string): void {
  const safeId = validateUUID(sessionId);
  const safeFolder = escapeForAppleScript(folderPath);
  osascript(`cd '${safeFolder}' && claude --session-id ${safeId}`);
}

export function resumeSession(sessionId: string, folderPath: string): void {
  const safeId = validateUUID(sessionId);
  const safeFolder = escapeForAppleScript(folderPath);
  osascript(`cd '${safeFolder}' && claude --resume ${safeId}`);
}

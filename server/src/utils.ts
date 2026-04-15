const UUID_REGEX = /^[0-9a-f-]+$/i;

export function validateUUID(id: string): string {
  if (!UUID_REGEX.test(id)) throw new Error(`Invalid session ID: ${id}`);
  return id;
}

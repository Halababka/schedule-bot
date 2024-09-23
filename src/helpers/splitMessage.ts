export function splitMessage(message: string, limit: number = 4096): string[] {
  const parts = [];
  while (message.length > limit) {
    const chunk = message.substring(0, limit);
    const lastIndex = chunk.lastIndexOf('\n'); // Попробуйте не разрывать строки
    parts.push(chunk.substring(0, lastIndex));
    message = message.substring(lastIndex + 1);
  }
  parts.push(message);
  return parts;
}
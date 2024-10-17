export function logWithTimestamp(message: unknown, ...additionalArgs: unknown[]): void {
    const formattedDate = new Date().toLocaleString(); // You can customize options if needed

    console.log(`[${formattedDate}] ${message}`, ...additionalArgs);
}
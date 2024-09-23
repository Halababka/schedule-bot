export function formatDate(date: Date) {
    const options = {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, // 24-часовой формат
    };
    // @ts-ignore
    return date.toLocaleString('ru-RU', options)
}
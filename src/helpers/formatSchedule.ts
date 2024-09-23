export function formatSchedule(scheduleData: any) {
  let result = '';

  scheduleData.forEach((day: any) => {
    result += `📅 ${day.day}:\n`;
    result += `________________________\n\n`;

    day.lessons.forEach((lesson: any) => {
      result += `🕒 Время: ${lesson.time}\n`;
      result += `📘 Тип: ${lesson.type}\n`;
      result += `📚 Предмет: ${lesson.subject}\n`;
      result += `👨‍🏫 Преподаватель: ${lesson.teacher}\n`;
      result += `🏫 Аудитория: ${lesson.room}\n\n`;
    });
  });

  return result.trim(); // Убираем лишние пробелы в конце
}
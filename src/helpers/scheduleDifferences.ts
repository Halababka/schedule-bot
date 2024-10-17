import {DaySchedule} from "../../classes/Schedule";

export function getScheduleDifferences(oldSchedule: DaySchedule[], newSchedule: DaySchedule[]): DaySchedule[] {
    const differences: DaySchedule[] = [];

    // Проходим по каждому дню нового расписания
    for (let i = 0; i < newSchedule.length; i++) {
        const newDay = newSchedule[i];
        const oldDay = oldSchedule.find(day => day.day === newDay.day);

        const changedLessons = [];

        // Если для этого дня есть старые данные, проверяем уроки
        if (oldDay) {
            for (const newLesson of newDay.lessons) {
                const oldLesson = oldDay.lessons.find(
                    lesson => lesson.time === newLesson.time // Совпадает ли время урока
                );

                // Если урок новый или отличается от старого
                if (!oldLesson || JSON.stringify(oldLesson) !== JSON.stringify(newLesson)) {
                    changedLessons.push(newLesson);
                }
            }
        } else {
            // Если в старом расписании нет этого дня, добавляем все уроки как измененные
            changedLessons.push(...newDay.lessons);
        }

        // Если есть изменения в уроках, добавляем этот день с измененными уроками в результат
        if (changedLessons.length > 0) {
            differences.push({
                day: newDay.day,
                lessons: changedLessons
            });
        }
    }

    return differences;
}
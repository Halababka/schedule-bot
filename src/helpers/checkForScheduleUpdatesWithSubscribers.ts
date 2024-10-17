import {prisma} from "../../prisma/prisma";
import logger from "../utils/logger";
import {Schedule} from "../../classes/Schedule";
import crypto from "crypto";
import {getScheduleDifferences} from "./scheduleDifferences";
import {notifyScheduleUsers} from "./notifyScheduleUsers";

export async function checkForScheduleUpdatesWithSubscribers() {
    // Получаем все расписания из базы данных
    const schedules = await prisma.schedule.findMany({
        include: {
            user: true, // Включаем связанных пользователей
        },
    });

    // Фильтруем расписания, оставляя только те, у которых есть хотя бы один пользователь
    // const currentScheduleData = schedules.filter(schedule => schedule.user.length > 0);

    for (const schedule of schedules) {
        logger.debug(`Проверяется группа: ${schedule.name}`)
        // Получаем актуальные данные по расписанию
        const fetchedSchedule = new Schedule();
        const scheduleData = await fetchedSchedule.fetchSchedule(schedule.url, 5, true);

        if (scheduleData) {
            // Генерируем хэш-сумму для текущего расписания
            const currentChecksum = crypto
                .createHash('md5')
                .update(JSON.stringify(scheduleData))
                .digest('hex');

            // Сравниваем с предыдущей хэш-суммой
            if (schedule.checksum !== currentChecksum) {
                logger.debug(`Хэш-сумма отличается от имеющейся в БД, обновление группы: ${schedule.name}`)

                const changes = getScheduleDifferences(JSON.parse(schedule.schedule), scheduleData);

                // Если хэш-сумма изменилась, обновляем базу данных
                await prisma.schedule.update({
                    where: {id: schedule.id},
                    data: {
                        checksum: currentChecksum,
                        schedule: JSON.stringify(scheduleData),
                    },
                });

                // Уведомляем пользователей об изменении
                await notifyScheduleUsers(schedule.id, changes);
            }
        }
    }
}
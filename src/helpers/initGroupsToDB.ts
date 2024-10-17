import { GroupsObject } from "../../classes/GroupsObject";
import { scheduleService } from "../services/schedule.service";
import { Schedule } from "../../classes/Schedule"; // Класс для парсинга расписания
import crypto from "crypto";

let groupsObject: GroupsObject
const url = process.env.RSS_URL;

async function initializeGroups() {
    if (url) {
        try {
            groupsObject = new GroupsObject(url);
            console.log("Groups object initialized successfully.");
        } catch (error) {
            console.error("Error initializing groups object:", error);
        }
    } else {
        throw new Error("Ссылка для поиска групп не найдена");
    }
}

async function createSchedule(groupName: string, groupUrl: string) {
    const scheduleParser = new Schedule(); // Создаем объект Schedule для парсинга
    const parsedSchedule = await scheduleParser.fetchSchedule(groupUrl); // Получаем и парсим расписание

    if (parsedSchedule) {
        const scheduleString = JSON.stringify(parsedSchedule); // Преобразуем расписание в строку JSON

        // Вычисляем checksum для расписания
        const checksum = crypto.createHash("md5").update(scheduleString).digest("hex");

        // Создаем запись в базе данных с помощью Prisma
        try {
            const newSchedule = await scheduleService.createSchedule({
                name: groupName, // Имя группы
                url: groupUrl,   // URL группы
                checksum: checksum, // Вычисленный чек-сум
                schedule: scheduleString, // Строка расписания
            });
            console.log("Schedule created successfully:", newSchedule);
        } catch (error) {
            console.error("Error creating schedule:", error);
        }
    } else {
        console.error("Failed to parse schedule for group:", groupName);
    }
}

// Пример создания расписания для всех групп
async function createSchedulesForAllGroups() {
    const allGroupsWithLink = groupsObject.getAllGroupsAndLink(); // Получение всех групп с ссылками
    for (const group of allGroupsWithLink) {
        await createSchedule(group.group, group.url);
    }
}

// Главная функция для инициализации и создания расписаний
async function main() {
    try {
        // Дождаться инициализации групп
        await initializeGroups();

        // Создать расписания после инициализации
        await createSchedulesForAllGroups();

        console.log("COMPLETE");
    } catch (error) {
        console.error("Error in main flow:", error);
    }
}

// Запуск главной функции
main();

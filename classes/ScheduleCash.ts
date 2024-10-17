import {DaySchedule} from "./Schedule";
import logger from "../src/utils/logger";

export class ScheduleCache {
    private cache: { [url: string]: { data: DaySchedule[], lastUpdate: Date } } = {};
    private cacheTTL = 2000; // Время жизни кэша: 2 минуты (в миллисекундах)

    constructor() {
        // Настраиваем таймер для очистки устаревших данных каждые 30 минут
        setInterval(() => {
            this.cleanupCache();
        }, 30 * 60 * 1000); // 30 минут (в миллисекундах)
    }

    // Метод для получения кэшированных данных
    get(url: string): DaySchedule[] | null {
        const cachedEntry = this.cache[url];
        if (!cachedEntry) return null;

        const now = new Date();
        const cacheAgeMinutes = (now.getTime() - cachedEntry.lastUpdate.getTime()) / (1000 * 60);

        // Проверяем, не устарели ли данные (В минутах)
        if (cacheAgeMinutes < this.cacheTTL) {
            return cachedEntry.data;
        } else {
            // Если данные устарели, удаляем их из кэша
            delete this.cache[url];
            return null;
        }
    }

    // Метод для добавления данных в кэш
    set(url: string, data: DaySchedule[]): void {
        this.cache[url] = {
            data,
            lastUpdate: new Date(),
        };
    }

    // Метод для очистки устаревших данных из кэша
    private cleanupCache() {
        const now = new Date();
        for (const url in this.cache) {
            const cacheAge = now.getTime() - this.cache[url].lastUpdate.getTime();

            // Удаляем записи старше cacheTTL минут
            if (cacheAge >= this.cacheTTL) {
                delete this.cache[url];
                logger.debug(`Cache entry for URL ${url} removed due to expiration.`);
            }
        }
    }
}
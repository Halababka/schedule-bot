import {createLogger, format, transports} from 'winston';
import {join} from 'path';
import * as fs from 'fs';

// Создаем директорию logs, если она не существует
const logsDir = join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Форматирование логов
const logFormat = format.printf(({timestamp, level, message}) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    database: 6,
    debug: 4,
    silly: 5,
};

// Инициализация логгера
const logger = createLogger({
    levels: logLevels,
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}), // Добавляем время
        logFormat // Формат вывода
    ),
    transports: [
        // Вывод в консоль
        new transports.Console(),
        // Логирование в файл all.log
        new transports.File({filename: join(logsDir, 'all.log')}),
        // Логирование ошибок в отдельный файл
        new transports.File({filename: join(logsDir, 'error.log'), level: 'error'}),
        // new transports.File({filename: join(logsDir, 'database.log'), level: 'database'})
    ]
});

export const dataBaseLogger = createLogger({
    levels: logLevels,
    level: "database",
    format: format.combine(
        format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}), // Добавляем время
        logFormat // Формат вывода
    ),
    transports: [
        // Вывод в консоль
        // new transports.Console(),
        // Логирование в файл database.log
        new transports.File({filename: join(logsDir, 'database.log'), level: 'database'})
    ]
})

// Экспортируем логгер для использования в проекте
export default logger;

// groupsObject.js
import {fetchRSSFeed} from "../src/helpers/fetchRSSFeed";

interface Group {
    [groupName: string]: string; // Имя группы и ссылка
}

interface Section {
    [sectionTitle: string]: Group; // Заголовок раздела и группы
}

interface Groups {
    [title: string]: Section; // Заголовок и соответствующие разделы
}

export class GroupsObject {
    groups: Groups
    lastUpdateTime: Date | null

    constructor() {
        this.groups = {};
        this.lastUpdateTime = null
    }

    async initializeGroupsObject(url: string, force: boolean = false) {
        if (!this.lastUpdateTime || Object.keys(this.groups).length === 0 || force) {
            await this.fetchSchedule(url)

            console.log("bot fetch rss")
        } else {
            console.log("bot not fetch rss, use local groups")
            if (this.daysDifferent()) {
                await this.fetchSchedule(url)
            }
        }
    }

    daysDifferent() {
        if (this.lastUpdateTime) {
            const currentDate = new Date()
            const timeDifferent = currentDate.getTime() - this.lastUpdateTime.getTime()
            const daysDifferent = Math.floor(timeDifferent / (1000 * 60 * 60 * 24));
            return daysDifferent > 0
        } else {
            return true
        }
    }

    async fetchSchedule(url: string) {
        try {
            const feed = await fetchRSSFeed(url);

            if (feed) {
                this.parseRSSItems(feed)
            }

            this.lastUpdateTime = new Date()
        } catch {
        }
    }

    // Метод для получения заголовков (например, "Техникум", "Институт")
    getTitle(): string[] {
        return Object.keys(this.groups);
    }

    // Метод для получения разделов внутри заголовка (например, для "Техникум" - "1 отделение", "2 отделение")
    getSection(title: string): string[] | null {
        if (this.groups[title]) {
            return Object.keys(this.groups[title]);
        }
        return null; // Если такого заголовка нет, возвращаем null
    }

    // Метод для получения групп внутри раздела (например, для "1 отделение" - "АЭС-21-Т", "АЭСс-22-Т")
    getScheduleItem(title: string, section: string): Group | null {
        if (this.groups[title] && this.groups[title][section]) {
            return this.groups[title][section];
        }
        return null; // Если не найден заголовок или раздел, возвращаем null
    }

    getGroupLink(title: string, section: string, group: string) {
        if (this.groups[title][section][group]) {
            return this.groups[title][section][group];
        }
        return null; // Если не найден заголовок или раздел, возвращаем null
    }

    generateKeyboard(path = []) {
        const currentLevel = this.getLevel(path);

        // Создаем кнопки для текущего уровня
        const keyboard = Object.keys(currentLevel).map(key => {
            const data = JSON.stringify([...path, key]);

            // Проверяем длину callback_data
            if (Buffer.byteLength(data, 'utf8') > 64) {
                console.warn(`Callback data too long: ${data}`);
                return null;
            }

            return [{
                text: key,
                callback_data: data
            }];
        }).filter(button => button !== null); // Убираем кнопки с некорректными данными

        // Добавляем кнопку "Назад", если мы не на корневом уровне
        if (path.length > 0) {
            console.log("path", path)
            const backButtonData = JSON.stringify(path.slice(0, -1));

            // Проверяем длину callback_data для кнопки "Назад"
            if (Buffer.byteLength(backButtonData, 'utf8') <= 64) {
                keyboard.push([
                    {
                        text: '⬅️ назад',
                        callback_data: backButtonData
                    },
                    {
                        text: "главное меню",
                        callback_data: 'main_menu'
                    }]);
            }
        }

        return keyboard;
    }

    generateDaysKeyboard(days: string[]) {
        const keyboard = days.map(day => ({text: day, callback_data: `day_${day}`}));

        // Добавляем кнопку для отображения всех дней
        keyboard.push(
            {text: 'Все дни', callback_data: 'all_days'}
        );

        return keyboard;
    }

    getLevel(path: any) {
        // Проходим по ключам в path и возвращаем объект для текущего уровня
        // @ts-ignore
        const level = path.reduce((obj, key) => obj[key] || {}, this.groups);

        // Проверяем, является ли level строкой (если это конечный URL) или объектом (если это вложенная структура)
        if (typeof level === 'string') {
            console.log("String")
            return level; // Возвращаем строку, если это ссылка
        }

        return level; // Возвращаем объект, если это не ссылка
    }

    generateNestedKeyboard(path = []) {
        const keyboard = [];
        let level: Groups | Section | Group = this.groups;

        for (const key of path) {
            if (level[key]) {
                level = level[key];
                const buttons = Object.keys(level).map(subKey => ({
                    text: subKey,
                    callback_data: JSON.stringify([...path, subKey])
                }));
                keyboard.push(buttons);
            }
        }

        return keyboard;
    }

    parseRSSItems(feed: any) {
        if (feed) {
            const items = feed.rss.channel[0].item;

            items.forEach((item: any) => {
                const title = item.title[0]; // Заголовок элемента RSS
                const description = item.description[0];

                // Если заголовок ещё не существует, добавляем его
                if (!this.groups[title]) {
                    this.groups[title] = {}; // Каждому заголовку будет соответствовать свой объект
                }

                // Парсинг разделов и групп
                this.parseSections(title, description);
            });
        }
    }

// Функция для парсинга разделов и групп
    parseSections(title: string, description: string) {
        const sectionRegex = /<h3>(.*?)<\/h3>(.*?)<\/p>/g;
        let sectionMatch;

        while ((sectionMatch = sectionRegex.exec(description)) !== null) {
            const sectionTitle = sectionMatch[1];
            const groupsHTML = sectionMatch[2];

            // Если раздел не существует, создаём его в рамках заголовка
            if (!this.groups[title][sectionTitle]) {
                this.groups[title][sectionTitle] = {};
            }

            // Парсинг групп внутри раздела
            this.parseGroups(title, sectionTitle, groupsHTML);
        }
    }

// Функция для парсинга групп
    parseGroups(title: string, sectionTitle: string, groupsHTML: string) {
        const groupRegex = /<a href='(.*?)'>(.*?)<\/a>/g;
        let groupMatch;

        while ((groupMatch = groupRegex.exec(groupsHTML)) !== null) {
            const link = groupMatch[1];
            const group = groupMatch[2];

            // Добавляем группу и ссылку в соответствующий раздел
            this.groups[title][sectionTitle][group] = link;
        }
    }
}

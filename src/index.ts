import "dotenv/config"
import {session, Telegraf, Markup, TelegramError} from "telegraf";
import {Schedule} from "../classes/Schedule";
import {GroupsObject} from "../classes/GroupsObject";
import {MyContext, SessionData} from "./models/Telegraf-bot";
import {createMenuWithBackButton, getMainMenu} from "./helpers/keyboard";
import {COMMANDS} from "./commands/listCommands";
import {SQLite} from "@telegraf/session/sqlite";
import {SessionStore} from "telegraf";
import {userService} from "./services/user.service";
import {scheduleService} from "./services/schedule.service";
import {handleScheduleMessage} from "./helpers/handleScheduleMessage";
import telegrafThrottler from "telegraf-throttler";
import {formatSchedule} from "./helpers/formatSchedule";
import {splitMessage} from "./helpers/splitMessage";
import {InlineQueryResultArticle} from "@telegraf/types/inline";
import {sessionInit} from "./middlewares/sessionInit";
import {resetSession} from "./helpers/resetSession";
import {initCommands} from "./commands";
import logger, {dataBaseLogger} from './utils/logger';
import {historyVisit} from "./middlewares/historyVisit";
import {checkForScheduleUpdatesWithSubscribers} from "./helpers/checkForScheduleUpdatesWithSubscribers";
import delay from "./utils/delay";

const urlRSS = process.env.RSS_URL || 'https://viti-mephi.ru/taxonomy/term/177/feed';
const token = process.env.BOT_TOKEN
const sessionDbUrl: string = process.env.DB_SESSION_URL || ""
const groupsObject: GroupsObject = new GroupsObject(urlRSS);
const TITLE_PREFIX = 't_';
const SECTION_PREFIX = 's_';
const GROUP_PREFIX = 'g_';
const TITLE_SELECT_PREFIX = "ts_"
const SECTION_SELECT_PREFIX = "ss_"
const GROUP_SELECT_PREFIX = "gs_"
const throttler = telegrafThrottler();

if (token === undefined) {
    throw new TypeError("BOT_TOKEN must be provided!");
}

const store: SessionStore<SessionData> = SQLite({
    filename: sessionDbUrl,
    config: {
        verbose: (message?) => {
            dataBaseLogger.log("database", message)
        }
    }
});

export const bot = new Telegraf<MyContext>(token);
logger.info("Бот запущен")
bot.telegram.setMyCommands(COMMANDS).then(r => logger.info(`Команды установлены?: ${r}`))
initCommands(bot)

bot.use(session({store}));
bot.use(throttler);
bot.use(sessionInit())
bot.use(historyVisit)

bot.start(async (ctx) => {
    await resetSession(ctx)

    await ctx.reply(`Привет, я Schedule!`)
    await ctx.reply('Главное меню:', getMainMenu(ctx));
});

bot.action('main_menu', async (ctx) => {
    ctx.session.pathHistory = []
    await mainMenu(ctx)
});

async function mainMenu(ctx: MyContext) {
    // Очищаем историю
    ctx.session.pathHistory ??= [];

    await ctx.editMessageText('Главное меню:', {
        reply_markup: getMainMenu(ctx).reply_markup
    });
}

bot.action('schedule_monitored', async (ctx) => {
    ctx.session.pathHistory.push({
        action: 'main_menu',
        match: ctx.match // Сохраняем match
    })

    await scheduleMonitored(ctx)
});

async function scheduleMonitored(ctx: MyContext) {
    let scheduleData

    if (ctx.session.userData && ctx.session.userData.Schedule) {
        const schedule = new Schedule()
        scheduleData = await schedule.fetchSchedule(ctx.session.userData.Schedule.url)
    } else {
        scheduleData = await userService.getScheduleUser(ctx.from.id)
    }

    if (scheduleData) {
        const days = scheduleData.map(item => item.day);
        const dayKeyboard = groupsObject.generateDaysKeyboard(days, 'scheduleMonitored');
        await ctx.editMessageText('Выберите день для показа:', {
            reply_markup: createMenuWithBackButton(dayKeyboard, ctx).reply_markup
        });
    } else {
        await ctx.editMessageText('Нету отслеживаемой группы', {
            reply_markup: createMenuWithBackButton([], ctx).reply_markup
        });
    }
}

bot.action("schedule_choice", async (ctx) => {
    ctx.session.pathHistory.push({
        action: 'main_menu',
        match: ctx.match // Сохраняем match
    })
    await scheduleChoice(ctx)
})

async function scheduleChoice(ctx: MyContext) {
    // Генерируем кнопки для групп
    const titles = groupsObject.getTitle()
    const titleButtons = titles.map(title => Markup.button.callback(title, `${TITLE_PREFIX}${title}`));

    const inlineKeyboard = createMenuWithBackButton(titleButtons, ctx);

    await ctx.editMessageText('Выберите расписание:', {
        reply_markup: inlineKeyboard.reply_markup
    });
}


// Обработка заголовков
bot.action(/^t_(.+)$/, async (ctx) => {
    ctx.session.pathHistory.push({
        action: 'schedule_choice',
        match: ctx.match // Сохраняем match
    });

    await title(ctx, SECTION_PREFIX)
});

async function title(ctx: MyContext, prefix: string) {
    const title = ctx.match[1];
    const sections = groupsObject.getSection(title);

    if (sections) {
        const sectionButtons = sections.map(section =>
            Markup.button.callback(section, `${prefix}${title}_${section}`)
        );

        const keyboard = createMenuWithBackButton(sectionButtons, ctx);

        await ctx.editMessageText(`Выберите раздел для "${title}":`, {
            reply_markup: keyboard.reply_markup
        });
    } else {
        await ctx.reply('Разделы не найдены.');
    }
}

// Обработка разделов
bot.action(/^s_(.+)_(.+)$/, async (ctx) => {
    ctx.session.pathHistory.push({
        action: `t_${ctx.match[1]}`,
        match: ctx.match // Сохраняем match для возврата
    });
    await section(ctx, GROUP_PREFIX)
});

async function section(ctx: MyContext, prefix: string) {
    const [title] = ctx.match[1].split('_');
    const [section] = ctx.match[2].split('_');

    const groups = groupsObject.getScheduleItem(title, section);

    if (groups) {
        const groupButtons = Object.keys(groups).map(group =>
            Markup.button.callback(group, `${prefix}${title}_${section}_${group}`)
        );
        const keyboard = createMenuWithBackButton(groupButtons, ctx);

        await ctx.editMessageText(`Выберите группу для "${section}" в "${title}":`, {
            reply_markup: keyboard.reply_markup
        });
    } else {
        await ctx.editMessageText('Группы не найдены', {
            reply_markup: createMenuWithBackButton([], ctx).reply_markup
        });
    }
}

// Обработка групп
bot.action(/^g_(.+)_(.+)_(.+)$/, async (ctx) => {
    ctx.session.currGroupMatch = {
        action: ctx.match[0],
        match: ctx.match
    }
    const modifiedString = `${ctx.match[1]}_${ctx.match[2]}`

    ctx.session.pathHistory.push({
        action: `s_${modifiedString}`,
        match: ctx.match // Сохраняем match
    })
    await group(ctx)
});

async function group(ctx: MyContext) {
    const title = ctx.match[1]
    const section = ctx.match[2]
    const group = ctx.match[3]
    const link = groupsObject.getGroupLink(title, section, group);
    if (link) {
        const schedule = new Schedule();
        const scheduleData = await schedule.fetchSchedule(link);
        if (scheduleData) {
            ctx.session.schedule = scheduleData;
            const days = scheduleData.map(item => item.day);
            const dayKeyboard = groupsObject.generateDaysKeyboard(days, 'group');
            await ctx.editMessageText('Выберите день для показа:', {
                reply_markup: createMenuWithBackButton(dayKeyboard, ctx).reply_markup
            });
        } else {
            await ctx.editMessageText('Не удалось получить расписание', {
                reply_markup: createMenuWithBackButton([], ctx).reply_markup
            });
        }
    } else {
        await ctx.editMessageText('Ссылка не найдена', {
            reply_markup: createMenuWithBackButton([], ctx).reply_markup
        });
    }
}

bot.action(/(group|scheduleMonitored)_day_(.+)/, async (ctx) => {
    const source = ctx.match[1];

    if (source === 'scheduleMonitored') {
        ctx.session.pathHistory.push({
            action: 'schedule_monitored',
            match: ctx.match // Сохраняем match
        });
    } else {
        const previousGroupAction = ctx.session.currGroupMatch;

        if (previousGroupAction) {
            // Сохраняем полную информацию о группе для возврата
            ctx.session.pathHistory.push({
                action: previousGroupAction.action, // Сохраняем действие группы
                match: previousGroupAction.match // Сохраняем текущий день
            });
        }
    }

    await day(ctx)
})

async function day(ctx: MyContext) {
    const [source, , day] = ctx.match[0].split('_');
    // const day = ctx.match[1];

    const useScheduleMonitored = source === 'scheduleMonitored';

    let schedule

    if (useScheduleMonitored) {
        const scheduleData = await userService.getScheduleUser(ctx.from.id)
        schedule = new Schedule(scheduleData)
    } else {
        schedule = new Schedule(ctx.session.schedule);
    }
    if (schedule) {
        const daySchedule = schedule.getScheduleForDay(day);
        if (daySchedule) {
            await handleScheduleMessage(ctx, [daySchedule]);
        } else {
            await ctx.editMessageText('Не удалось найти расписание для выбранного дня', {
                reply_markup: createMenuWithBackButton([], ctx).reply_markup
            });
        }
    } else {
        await ctx.editMessageText('Расписание не загружено', {
            reply_markup: createMenuWithBackButton([], ctx).reply_markup
        });
    }
}

bot.action(/(group|scheduleMonitored)_all_days/, async (ctx) => {
    const [source] = ctx.match[0].split('_');

    const previousGroupAction = ctx.session.currGroupMatch;

    if (source === 'scheduleMonitored') {
        ctx.session.pathHistory.push({
            action: 'schedule_monitored',
            match: ctx.match // Сохраняем match
        });
    } else {
        if (previousGroupAction) {
            // Сохраняем полную информацию о группе для возврата
            ctx.session.pathHistory.push({
                action: previousGroupAction.action, // Сохраняем действие группы
                match: previousGroupAction.match
            });
        }
    }

    await allDays(ctx, source)
});

async function allDays(ctx: MyContext, source: string) {
    // Проверяем источник действия
    const useScheduleMonitored = source === 'scheduleMonitored';

    let schedule

    if (useScheduleMonitored) {
        const scheduleData = await userService.getScheduleUser(ctx.from.id)
        schedule = new Schedule(scheduleData)
    } else {
        schedule = new Schedule(ctx.session.schedule);
    }

    if (schedule) {
        const allDaysSchedule = schedule.getAllDaysSchedule();
        await handleScheduleMessage(ctx, allDaysSchedule, []);
    } else {
        await ctx.editMessageText('Расписание не загружено', {
            reply_markup: createMenuWithBackButton([], ctx).reply_markup
        });
    }
}

bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim();

    // Проверяем длину запроса
    if (query.length < 2 || query.length > 15) {
        return;
    }

    // Получаем все группы, которые соответствуют запросу
    const matchedGroups = groupsObject.getAllGroups(query);

    // Формируем результаты для отображения в инлайн-режиме
    const results: InlineQueryResultArticle[] = matchedGroups.map((group, index) => ({
        type: 'article',
        id: String(index),
        title: group.name,
        input_message_content: {
            message_text: `Вы выбрали группу: ${group.name}`
        },
        description: `Расписание для группы ${group.name}`,
        reply_markup: {
            inline_keyboard: [[
                {text: `Посмотреть расписание`, callback_data: `${GROUP_PREFIX}${group.name}`}
            ]]
        }
    }));

    // Отправляем ответ на inline-запрос
    await ctx.answerInlineQuery(results);
});
bot.action(/^g_(.+)$/, async (ctx) => {
    const group = ctx.match[1]
    const link = groupsObject.getLinkGroup(group)

    if (link) {
        const schedule = new Schedule();
        const scheduleData = await schedule.fetchSchedule(link);

        if (scheduleData) {
            const allDaysSchedule = schedule.getAllDaysSchedule();
            const message = formatSchedule(allDaysSchedule); // Форматируем расписание
            const parts = splitMessage(message); // Разбиваем сообщение на части
            if (parts.length === 1) {
                await ctx.editMessageText(`${parts[0]}`);
            } else {
                for (let part = 0; part < parts.length; part++) {
                    if (part === 0) {
                        await ctx.editMessageText(`${parts[part]}`);
                    }
                    if (part === parts.length - 1) {
                        await ctx.reply(`${parts[part]}`);
                    } else {
                        await ctx.reply(`${parts[part]}`);
                    }
                }
            }
        } else {
            ctx.editMessageText('Не удалось получить расписание');
        }
    } else {
        logger.error(`Cсылка для парсинга расписания не была найдена ${group}`)
        await ctx.editMessageText('Расписание не найдено');
    }
});
bot.action('choice_group', async (ctx) => {

    ctx.session.pathHistory.push({
        action: 'profile',
        match: ctx.match // Сохраняем match
    });

    await choiceGroup(ctx)
});

async function choiceGroup(ctx: MyContext) {
    try {
        // Инициализируем процесс выбора группы через groupsObject
        const titles = groupsObject.getTitle();
        const titleButtons = titles.map(title => Markup.button.callback(title, `ts_${title}`));
        const inlineKeyboard = createMenuWithBackButton(titleButtons, ctx);

        await ctx.editMessageText('Выберите факультет или категорию:', {
            reply_markup: inlineKeyboard.reply_markup
        });
    } catch (error) {
        console.error('Ошибка при выборе группы:', error);
        await ctx.editMessageText('Произошла ошибка при получении списка групп', {
            reply_markup: createMenuWithBackButton([], ctx).reply_markup
        });
    }
}

// Логика для обработки заголовков
bot.action(/^ts_(.+)$/, async (ctx) => {
    ctx.session.pathHistory.push({
        action: 'choice_group',
        match: ctx.match // Сохраняем match
    });

    await title(ctx, SECTION_SELECT_PREFIX)
});

// Логика для обработки разделов
bot.action(/^ss_(.+)_(.+)$/, async (ctx) => {
    ctx.session.pathHistory.push({
        action: `ts_${ctx.match[1]}`,
        match: ctx.match // Сохраняем match для возврата
    });

    await section(ctx, GROUP_SELECT_PREFIX)
});

// Логика для обработки групп
bot.action(/^gs_(.+)_(.+)_(.+)$/, async (ctx) => {
    const modifiedString = `${ctx.match[1]}_${ctx.match[2]}`
    ctx.session.pathHistory.push({
        action: `ss_${modifiedString}`,
        match: ctx.match
    })

    await groupSelect(ctx)
});

async function groupSelect(ctx: MyContext) {
    const groupName = ctx.match[3]; // Название группы

    try {
        // Получаем id группы из базы данных
        const schedule = await scheduleService.getScheduleByName(groupName);

        if (schedule) {
            const userId = ctx.from.id;
            // Обновляем пользователя, связывая его с выбранной группой
            await userService.updateUserSchedule(userId, schedule.id);

            ctx.session.userData = await userService.getUserByIdTg(ctx.from.id)

            await ctx.editMessageText(`Группа "${groupName}" успешно выбрана для отслеживания!`, {
                reply_markup: createMenuWithBackButton([], ctx).reply_markup
            });
        } else {
            await ctx.editMessageText(`Группа "${groupName}" не найдена в базе данных`, {
                reply_markup: createMenuWithBackButton([], ctx).reply_markup
            });
        }
    } catch (error) {
        console.error('Ошибка при обновлении пользователя:', error);
        await ctx.editMessageText('Не удалось выбрать группу. Попробуйте позже', {
            reply_markup: createMenuWithBackButton([], ctx).reply_markup
        });
    }
}

bot.action('profile', async (ctx) => {
    ctx.session.pathHistory.push({
        action: "main_menu",
        match: []
    })

    await profile(ctx)
});

async function profile(ctx: MyContext) {
    try {
        if (!ctx.session.userData) {
            await userService.createUser({idTg: ctx.from.id})
        }
    } catch {
    }

    const user = await userService.getUserByIdTg(ctx.from.id)

    ctx.session.userData = user

    if (user && user.Schedule) {
        await ctx.editMessageText(`Ваш профиль:\nГруппа, за которой вы следите: ${user.Schedule.name} (интервал 30 мин.)`, createMenuWithBackButton([
            {
                text: 'Сменить группу для отслеживания',
                callback_data: 'choice_group'
            },
            {
                text: 'Удалить группу',
                callback_data: 'delete_group'
            }
        ], ctx));
    } else {
        await ctx.editMessageText('Ваш профиль:\nВы еще не выбрали группу для отслеживания', createMenuWithBackButton([{
            text: 'Выбрать группу для отслеживания',
            callback_data: 'choice_group'
        }], ctx));
    }
}

bot.action("delete_group", async (ctx) => {
    ctx.session.pathHistory.push({
        action: 'profile',
        match: ctx.match // Сохраняем match
    });
    // @ts-ignore
    await userService.detachUserFromSchedule(ctx.session.userData.id)

    // @ts-ignore
    await ctx.editMessageText(`Вы отменили отслеживание изменения расписания группы ${ctx.session.userData.Schedule.name}`, createMenuWithBackButton([], ctx))
    // @ts-ignore
    ctx.session.userData.Schedule = null;
})

// Обработчик для удаления сообщения
bot.action('delete_message', async (ctx) => {
    try {
        await ctx.deleteMessage(); // Удаляет текущее сообщение
    } catch (error) {
        console.error('Ошибка при удалении сообщения:', error);
    }
});

setTimeout(() => {
    logger.info("Запущена проверка обновления расписания")
    checkForScheduleUpdatesWithSubscribers().then(() => logger.info("Проверка обновления расписания завершена"));
}, 5000)
// Периодическая проверка расписаний каждые 30 минут
setInterval(async () => {
    await logger.info("Запущена проверка обновления расписания")
    checkForScheduleUpdatesWithSubscribers().then(() => logger.info("Проверка обновления расписания завершена"));
}, 30 * 1000 * 60); // 30 минут

bot.catch(async (err) => {
    logger.error(err)
    if (err instanceof TelegramError) {
        if (err.code === 429) {
            // @ts-ignore
            logger.error(`Превышено количество запросов, повтор через ${err.parameters.retry_after} секунд.`);
            // @ts-ignore
            await delay(err.parameters.retry_after * 1000); // Ожидание перед повторной попыткой
        } else {
            logger.error(`Telegram API Error: ${err.code} - ${err.description}`);
        }
    } else {
        console.error(err)
        logger.error(`Произошла неизвестная ошибка:`, err);
    }
});


bot.launch().then(() => logger.info("Бот выключен"));
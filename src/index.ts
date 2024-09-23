import "dotenv/config"
import {session, Telegraf, Markup} from "telegraf";
import {Schedule} from "../classes/Schedule";
import {splitMessage} from "./helpers/splitMessage";
import {GroupsObject} from "../classes/GroupsObject";
import {formatSchedule} from "./helpers/formatSchedule";
import {MyContext, SessionData} from "./models/Telegraf-bot";
import {initHelpCommand} from "./commands/help";
import {initScheduleCommand} from "./commands/schedule";
import {createMenuWithBackButton, getMainMenu} from "./helpers/keyboard";
import {COMMANDS} from "./commands/listCommands";
import {formatDate} from "./helpers/formatDate";
import {SQLite} from "@telegraf/session/sqlite";
import {SessionStore} from "telegraf";
import {prisma} from "../prisma/prisma";

const urlRSS = 'https://viti-mephi.ru/taxonomy/term/177/feed';
const token = process.env.BOT_TOKEN
const groupsObject: GroupsObject = new GroupsObject();
const TITLE_PREFIX = 't_';
const SECTION_PREFIX = 's_';
const GROUP_PREFIX = 'g_';
let currGroupMatch: { action: string, match: [] }

if (token === undefined) {
    throw new TypeError("BOT_TOKEN must be provided!");
}

const store: SessionStore<SessionData> = SQLite({
    filename: "E:\\TgBot\\database\\telegraf-sessions.sqlite",
});

export const bot = new Telegraf<MyContext>(token);

bot.telegram.setMyCommands(COMMANDS)
bot.use(session({store}));
initHelpCommand(bot)
initScheduleCommand(bot)
bot.use(async (ctx, next) => {
    // Проверяем, инициализирована ли сессия
    if (!ctx.session) {
        ctx.session = {
            pathHistory: [],  // Пример: история навигации
            schedule: []
        };
    }

    if (groupsObject.daysDifferent()) {
        await groupsObject.initializeGroupsObject(urlRSS);
    }

    logger("Использует бота", ctx)
    // console.log("session", ctx.session)
    // Переходим к следующему middleware или обработчику
    return next();
});

bot.start(async (ctx) => {
    logger("Start", ctx)

    // сброс сессии
    ctx.session.pathHistory ??= []
    ctx.session.schedule ??= []

    if (groupsObject.lastUpdateTime) {
        const humanReadableDate = formatDate(groupsObject.lastUpdateTime)
        await ctx.reply(`Привет, я Schedule!\n\nРасписание обновлено: ${humanReadableDate}\n\n`);
    } else {
        await ctx.reply(`Привет, я Schedule!`)
    }

    await ctx.reply('Главное меню:', getMainMenu());
});

bot.action('back', async (ctx) => {
    const previousState = ctx.session.pathHistory.pop();

    if (previousState) {
        const {action, match} = previousState;
        ctx.match = match;

        if (action === 'main_menu') {
            await mainMenu(ctx);
        } else if (action === 'schedule_choice') {
            await scheduleChoice(ctx);
        } else if (action.startsWith(TITLE_PREFIX)) {
            await title(ctx);
        } else if (action.startsWith(SECTION_PREFIX)) {
            await section(ctx);
        } else if (action.startsWith(GROUP_PREFIX)) {
            await group(ctx);
        } else {
            await ctx.reply('Вы находитесь в главном меню.');
        }
    } else {
        await ctx.reply('Вы находитесь в главном меню.');
    }
});

bot.action('main_menu', async (ctx) => {
    ctx.session.pathHistory = []
    await mainMenu(ctx)
});

async function mainMenu(ctx: MyContext) {
    // Очищаем историю
    ctx.session.pathHistory ??= [];

    await ctx.editMessageText('Главное меню:', {
        reply_markup: getMainMenu().reply_markup
    });
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
    await title(ctx)
});

async function title(ctx: MyContext) {
    const title = ctx.match[1];
    const sections = groupsObject.getSection(title);

    if (sections) {
        const sectionButtons = sections.map(section =>
            Markup.button.callback(section, `${SECTION_PREFIX}${title}_${section}`)
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
    await section(ctx)
});

async function section(ctx: MyContext) {
    const [title] = ctx.match[1].split('_');
    const [section] = ctx.match[2].split('_');

    const groups = groupsObject.getScheduleItem(title, section);

    if (groups) {
        const groupButtons = Object.keys(groups).map(group =>
            Markup.button.callback(group, `${GROUP_PREFIX}${title}_${section}_${group}`)
        );
        const keyboard = createMenuWithBackButton(groupButtons, ctx);

        await ctx.editMessageText(`Выберите группу для "${section}" в "${title}":`, {
            reply_markup: keyboard.reply_markup
        });
    } else {
        await ctx.reply('Группы не найдены.');
    }
}

// Обработка групп
bot.action(/^g_(.+)_(.+)_(.+)$/, async (ctx) => {
    currGroupMatch = {
        action: ctx.match[0],
        match: ctx.match
    }
    const modifiedString = ctx.match[0].replace(/^g_/, '');

    ctx.session.pathHistory.push({
        action: `s_${modifiedString}`,
        match: ctx.match // Сохраняем match
    })
    await group(ctx)
});

async function group(ctx: MyContext) {
    const [prefix, title, section, group] = ctx.match[0].split('_');
    const link = groupsObject.getGroupLink(title, section, group);
    if (link) {
        const schedule = new Schedule();
        const scheduleData = await schedule.fetchSchedule(link);
        if (scheduleData) {
            ctx.session.schedule = scheduleData;
            const days = scheduleData.map(item => item.day);
            const dayKeyboard = groupsObject.generateDaysKeyboard(days);
            await ctx.editMessageText('Выберите день для показа:', {
                reply_markup: createMenuWithBackButton(dayKeyboard, ctx).reply_markup
            });
        } else {
            ctx.reply('Не удалось получить расписание.');
        }
    } else {
        await ctx.reply('Ссылка не найдена.');
    }
}

bot.action(/day_(.+)/, async (ctx) => {
    const previousGroupAction = currGroupMatch;

    if (previousGroupAction) {
        // Сохраняем полную информацию о группе для возврата
        ctx.session.pathHistory.push({
            action: previousGroupAction.action, // Сохраняем действие группы
            match: previousGroupAction.match // Сохраняем текущий день
        });
    }

    await day(ctx)
})

async function day(ctx: MyContext) {
    const day = ctx.match[1];
    const schedule = new Schedule(ctx.session.schedule)
    if (schedule) {
        const daySchedule = schedule.getScheduleForDay(day);
        if (daySchedule) {
            const message = formatSchedule([daySchedule]); // Форматируем только выбранный день
            const parts = splitMessage(message);
            if (parts.length === 1) {
                await ctx.editMessageText(`${parts[0]}`, {
                    reply_markup: createMenuWithBackButton([], ctx).reply_markup
                });
            } else {
                for (let part = 0; part < parts.length; part++) {
                    if (part === 0) {
                        await ctx.editMessageText(`${parts[part]}`, {
                            reply_markup: createMenuWithBackButton([], ctx).reply_markup
                        });
                    }
                    if (part === parts.length - 1) {
                        await ctx.reply(`${parts[part]}`, {
                            reply_markup: createMenuWithBackButton([], ctx).reply_markup
                        });
                    } else {
                        await ctx.reply(parts[part]);
                    }
                }
            }
            return
        } else {
            ctx.reply('Не удалось найти расписание для выбранного дня.');
        }
    } else {
        ctx.reply('Расписание не загружено.');
    }
}

bot.action('all_days', async (ctx) => {
    // @ts-ignore
    const previousGroupAction = currGroupMatch;

    if (previousGroupAction) {
        // Сохраняем полную информацию о группе для возврата
        ctx.session.pathHistory.push({
            action: previousGroupAction.action, // Сохраняем действие группы
            match: previousGroupAction.match
        });
    }

    await allDays(ctx)
});

async function allDays(ctx: MyContext) {
    const schedule = new Schedule(ctx.session.schedule)

    if (schedule) {
        const allDaysSchedule = schedule.getAllDaysSchedule();
        const message = formatSchedule(allDaysSchedule); // Форматируем все дни
        const parts = splitMessage(message);
        if (parts.length === 1) {
            await ctx.editMessageText(`${parts[0]}`, {
                reply_markup: createMenuWithBackButton([], ctx).reply_markup
            });
        } else {
            for (let part = 0; part < parts.length; part++) {
                if (part === 0) {
                    await ctx.editMessageText(`${parts[part]}`, {
                        reply_markup: createMenuWithBackButton([], ctx).reply_markup
                    });
                }
                if (part === parts.length - 1) {
                    await ctx.reply(`${parts[part]}`, {
                        reply_markup: createMenuWithBackButton([], ctx).reply_markup
                    });
                } else {
                    await ctx.reply(parts[part]);
                }
            }
        }
    } else {
        ctx.reply('Расписание не загружено.');
    }
}

bot.action('profile', async (ctx) => {
    ctx.session.pathHistory.push({
        action: "main_menu",
        match: []
    })


    const user = await prisma.user.findUnique({
        where: {idTg: ctx.from.id},
        // @ts-ignore
        include: {Schedule: true}
    });

    // @ts-ignore
    if (user && user.schedule.length > 0) {
        // @ts-ignore
        const scheduleNames = user.schedule.map(s => s.name).join(', ');
        await ctx.editMessageText(`Ваш профиль:\nГруппы, за которыми вы следите: ${scheduleNames}`, createMenuWithBackButton([], ctx));
    } else {
        await ctx.editMessageText('Ваш профиль:\nВы еще не выбрали группу для отслеживания', createMenuWithBackButton([], ctx));
    }
});


import crypto from 'crypto';
import {logger} from "./helpers/logger";


// Периодическая проверка расписаний каждые 30 минут
setInterval(async () => {
    console.log("check updates")
    await checkForUpdates();
}, 30 * 1000 * 60); // 30 минут

async function checkForUpdates() {
    // Получаем все расписания из базы данных
    const schedules = await prisma.schedule.findMany();

    for (const schedule of schedules) {
        // Получаем актуальные данные по расписанию
        const fetchedSchedule = new Schedule();
        const scheduleData = await fetchedSchedule.fetchSchedule(schedule.url);

        if (scheduleData) {
            // Генерируем хэш-сумму для текущего расписания
            const currentChecksum = crypto
                .createHash('md5')
                .update(JSON.stringify(scheduleData))
                .digest('hex');

            // Сравниваем с предыдущей хэш-суммой
            if (schedule.checksum !== currentChecksum) {
                // Если хэш-сумма изменилась, обновляем базу данных
                await prisma.schedule.update({
                    where: {id: schedule.id},
                    data: {
                        checksum: currentChecksum,
                        schedule: JSON.stringify(scheduleData),
                    },
                });

                // Уведомляем пользователей об изменении
                await notifyUsers(schedule.id);
            }
        }
    }
}

// Функция уведомления пользователей
async function notifyUsers(scheduleId: number) {
    // Находим всех пользователей, подписанных на это расписание
    const users = await prisma.user.findMany({
        where: {
            // @ts-ignore
            scheduleId: scheduleId
        },
    });

    for (const user of users) {
        // Отправляем уведомление пользователю
        await bot.telegram.sendMessage(user.idTg, `Расписание группы изменилось!`);
    }
}


bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
import {Markup} from "telegraf";
import {MyContext} from "../models/Telegraf-bot";
import {InlineKeyboardButton} from "@telegraf/types/markup";

export function getMainMenu(ctx: MyContext) {
    const keyboard: InlineKeyboardButton.CallbackButton[] = []

    if (ctx.session.userData?.Schedule) {
        keyboard.push(Markup.button.callback('Отслеживаемое расписание', 'schedule_monitored'))
    }

    keyboard.push(
        Markup.button.callback('Все расписания', 'schedule_choice'),
        Markup.button.callback('Мой профиль', 'profile')
    )

    return Markup.inlineKeyboard(keyboard, {columns: 1})
}

export function createMenuWithBackButton(keyboard: any[], ctx: MyContext) {
    let navKeyboard = [];
    // console.log("ctx.session.pathHistory.length", ctx.session.pathHistory.length,"\n", ctx.session.pathHistory)
    // Добавляем кнопку "Назад", если есть история
    if (ctx.session.pathHistory.length > 0) {
        navKeyboard.push(Markup.button.callback('Назад', "back"));
    }

    // Всегда добавляем кнопку "Главное меню"
    navKeyboard.push(Markup.button.callback('Главное меню', 'main_menu'));

    const combinedKeyboard = [
        ...keyboard.map(button => [button]), // Кнопки групп в строках
        navKeyboard // Кнопки навигации в одной строке
    ];

    return Markup.inlineKeyboard(combinedKeyboard);
}
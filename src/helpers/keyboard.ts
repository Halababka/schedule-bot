import {Markup} from "telegraf";
import {MyContext} from "../models/Telegraf-bot";

export function getMainMenu() {
    return Markup.inlineKeyboard([
        Markup.button.callback('Все расписания', 'schedule_choice'),
        Markup.button.callback('Мой профиль', 'profile'),
        // Markup.button.callback('Следующая пара', '.')
    ], {columns: 2})
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
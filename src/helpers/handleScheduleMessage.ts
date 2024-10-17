import { MyContext} from "../models/Telegraf-bot";
import {splitMessage} from "./splitMessage";
import {formatSchedule} from "./formatSchedule";
import {createMenuWithBackButton} from "./keyboard";

export async function handleScheduleMessage(ctx: MyContext, scheduleData: any, replyMarkupOptions: any[] = []) {
    const message = formatSchedule(scheduleData); // Форматируем расписание
    const parts = splitMessage(message); // Разбиваем сообщение на части

    if (parts.length === 1) {
        await ctx.editMessageText(`${parts[0]}`, {
            reply_markup: createMenuWithBackButton(replyMarkupOptions, ctx).reply_markup
        });
    } else {
        for (let part = 0; part < parts.length; part++) {
            if (part === 0) {
                await ctx.editMessageText(`${parts[part]}`, {
                    reply_markup: createMenuWithBackButton(replyMarkupOptions, ctx).reply_markup
                });
            }
            if (part === parts.length - 1) {
                await ctx.reply(`${parts[part]}`, {
                    reply_markup: createMenuWithBackButton(replyMarkupOptions, ctx).reply_markup
                });
            } else {
                await ctx.reply(parts[part]);
            }
        }
    }
}

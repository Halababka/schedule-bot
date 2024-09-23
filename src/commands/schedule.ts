import {Telegraf} from "telegraf";
import {MyContext} from "../models/Telegraf-bot";

export function initScheduleCommand(bot: Telegraf<MyContext>) {
    bot.command("schedule",async (ctx) => {
        ctx.reply("schedule")
    });
}

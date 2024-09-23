import {Telegraf} from "telegraf";

export function initScheduleCommand(bot: Telegraf) {
    bot.command("schedule",async (ctx) => {
        ctx.reply("schedule")
    });
}

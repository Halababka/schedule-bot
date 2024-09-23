import {Telegraf} from "telegraf";
import {MyContext} from "../models/Telegraf-bot";

export function initHelpCommand(bot: Telegraf<MyContext>) {
    bot.command("help",async (ctx) => {
        ctx.reply("help")
    });
}

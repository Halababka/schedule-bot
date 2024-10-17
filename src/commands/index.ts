import {Telegraf} from "telegraf";
import {MyContext} from "../models/Telegraf-bot";
import {initScheduleCommand} from "./schedule";
import {initHelpCommand} from "./help";

export function initCommands(bot: Telegraf<MyContext>) {
    initHelpCommand(bot)
    initScheduleCommand(bot)
}
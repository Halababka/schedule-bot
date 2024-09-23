import {MyContext} from "../models/Telegraf-bot";

export async function logger(message: string, ctx?: MyContext) {
    const username = ctx?.from?.username ?? 'Никнейм не указан';
    const currentTime = new Date().toLocaleString(); // Получаем текущие дату и время
    console.log(`[${currentTime}] ${message}: ${username}`);
}
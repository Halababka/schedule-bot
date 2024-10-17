import {MyContext} from "../models/Telegraf-bot";

export const sessionInit = () => {
    const middleware = (ctx: MyContext, next: () => Promise<void>) => {
        if (!ctx.session) {
            ctx.session = {
                pathHistory: [],  // Пример: история навигации
                schedule: [],
                currGroupMatch: {action: "", match: []},
                userData: null
            };
        }

        return next();
    }

    return middleware
}
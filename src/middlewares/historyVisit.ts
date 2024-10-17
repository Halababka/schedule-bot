import logger from "../utils/logger";
import { MyContext } from "../models/Telegraf-bot";
import { callbackQuery } from "telegraf/filters";

export const historyVisit = (ctx: MyContext, next: () => Promise<void>) => {
    if (ctx.callbackQuery) {
        if (ctx.has(callbackQuery("data"))) {
            if (ctx.callbackQuery.data === "back") {
                const previousState = ctx.session.pathHistory.pop();
                if (previousState) {
                    const { action, match } = previousState;
                    ctx.match = match;

                    ctx.callbackQuery.data = action;
                }
            }

            logger.silly(`User ${ctx.from.username} ${ctx.callbackQuery.data}`);
        }
    }

    return next();
}
import {MyContext} from "../models/Telegraf-bot";
import {userService} from "../services/user.service";

export async function resetSession(ctx: MyContext) {
    ctx.session = {
        messageCount: 0,
        pathHistory: [],
        schedule: [],
        currGroupMatch: { action: "", match: [] },
        userData: await userService.getUserByIdTg(ctx.from.id),
    };
}
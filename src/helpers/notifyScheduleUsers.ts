import {DaySchedule} from "../../classes/Schedule";
import {userService} from "../services/user.service";
import {formatSchedule} from "./formatSchedule";
import {splitMessage} from "./splitMessage";
import {bot} from "../index";

export async function notifyScheduleUsers(scheduleId: number, changes: DaySchedule[]) {
    // Находим всех пользователей, подписанных на это расписание
    const users = await userService.getUsers({scheduleId: scheduleId})

    for (const user of users) {
        const message = formatSchedule(changes); // Форматируем расписание
        const parts = splitMessage(message); // Разбиваем сообщение на части
        if (parts.length === 1) {
            const sentMessage = await bot.telegram.sendMessage(user.idTg, `Расписание группы изменилось!\n\n${parts[0]}`, {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: 'Главное меню',
                            callback_data: "main_menu"
                        },
                        {
                            text: 'Удалить', // Кнопка для удаления сообщения
                            callback_data: `delete_message`
                        }
                    ]]
                }
            });
        } else {
            const sentMessage = await bot.telegram.sendMessage(user.idTg, "Новое расписание группы!", {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: 'Главное меню',
                            callback_data: "main_menu"
                        },
                        {
                            text: 'Удалить', // Кнопка для удаления сообщения
                            callback_data: `delete_message`
                        }
                    ]]
                }
            });
        }
    }
}
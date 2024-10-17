import {PrismaClient, Prisma} from '@prisma/client';
import {DaySchedule} from "../../classes/Schedule";

const prisma = new PrismaClient();

class UserService {
    // Получение списка пользователей с фильтрацией
    async getUsers(filter?: Prisma.UserWhereInput) {
        return prisma.user.findMany({
            where: filter,
            include: {
                Schedule: true,
            },
        });
    }

    // Получение одного пользователя по ID
    async getUserByIdTg(idTg: number) {
        return prisma.user.findUnique({
            where: {idTg},
            include: {
                Schedule: {
                    select: {
                        name: true, url: true
                    }
                },
            },
        });
    }

    async getScheduleUser(idTg: number): Promise<DaySchedule[] | undefined> {
        const schedule = await prisma.user.findUnique({
            where: {idTg},
            select: {
                Schedule: {
                    select: {
                        schedule: true
                    }
                }
            }
        });

        if (schedule?.Schedule) {
            return JSON.parse(schedule.Schedule.schedule);
        }

        return undefined
    }

    // Создание пользователя
    async createUser(data: Prisma.UserCreateInput) {
        return prisma.user.create({
            data,
        });
    }

    // Обновление данных пользователя
    async updateUser(id: number, data: Prisma.UserUpdateInput) {
        return prisma.user.update({
            where: {id},
            data,
        });
    }

    async detachUserFromSchedule(userId: number) {
        return prisma.user.update({
            where: {id: userId},
            data: {
                scheduleId: null,
            },
        });
    }

    async updateUserSchedule(userId: number, scheduleId: number) {
        return prisma.user.update({
            where: {idTg: userId},
            data: {scheduleId},
        });
    }

    // Удаление пользователя
    async deleteUser(id: number) {
        return prisma.user.delete({
            where: {id},
        });
    }
}

export const userService = new UserService();

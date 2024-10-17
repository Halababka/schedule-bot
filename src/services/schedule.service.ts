import {PrismaClient, Prisma} from '@prisma/client';
import {DaySchedule} from "../../classes/Schedule";

const prisma = new PrismaClient();

class ScheduleService {
    // Получение списка расписаний с фильтрацией
    // async getSchedules(filter?: Prisma.ScheduleWhereInput) {
    //     return prisma.schedule.findMany({
    //         where: filter,
    //         include: {
    //             user: true,
    //         },
    //     });
    // }
    async getSchedules() {
        return prisma.schedule.findMany();
    }

    // Получение одного расписания по ID
    async getScheduleById(id: number) {
        return prisma.schedule.findUnique({
            where: {id},
            include: {
                user: true,
            },
        });
    }

    async getSchedulesFilterUrl(url: string) {
        return prisma.schedule.findFirst({
            where: {url},
            select: {
                schedule: true,
                lastUpdate: true
            }
        });
    }

    async getScheduleByName(name: string) {
        return prisma.schedule.findUnique({
            where: {name: name}
        });
    }

    // Создание расписания
    async createSchedule(data: Prisma.ScheduleCreateInput) {
        return prisma.schedule.create({
            data,
        });
    }

    // Обновление расписания
    async updateSchedule(id: number, data: Prisma.ScheduleUpdateInput) {
        return prisma.schedule.update({
            where: {id},
            data,
        });
    }

    // Удаление расписания
    async deleteSchedule(id: number) {
        return prisma.schedule.delete({
            where: {id},
        });
    }
}

export const scheduleService = new ScheduleService();

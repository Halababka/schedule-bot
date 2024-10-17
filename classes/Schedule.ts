import * as cheerio from 'cheerio';
import axios from 'axios';
import https from 'https';
import {scheduleService} from "../src/services/schedule.service";
import logger from "../src/utils/logger";
import {ScheduleCache} from "./ScheduleCash";

interface Lesson {
  time: string;
  type: string;
  subject: string;
  teacher: string;
  room: string;
}

export interface DaySchedule {
  day: string;
  lessons: Lesson[];
}

const scheduleCache = new ScheduleCache();

export class Schedule {
  private previousChecksum?: string;
  schedule: DaySchedule[]

  constructor(schedule: DaySchedule[] = []) {
    this.schedule = schedule
  }

  // Метод для получения расписания и его парсинга
  async fetchSchedule(url: string, retries: number = 2, skipDbData: boolean = false): Promise<DaySchedule[] | null> {
    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    // Попытка загрузить данные из кэша
    const cachedSchedule = scheduleCache.get(url);
    if (cachedSchedule) {
      logger.debug('Returning schedule from cache.');
      this.schedule = cachedSchedule;
      return this.schedule;
    }

    // Попытки загрузки по URL
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data } = await axios.get(url, { httpsAgent: agent });

        // Парсим и сохраняем загруженное расписание
        this.schedule = this.parseSchedule(data);

        // Сохраняем в кэш
        scheduleCache.set(url, this.schedule);

        return this.schedule;
      } catch (error) {
        logger.error(`Error fetching schedule by URL (attempt ${attempt + 1}):`, error);

        if (attempt === retries - 1) {
          logger.warn('All attempts to fetch schedule by URL failed.');
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Если данные из URL не получены, попробуем запросить их из базы данных
    if (!skipDbData) {
      try {
        logger.debug('Fetching schedule from database...');
        const data = await scheduleService.getSchedulesFilterUrl(url) || { schedule: "", lastUpdate: null };

        const scheduleFromDb: DaySchedule[] = JSON.parse(data.schedule || '[]');
        const lastUpdate = data.lastUpdate ? new Date(data.lastUpdate) : null;
        const now = new Date();

        // Проверяем, есть ли расписание в базе и прошло ли более 30 минут с последнего обновления
        if (scheduleFromDb.length > 0 && lastUpdate && ((now.getTime() - lastUpdate.getTime()) / (1000 * 60) < 30)) {
          logger.debug('Returning cached schedule from database.');

          this.schedule = scheduleFromDb;
          return this.schedule;
        }
      } catch (error) {
        logger.error(`Error fetching schedule from database: ${error}`);
      }
    }

    return null; // Если ничего не удалось, возвращаем null
  }

  private parseSchedule(data: string): DaySchedule[] {
    const $ = cheerio.load(data);
    const schedule: DaySchedule[] = [];

    $('.more.rasp_carrier .small_rasp table').each((index, tableElem) => {
      const dayOfWeek = $(tableElem).find('thead th').first().text().trim();
      const lessons: Lesson[] = [];

      $(tableElem).find('tbody tr').each((trIndex, trElem) => {
        const time = $(trElem).find('th').text().trim();
        // @ts-ignore
        const lessonHtml = $(trElem).find('td').first().html().trim();
        const room = $(trElem).find('td').last().text().trim();

        if (!time || !lessonHtml) return;

        const typeMatch = lessonHtml.match(/<i>(.*?)<\/i>/);
        let type = typeMatch ? typeMatch[1].replace(/[()]/g, '').trim() : '';

        // Заменяем сокращения на полные названия
        type = type
            .replace(/лекц\./gi, 'лекция')
            .replace(/лекц\s/gi, 'лекция')
            .replace(/пр\./gi, 'практика')
            .replace(/практ\./gi, 'практика')
            .replace(/лаб\./gi, 'лабораторная')
            .replace(/\(лекция\)/gi, 'лекция');

        const cleanHtml = lessonHtml.replace(/<i.*?>(.*?)<\/i>/g, '$1').replace(/<br>/g, '<br>');
        const [subjectWithType, ...teacherParts] = cleanHtml.split('<br>');
        let subject = subjectWithType.trim();
        const teacher = teacherParts.join('<br>').trim();

        subject = subject
            .replace(/\s*\(лекц\.\)\s*/gi, '')
            .replace(/\s*\(практ\.\)\s*/gi, '')
            .replace(/\s*\(лаб\.\)\s*/gi, '')
            .replace(/\s*лекц\.\s*/gi, '')
            .replace(/\s*пр\.\s*/gi, '')
            .replace(/\s*лаб\.\s*/gi, '')
            .replace(/^\(лекция\)\s*/, '')
            .replace(/,\s*$/, '')
            .trim();

        lessons.push({
          time,
          type,
          subject,
          teacher,
          room
        });
      });

      schedule.push({
        day: dayOfWeek,
        lessons
      });
    });

    return schedule;
  }

  // Метод для получения расписания на конкретный день
  public getScheduleForDay(day: string): DaySchedule | null {
    const daySchedule = this.schedule.find(d => d.day.includes(day));
    return daySchedule || null; // Возвращает расписание на день или null, если день не найден
  }

  // Метод для получения расписания на все дни
  public getAllDaysSchedule(): DaySchedule[] {
    return this.schedule; // Возвращает полное расписание
  }

  // Ваш метод для проверки изменений в расписании
  // async hasScheduleChanged(): Promise<boolean> {
  //   const currentSchedule = await this.fetchSchedule();
  //
  //   if (!currentSchedule) return false;
  //
  //   const currentChecksum = crypto.createHash('sha256').update(JSON.stringify(currentSchedule)).digest('hex');
  //
  //   if (this.previousChecksum && this.previousChecksum === currentChecksum) {
  //     return false;
  //   }
  //
  //   this.previousChecksum = currentChecksum;
  //   return true;
  // }
}

import * as cheerio from 'cheerio';
import axios from 'axios';
import https from 'https';
import crypto from 'crypto';

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

export class Schedule {
  private previousChecksum?: string;
  schedule: DaySchedule[]

  constructor(schedule: DaySchedule[] = []) {
    this.schedule = schedule
  }

  // Новый метод для парсинга данных из HTML
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

  // Метод для получения расписания и его парсинга
  async fetchSchedule(url: string): Promise<DaySchedule[] | null> {
    try {
      const agent = new https.Agent({
        rejectUnauthorized: false
      });

      const { data } = await axios.get(url, { httpsAgent: agent });

      // Используем новый метод для парсинга данных
      this.schedule = this.parseSchedule(data);

      return this.schedule;
    } catch (error) {
      console.error('Error fetching schedule:', error);
      return null;
    }
  }

  // Метод для получения расписания на конкретный день
  public getScheduleForDay(day: string): DaySchedule | null {
    console.log(this.schedule)
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

import * as cheerio from 'cheerio';
import axios from 'axios';
import https from 'https';

// Функция для парсинга данных с сайта
async function getSchedule(url:string) {
    try {
        const agent = new https.Agent({
            rejectUnauthorized: false
        });

        const { data } = await axios.get(url, { httpsAgent: agent });
        const $ = cheerio.load(data);

        const schedule:any = [];

        // Парсим каждый день недели
        $('.big_rasp').each((index, tableElem) => {
            const dayOfWeek = $(tableElem).find('thead th').first().text().trim();
            const lessons:any = [];

            // Парсим каждый временной интервал
            $(tableElem).find('tbody tr').each((trIndex, trElem) => {
                const time = $(trElem).find('th').text().trim();
                // @ts-ignore
                const lessonHtml = $(trElem).find('td').first().html().trim();
                const room = $(trElem).find('td').last().text().trim();

                if (!time || !lessonHtml) return; // Пропускаем строки без времени или занятия

                // Извлекаем тип занятия
                const typeMatch = lessonHtml.match(/<i>(.*?)<\/i>/);
                const type = typeMatch ? typeMatch[1].replace(/[()]/g, '').trim() : '';

                // Удаляем теги <i> из предмета и преподавателя
                const cleanHtml = lessonHtml.replace(/<i.*?>(.*?)<\/i>/g, '$1').replace(/<br>/g, '<br>');

                // Разделяем строку на предмет и преподавателя
                const [subjectWithType, ...teacherParts] = cleanHtml.split('<br>');
                let subject = subjectWithType.trim();
                const teacher = teacherParts.join('<br>').trim();

                // Удаляем тип занятия из предмета
                subject = subject
                    .replace(/\s*\(лекц\.\)\s*/gi, '')  // Убираем "(лекц.)" и пробелы вокруг
                    .replace(/\s*\(практ\.\)\s*/gi, '') // Убираем "(практ.)" и пробелы вокруг
                    .replace(/\s*\(лаб\.\)\s*/gi, '')   // Убираем "(лаб.)" и пробелы вокруг
                    .replace(/\s*лекц\.\s*/gi, '')       // Убираем "лекц." и пробелы вокруг
                    .replace(/\s*пр\.\s*/gi, '')         // Убираем "пр." и пробелы вокруг
                    .replace(/\s*лаб\.\s*/gi, '')        // Убираем "лаб." и пробелы вокруг
                    .replace(/^\(лекция\)\s*/, '')
                    .replace(/,\s*$/, '')                // Удаляем запятую в конце, если она есть
                    .trim();


                // Добавляем информацию о паре в массив
                lessons.push({
                    time: time,
                    type: type,
                    subject: subject,
                    teacher: teacher,
                    room: room
                });
            });

            // Добавляем информацию о дне недели и парах
            schedule.push({
                day: dayOfWeek,
                lessons
            });
        });

        return schedule;
    } catch (error) {
        console.error('Error fetching schedule:', error);
    }
}

// Пример вызова функции
const url = 'https://edu.viti-mephi.ru/rasp/raspth.php?group=АЭС-23-Т2, АЭСс-24-Т';
getSchedule(url).then(schedule => console.log(JSON.stringify(schedule, null, 2)));

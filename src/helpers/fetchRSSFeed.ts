import axios from "axios";
import {parseStringPromise} from "xml2js";
import logger from "../utils/logger";

export async function fetchRSSFeed(url: string): Promise<any> {
  try {
    const response = await axios.get(url);
    const result = await parseStringPromise(response.data);
    return result;
  } catch (err) {
    logger.error(`Ошибка получения RSS данных: ${err}`);
    return null;
  }
}
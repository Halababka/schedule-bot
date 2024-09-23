import axios from "axios";
import {parseStringPromise} from "xml2js";

export async function fetchRSSFeed(url: string): Promise<any> {
  try {
    const response = await axios.get(url);
    const result = await parseStringPromise(response.data);
    return result;
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    return null;
  }
}
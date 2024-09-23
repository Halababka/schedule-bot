import {Context} from "telegraf";
import type { Update } from "telegraf/types";
import {DaySchedule, Schedule} from "../../classes/Schedule";
interface HistoryItem {
    action: string;
    match: any[];
}

export interface SessionData {
    messageCount?: number;
    pathHistory: HistoryItem[],
    schedule: any
}

export interface MyContext <U extends Update = Update> extends Context<U> {
    session: SessionData;
    match: any;
}
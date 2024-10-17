import {Context} from "telegraf";
import type {Update} from "telegraf/types";
import {DaySchedule} from "../../classes/Schedule";

interface HistoryItem {
    action: string;
    match: any[];
}

interface Schedule {
    id?: number,
    name: string,
    url: string,
    checksum?: string | null,
    schedule?: string,
    lastUpdate?: Date
}

interface User {
    id: number;
    idTg: number;
    Schedule: Schedule | null
    scheduleId: number | null;
}

export interface SessionData {
    messageCount?: number;
    pathHistory: HistoryItem[],
    schedule: DaySchedule[],
    currGroupMatch: { action: string, match: [] },
    userData: User | null
}

export interface MyContext<U extends Update = Update> extends Context<U> {
    session: SessionData;
    match: any;
    from: any;
}
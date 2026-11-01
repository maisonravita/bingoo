// Heures de Paris et calcul des créneaux de rendez-vous disponibles.
import { admin, type Workspace } from "./core.ts";

const TZ = "Europe/Paris";

type Parts = { y: number; m: number; d: number; h: number; min: number; wd: number };

/** Composantes de la date en heure de Paris (wd : 1 = lundi … 7 = dimanche). */
export function parisParts(date: Date): Parts {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const wdMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, wd: wdMap[p.weekday] };
}

function offsetMinutes(date: Date): number {
  const p = parisParts(date);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
}

/** Convertit une heure locale de Paris en instant UTC. */
export function parisToUtc(y: number, m: number, d: number, h: number, min: number): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  let t = guess - offsetMinutes(new Date(guess)) * 60000;
  t = guess - offsetMinutes(new Date(t)) * 60000;
  return new Date(t);
}

/** Minuit (heure de Paris) du jour courant, en UTC. */
export function parisMidnight(date = new Date()): Date {
  const p = parisParts(date);
  return parisToUtc(p.y, p.m, p.d, 0, 0);
}

export function addParisDays(date: Date, days: number, h: number, min: number): Date {
  const p = parisParts(date);
  const base = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
  return parisToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), h, min);
}

const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « mardi 4 novembre à 14h30 » */
export function frSlot(date: Date): string {
  const p = parisParts(date);
  const day = DAYS[p.wd % 7];
  return `${day} ${p.d} ${MONTHS[p.m - 1]} à ${p.h}h${p.min ? String(p.min).padStart(2, "0") : ""}`;
}

/** Créneaux libres d'un commercial sur les `days` prochains jours (au moins 18 h à l'avance). */
export async function freeSlots(ws: Workspace, days = 14): Promise<Date[]> {
  const now = new Date();
  const earliest = now.getTime() + 18 * 3600_000;
  const horizon = addParisDays(now, days + 1, 0, 0);
  const { data: busy } = await admin
    .from("meetings")
    .select("starts_at, ends_at")
    .eq("workspace_id", ws.id)
    .eq("status", "confirme")
    .gte("ends_at", now.toISOString())
    .lte("starts_at", horizon.toISOString());
  const taken = (busy ?? []).map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()]);
  const dur = Math.max(15, ws.meeting_minutes || 30) * 60000;
  const out: Date[] = [];
  for (let i = 0; i <= days; i++) {
    const dayStart = addParisDays(now, i, 12, 0);
    const p = parisParts(dayStart);
    const windows = (ws.availability as Record<string, [string, string][]>)?.[String(p.wd)] ?? [];
    for (const [from, to] of windows) {
      const [fh, fm] = from.split(":").map(Number);
      const [th, tm] = to.split(":").map(Number);
      let t = parisToUtc(p.y, p.m, p.d, fh, fm).getTime();
      const end = parisToUtc(p.y, p.m, p.d, th, tm).getTime();
      for (; t + dur <= end; t += dur) {
        if (t < earliest) continue;
        if (taken.some(([a, b]) => t < b && t + dur > a)) continue;
        out.push(new Date(t));
      }
    }
  }
  return out;
}

/** Trois créneaux répartis sur trois jours différents si possible. */
export function pickThree(slots: Date[]): Date[] {
  const byDay = new Map<string, Date[]>();
  for (const s of slots) {
    const p = parisParts(s);
    const k = `${p.y}-${p.m}-${p.d}`;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(s);
  }
  const picks: Date[] = [];
  const days = [...byDay.values()];
  for (const list of days) {
    if (picks.length >= 3) break;
    picks.push(list[Math.min(1, list.length - 1)]);
  }
  for (const s of slots) {
    if (picks.length >= 3) break;
    if (!picks.includes(s)) picks.push(s);
  }
  return picks.sort((a, b) => a.getTime() - b.getTime());
}

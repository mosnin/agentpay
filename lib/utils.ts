import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistance, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as currency. Whole numbers render without decimals. */
export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Compact notation, e.g. 1.2k, 3.4M */
export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Accepts a 0..1 ratio and renders a percentage. */
export function formatPercent(ratio: number, fractionDigits = 0) {
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}

export function formatDate(date: Date | string | number) {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | number) {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeTime(date: Date | string | number) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return formatDate(date);
  }
}

export type DeadlineTone = "overdue" | "soon" | "normal";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Describe a deadline relative to now for at-a-glance urgency on active tasks.
 * `overdue` = past due, `soon` = within 24h, `normal` = further out. `now` is
 * injectable so the result is deterministic in tests.
 */
export function deadlineStatus(
  deadline: Date | string | number,
  now: Date | string | number = new Date(),
): { tone: DeadlineTone; label: string } {
  const due = new Date(deadline);
  const ref = new Date(now);
  const diffMs = due.getTime() - ref.getTime();
  if (diffMs <= 0) {
    return { tone: "overdue", label: `Overdue by ${formatDistance(ref, due)}` };
  }
  return {
    tone: diffMs <= DAY_MS ? "soon" : "normal",
    label: `Due ${formatDistance(due, ref, { addSuffix: true })}`,
  };
}

/** Render a latency value (minutes) in a human friendly way. */
export function formatLatency(minutes: number) {
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} hr`;
  return `${Math.round(hours / 24)} d`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return `${str.slice(0, length).trimEnd()}…`;
}

/** Pretty-print any JSON-serializable value. Safe against circular refs. */
export function formatJson(value: unknown, indent = 2) {
  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return String(value);
  }
}

export function safeJsonParse<T = unknown>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

/** Stable, dependency-free hash (FNV-1a) used for deterministic mocks. */
export function hashString(input: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** A short, human readable mock transaction hash. */
export function mockHash(prefix: string, seed: string) {
  const h = hashString(seed).toString(16).padStart(8, "0");
  const h2 = hashString(seed.split("").reverse().join("")).toString(16).padStart(8, "0");
  return `${prefix}_${h}${h2}`;
}

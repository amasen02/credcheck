import type { WriteStream } from "node:tty";
import type { Severity } from "./types.js";

const ESC = "";

const ANSI_CODES: Record<"reset" | "bold" | "dim" | "red" | "yellow" | "cyan" | "green", string> = {
  reset: `${ESC}[0m`,
  bold: `${ESC}[1m`,
  dim: `${ESC}[2m`,
  red: `${ESC}[31m`,
  yellow: `${ESC}[33m`,
  cyan: `${ESC}[36m`,
  green: `${ESC}[32m`,
};

const SEVERITY_COLOR: Record<Severity, keyof typeof ANSI_CODES> = {
  critical: "red",
  high: "yellow",
  medium: "cyan",
};

export function colorsEnabled(stream: NodeJS.WriteStream, env: NodeJS.ProcessEnv): boolean {
  if (env.NO_COLOR !== undefined) {
    return false;
  }
  // FORCE_COLOR is a two-way override: any non-"0" value forces color on, "0" forces it off,
  // regardless of whether the output stream is a TTY - only its absence falls back to TTY detection.
  if (env.FORCE_COLOR !== undefined) {
    return env.FORCE_COLOR !== "0";
  }
  return isTty(stream);
}

function isTty(stream: NodeJS.WriteStream): boolean {
  return (stream as Partial<WriteStream>).isTTY === true;
}

export function paint(text: string, color: keyof typeof ANSI_CODES, useColor: boolean): string {
  if (!useColor) {
    return text;
  }
  return `${ANSI_CODES[color]}${text}${ANSI_CODES.reset}`;
}

export function paintSeverity(severity: Severity, useColor: boolean): string {
  return paint(severity.toUpperCase(), SEVERITY_COLOR[severity], useColor);
}

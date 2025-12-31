import { colors } from "./colors";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LoggerOptions {
  level?: LogLevel;
  timestamp?: boolean;
  pretty?: boolean;
}

export class Logger {
  private level: LogLevel;
  private showTimestamp: boolean;
  private pretty: boolean;

  constructor(private name: string, options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.showTimestamp = options.timestamp ?? true;
    this.pretty = options.pretty ?? true;
  }

  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  private formatMessage(level: string, color: string, ...args: any[]): void {
    if (!this.pretty) {
      console.log(
        JSON.stringify({
          timestamp: this.getTimestamp(),
          level,
          name: this.name,
          message: args
            .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
            .join(" "),
        })
      );
      return;
    }

    let message = "";

    if (this.showTimestamp) {
      message += `${colors.gray}${this.getTimestamp()}${colors.reset} `;
    }

    message += `${color}[${level}]${colors.reset} `;
    message += `${colors.cyan}[${this.name}]${colors.reset} `;

    console.log(message, ...args);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  debug(...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.formatMessage("DEBUG", colors.blue, ...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.formatMessage("INFO", colors.green, ...args);
    }
  }

  log(...args: any[]): void {
    this.info(...args);
  }

  warn(...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.formatMessage("WARN", colors.yellow, ...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.formatMessage("ERROR", colors.red, ...args);
    }
  }

  fatal(...args: any[]): void {
    if (this.shouldLog(LogLevel.FATAL)) {
      this.formatMessage("FATAL", colors.magenta, ...args);
    }
  }

  child(childName: string): Logger {
    return new Logger(`${this.name}:${childName}`, {
      level: this.level,
      timestamp: this.showTimestamp,
      pretty: this.pretty,
    });
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  group(label: string, callback: () => void): void {
    console.group(`${colors.cyan}${label}${colors.reset}`);
    callback();
    console.groupEnd();
  }

  async time<T>(label: string, callback: () => Promise<T> | T): Promise<T> {
    const start = performance.now();
    this.debug(`⏱️  Starting: ${label}`);

    try {
      const result = await callback();
      const duration = (performance.now() - start).toFixed(2);
      this.debug(`✅ Completed: ${label} (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = (performance.now() - start).toFixed(2);
      this.error(`❌ Failed: ${label} (${duration}ms)`, error);
      throw error;
    }
  }
}

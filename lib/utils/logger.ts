import { colors } from "./colors";

export class Logger {
  constructor(private name: string) {}

  log(...input: any[]) {
    console.log(`${colors.green}[${this.name}]`, ...input);
  }
}

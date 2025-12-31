// Cores básicas
export const colors = {
  // Cores originais
  red: "\x1b[31m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  purple: "\x1b[35m",
  reset: "\x1b[0m",

  // Novas cores adicionadas para o Logger
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m", // Alias para purple
  gray: "\x1b[90m",
  white: "\x1b[37m",

  // Cores brilhantes (bright/bold versions)
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",

  // Cores de fundo (background)
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",

  // Estilos de texto
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  strikethrough: "\x1b[9m",
} as const;

// Tipo para garantir type-safety
export type Color = keyof typeof colors;

// Helper function para combinar cores e estilos
export const colorize = (text: string, ...styles: string[]): string => {
  return `${styles.join("")}${text}${colors.reset}`;
};

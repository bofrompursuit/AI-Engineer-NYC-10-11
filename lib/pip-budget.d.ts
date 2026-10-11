export function pipDailyLimit(name: string, fallback: number): number | null
export function reservePipBudget(kind: "text" | "voice", limit: number): Promise<{ allowed: boolean; remaining: number }>

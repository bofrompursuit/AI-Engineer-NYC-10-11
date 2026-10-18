export function peachesDailyLimit(name: string, fallback: number): number | null
export function reservePeachesBudget(kind: "text" | "voice", limit: number): Promise<{ allowed: boolean; remaining: number }>

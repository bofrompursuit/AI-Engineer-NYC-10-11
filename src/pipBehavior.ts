export type PipMood = "idle" | "speaking" | "thinking" | "correct" | "retry" | "complete"
export type PipReactionKind = "correct" | "retry" | "complete"
export type PipReaction = { kind: PipReactionKind; questionId: string; serial: number }

export const pipReactionDuration = { correct: 2000, retry: 1800, complete: 2600 }

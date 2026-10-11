import data from "./data/journeys.json"

export type JourneyId = "physics" | "calculus" | "biopharma"
export type Question = {
  id: string
  title: string
  scene: string
  question: string
  formula: string
  options: string[]
  correct: number
  hint: string
  concept: string
  explanation: string
}
export type Journey = {
  id: JourneyId
  letter: string
  name: string
  title: string
  tag: string
  symbol: string
  accent: string
  description: string
  intro: string
  questions: Question[]
}
export const journeys = data as Journey[]
export const getJourney = (id: JourneyId) =>
  journeys.find((journey) => journey.id === id)!

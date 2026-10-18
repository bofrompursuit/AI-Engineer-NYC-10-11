type PeachesRequest = {
  method?: string
  headers: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string }
  body?: unknown
}
type PeachesResponse = {
  setHeader(name: string, value: string): unknown
  status(code: number): { json(body: unknown): unknown }
}
export default function handler(req: PeachesRequest, res: PeachesResponse): Promise<unknown>

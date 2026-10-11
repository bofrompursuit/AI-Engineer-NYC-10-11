type PipRequest = {
  method?: string
  headers: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string }
  body?: unknown
}
type PipResponse = {
  setHeader(name: string, value: string): unknown
  status(code: number): { json(body: unknown): unknown }
}
export default function handler(req: PipRequest, res: PipResponse): Promise<unknown>

export type FacebookEvent = {
  id: string
  type: 'facebook'
  payload: Record<string, unknown>
}

export type TiktokEvent = {
  id: string
  type: 'tiktok'
  payload: Record<string, unknown>
}

export type Event = FacebookEvent | TiktokEvent 
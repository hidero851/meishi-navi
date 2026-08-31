export interface Card {
  id: string
  name: string
  kana: string
  company: string
  dept: string
  title: string
  phone: string
  mobile: string
  email: string
  addr: string
  web: string
  notes: string
  importance: number
  front_photo_url: string | null
  back_photo_url: string | null
  created_at: string
  updated_at: string
}

export type CardForm = Omit<Card, 'id' | 'created_at' | 'updated_at'>

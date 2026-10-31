export type Category = {
  id: string
  user_id: string
  name: string
  color: string | null
  icon: string | null
  position: number
}

export type Task = {
  id: string
  user_id: string
  category_id: string | null
  parent_id: string | null
  title: string
  notes: string | null
  is_done: boolean
  completed_at: string | null
  due_date: string | null // yyyy-MM-dd
  due_time: string | null // HH:mm:ss
  reminder_minutes: number | null
  recurrence_rule: string | null
  position: number
  created_at: string
}

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

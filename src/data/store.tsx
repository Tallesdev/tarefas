import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { nextDueDate } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { Category, Task } from '../lib/types'

type NewTask = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>> & { title: string }

type Store = {
  ready: boolean
  error: string | null
  clearError: () => void
  categories: Category[]
  tasks: Task[] // inclui subtarefas (parent_id != null)
  addCategory: (name: string) => Promise<void>
  renameCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  addTask: (t: NewTask) => Promise<Task>
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

const TASK_COLS =
  'id,user_id,category_id,parent_id,title,notes,is_done,completed_at,due_date,due_time,reminder_minutes,recurrence_rule,position,created_at'

export function StoreProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  const load = useCallback(async () => {
    const [cats, tks] = await Promise.all([
      supabase.from('categories').select('id,user_id,name,color,icon,position').is('deleted_at', null).order('position'),
      supabase.from('tasks').select(TASK_COLS).is('deleted_at', null).order('position').order('created_at'),
    ])
    if (cats.error || tks.error) {
      setError('Não foi possível carregar seus dados. Verifique a conexão e tente de novo.')
    } else {
      setCategories(cats.data as Category[])
      setTasks(tks.data as Task[])
    }
    setReady(true)
  }, [])

  useEffect(() => {
    load()
    // sincroniza ao voltar para o app (ex.: editou em outro aparelho)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  // Executa a escrita no servidor; se falhar, recarrega o estado real e avisa.
  const run = useCallback(
    async (op: PromiseLike<{ error: unknown }>, message: string) => {
      const { error: err } = await op
      if (err) {
        console.error(err)
        setError(message)
        await load()
      }
    },
    [load],
  )

  const addCategory = useCallback(
    async (name: string) => {
      const cat: Category = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: name.trim(),
        color: null,
        icon: null,
        position: categories.length,
      }
      setCategories((c) => [...c, cat])
      await run(supabase.from('categories').insert(cat), 'Não foi possível criar a categoria.')
    },
    [categories.length, run, userId],
  )

  const renameCategory = useCallback(
    async (id: string, name: string) => {
      setCategories((c) => c.map((x) => (x.id === id ? { ...x, name } : x)))
      await run(supabase.from('categories').update({ name }).eq('id', id), 'Não foi possível renomear a categoria.')
    },
    [run],
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      setCategories((c) => c.filter((x) => x.id !== id))
      setTasks((t) => t.map((x) => (x.category_id === id ? { ...x, category_id: null } : x)))
      await run(
        supabase.from('tasks').update({ category_id: null }).eq('category_id', id),
        'Não foi possível excluir a categoria.',
      )
      await run(
        supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', id),
        'Não foi possível excluir a categoria.',
      )
    },
    [run],
  )

  const addTask = useCallback(
    async (t: NewTask) => {
      const task: Task = {
        id: crypto.randomUUID(),
        user_id: userId,
        category_id: null,
        parent_id: null,
        notes: null,
        is_done: false,
        completed_at: null,
        due_date: null,
        due_time: null,
        reminder_minutes: null,
        recurrence_rule: null,
        position: 0,
        created_at: new Date().toISOString(),
        ...t,
        title: t.title.trim(),
      }
      setTasks((x) => [...x, task])
      const { created_at: _c, ...row } = task
      await run(supabase.from('tasks').insert(row), 'Não foi possível salvar a tarefa.')
      return task
    },
    [run, userId],
  )

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      setTasks((x) => x.map((t) => (t.id === id ? { ...t, ...patch } : t)))
      await run(supabase.from('tasks').update(patch).eq('id', id), 'Não foi possível atualizar a tarefa.')
    },
    [run],
  )

  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id)
      if (!task) return
      const done = !task.is_done
      await updateTask(id, { is_done: done, completed_at: done ? new Date().toISOString() : null })
      // tarefa repetida: ao concluir, cria a próxima ocorrência
      if (done && task.recurrence_rule && task.due_date && !task.parent_id) {
        await addTask({
          title: task.title,
          category_id: task.category_id,
          notes: task.notes,
          due_date: nextDueDate(task.due_date, task.recurrence_rule),
          due_time: task.due_time,
          reminder_minutes: task.reminder_minutes,
          recurrence_rule: task.recurrence_rule,
        })
        // a concluída deixa de repetir (a regra passou para a nova)
        await updateTask(id, { recurrence_rule: null })
      }
    },
    [addTask, tasks, updateTask],
  )

  const deleteTask = useCallback(
    async (id: string) => {
      const ids = [id, ...tasks.filter((t) => t.parent_id === id).map((t) => t.id)]
      setTasks((x) => x.filter((t) => !ids.includes(t.id)))
      await run(
        supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).in('id', ids),
        'Não foi possível excluir a tarefa.',
      )
    },
    [run, tasks],
  )

  const value = useMemo<Store>(
    () => ({
      ready,
      error,
      clearError: () => setError(null),
      categories,
      tasks,
      addCategory,
      renameCategory,
      deleteCategory,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
    }),
    [ready, error, categories, tasks, addCategory, renameCategory, deleteCategory, addTask, updateTask, toggleTask, deleteTask],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore precisa estar dentro de StoreProvider')
  return ctx
}

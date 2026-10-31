import { useState } from 'react'
import { supabase } from '../lib/supabase'

const messages: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'User already registered': 'Este e-mail já tem conta. Toque em Entrar.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
}

export default function Login() {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!email.trim() || password.length < 6) {
      setError('Preencha o e-mail e uma senha com pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    if (mode === 'entrar') {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (err) setError(messages[err.message] ?? err.message)
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (err) setError(messages[err.message] ?? err.message)
      else if (!data.session) setInfo('Conta criada. Abra o link que enviamos para seu e-mail e depois entre aqui.')
    }
    setLoading(false)
  }

  return (
    <main className="login">
      <div className="login-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <h1>Tarefas</h1>
      <p className="login-sub">Tarefas, hábitos e foco em um só lugar.</p>

      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={mode === 'entrar'} className={mode === 'entrar' ? 'on' : ''} onClick={() => setMode('entrar')}>
          Entrar
        </button>
        <button role="tab" aria-selected={mode === 'criar'} className={mode === 'criar' ? 'on' : ''} onClick={() => setMode('criar')}>
          Criar conta
        </button>
      </div>

      <form onSubmit={submit} className="login-form">
        <label className="field-label">
          E-mail
          <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field-label">
          Senha
          <input
            className="field"
            type="password"
            autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        {info && <p className="form-info">{info}</p>}
        <button className="btn-primary" disabled={loading}>
          {loading ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon, { type IconName } from '../components/Icon'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../data/auth'
import { useSettings } from '../data/settings'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'
import { supabase } from '../lib/supabase'
import { ACCENTS, type ThemeMode } from '../lib/theme'

const MODES: [ThemeMode, IconName, string][] = [
  ['light', 'sun', 'Claro'],
  ['dark', 'moon', 'Escuro'],
  ['system', 'monitor', 'Automático'],
]

const PUSH_TEXT: Record<PushState, string> = {
  on: 'Ativados neste aparelho',
  off: 'Desativados',
  denied: 'Bloqueados nas configurações do navegador',
  unsupported: 'Este navegador não permite notificações',
  'needs-install': 'No iPhone, instale o app na tela de início primeiro',
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { settings, updateSettings } = useSettings()
  const [push, setPush] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

  useEffect(() => {
    pushState().then(setPush)
  }, [])

  const togglePush = async () => {
    if (!session) return
    setBusy(true)
    setPushError(null)
    try {
      setPush(push === 'on' ? await disablePush() : await enablePush(session.user.id))
    } catch (e) {
      console.error(e)
      setPushError('Não foi possível ativar agora. Tente de novo em instantes.')
    }
    setBusy(false)
  }

  const mode = settings.theme ?? 'system'
  const accent = settings.accent ?? 'grafite'

  return (
    <div className="page detail">
      <PageHeader
        title="Ajustes"
        left={
          <button className="icon-btn" aria-label="Voltar" onClick={() => navigate(-1)}>
            <Icon name="back" />
          </button>
        }
      />
      <main className="content settings">
        <h2 className="section-title">Aparência</h2>
        <section className="panel">
          <div className="theme-modes">
            {MODES.map(([id, icon, label]) => (
              <button key={id} className={`theme-mode ${mode === id ? 'on' : ''}`} aria-pressed={mode === id} onClick={() => updateSettings({ theme: id })}>
                <span className={`theme-preview ${id}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="theme-label">
                  <Icon name={icon} size={16} /> {label}
                </span>
              </button>
            ))}
          </div>
          <div className="field-label spaced">Cor de destaque</div>
          <div className="swatches">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                className={`swatch ${accent === a.id ? 'on' : ''}`}
                style={{ ['--sw' as string]: a.swatch }}
                aria-label={a.name}
                aria-pressed={accent === a.id}
                title={a.name}
                onClick={() => updateSettings({ accent: a.id })}
              >
                {accent === a.id && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
        </section>

        <h2 className="section-title">Notificações</h2>
        <section className="panel">
          <div className="setting-row">
            <Icon name="bell" />
            <div className="setting-text">
              <strong>Lembretes</strong>
              <span>{push ? PUSH_TEXT[push] : 'Verificando…'}</span>
            </div>
            {(push === 'on' || push === 'off') && (
              <button className={`switch ${push === 'on' ? 'on' : ''}`} role="switch" aria-checked={push === 'on'} disabled={busy} onClick={togglePush}>
                <i />
              </button>
            )}
          </div>
          {pushError && <p className="form-error">{pushError}</p>}
          <p className="panel-sub">
            Avisa no horário dos lembretes das tarefas e dos hábitos, mesmo com o app fechado. Ative em cada aparelho que você usa.
          </p>
        </section>

        <h2 className="section-title">Geral</h2>
        <section className="panel links">
          <button className="setting-row link" onClick={() => navigate('/sugestoes')}>
            <Icon name="clipboard" />
            <div className="setting-text">
              <strong>Sugestões de tarefas</strong>
              <span>Perfil e sugestões personalizadas</span>
            </div>
            <Icon name="chevronRight" size={18} />
          </button>
          <button className="setting-row link" onClick={() => navigate('/foco')}>
            <Icon name="timer" />
            <div className="setting-text">
              <strong>Foco</strong>
              <span>
                {settings.focusMinutes ?? 25} min de foco · {settings.breakMinutes ?? 5} min de pausa
              </span>
            </div>
            <Icon name="chevronRight" size={18} />
          </button>
        </section>

        <h2 className="section-title">Conta</h2>
        <section className="panel links">
          <div className="setting-row">
            <Icon name="user" />
            <div className="setting-text">
              <strong>{session?.user.email}</strong>
              <span>Seus dados ficam sincronizados entre aparelhos</span>
            </div>
          </div>
          <button className="setting-row link danger" onClick={() => supabase.auth.signOut()}>
            <Icon name="logout" />
            <div className="setting-text">
              <strong>Sair da conta</strong>
            </div>
          </button>
        </section>
        <p className="version">Tarefas · versão 1.0</p>
      </main>
    </div>
  )
}

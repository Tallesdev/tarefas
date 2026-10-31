import { useEffect } from 'react'
import { useStore } from '../data/store'

export default function Toast() {
  const { error, clearError } = useStore()
  useEffect(() => {
    if (!error) return
    const t = setTimeout(clearError, 5000)
    return () => clearTimeout(t)
  }, [error, clearError])
  if (!error) return null
  return (
    <div className="toast" role="alert" onClick={clearError}>
      {error}
    </div>
  )
}

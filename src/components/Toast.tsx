import { useEffect } from 'react'
import { useStore } from '../data/store'

export default function Toast() {
  const { notice, clearNotice } = useStore()
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(clearNotice, notice.action ? 6000 : 4000)
    return () => clearTimeout(t)
  }, [notice, clearNotice])
  if (!notice) return null
  return (
    <div className="toast" role="status">
      <span>{notice.text}</span>
      {notice.action && (
        <button
          onClick={() => {
            notice.action!.run()
            clearNotice()
          }}
        >
          {notice.action.label}
        </button>
      )}
    </div>
  )
}

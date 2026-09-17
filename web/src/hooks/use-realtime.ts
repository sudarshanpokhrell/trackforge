import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api, isApiError } from '@/lib/api'
import { applyEvent, clientId } from '@/lib/realtime'
import { EVENT_TYPES, type RealtimeEvent } from '@/types/realtime'

const MAX_RETRY_DELAY = 30_000

export function useRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    let source: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    let missedEvents = false
    let stopped = false

    const onEvent = (msg: MessageEvent<string>) => {
      const event = JSON.parse(msg.data) as RealtimeEvent
      if (event.client_id === clientId) return
      applyEvent(qc, event)
    }

    const connect = () => {
      if (stopped) return
      const es = new EventSource(`/api/v1/events?client_id=${clientId}`)
      source = es

      es.onopen = () => {
        attempt = 0
        if (missedEvents) void qc.invalidateQueries()
        missedEvents = false
      }

      es.onerror = () => {
        missedEvents = true
        if (es.readyState !== EventSource.CLOSED) return
        es.close()
        void recover()
      }

      for (const type of EVENT_TYPES) es.addEventListener(type, onEvent)
    }

    const recover = async () => {
      try {
        await api.get('projects')
      } catch (e) {
        if (isApiError(e, 401) || isApiError(e, 403)) return
      }
      if (stopped) return
      const delay = Math.min(MAX_RETRY_DELAY, 1000 * 2 ** attempt++)
      retryTimer = setTimeout(connect, delay)
    }

    connect()

    return () => {
      stopped = true
      clearTimeout(retryTimer)
      source?.close()
    }
  }, [qc])
}

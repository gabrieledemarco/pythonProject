import { useEffect, useRef } from 'react'
import { createSimAdapter } from '../data/simAdapter'
import useRaceStore from '../store/useRaceStore'

const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'sim'
const BRIDGE_WS = import.meta.env.VITE_BRIDGE_WS || 'ws://localhost:8771'

const BACKOFF = [1000, 2000, 4000, 8000, 16000, 30000]

export function useDataSource() {
  const setRaceState = useRaceStore((s) => s.setRaceState)
  const setConnectionStatus = useRaceStore((s) => s.setConnectionStatus)
  const wsRef = useRef(null)
  const retryRef = useRef(0)
  const unmountedRef = useRef(false)

  useEffect(() => {
    unmountedRef.current = false

    if (DATA_SOURCE === 'sim') {
      setConnectionStatus('sim')
      const adapter = createSimAdapter((state) => {
        if (!unmountedRef.current) setRaceState(state)
      })
      adapter.start()
      return () => {
        unmountedRef.current = true
        adapter.stop()
      }
    }

    // bridge mode
    function connect() {
      if (unmountedRef.current) return
      setConnectionStatus('reconnecting')

      const ws = new WebSocket(BRIDGE_WS)
      wsRef.current = ws

      ws.onopen = () => {
        retryRef.current = 0
        setConnectionStatus('live')
      }

      ws.onmessage = (evt) => {
        try {
          const state = JSON.parse(evt.data)
          setRaceState(state)
        } catch {
          // ignore malformed frames
        }
      }

      ws.onerror = () => {
        ws.close()
      }

      ws.onclose = () => {
        if (unmountedRef.current) return
        setConnectionStatus('reconnecting')
        const delay = BACKOFF[Math.min(retryRef.current, BACKOFF.length - 1)]
        retryRef.current += 1
        setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      unmountedRef.current = true
      if (wsRef.current) wsRef.current.close()
    }
  }, [])
}

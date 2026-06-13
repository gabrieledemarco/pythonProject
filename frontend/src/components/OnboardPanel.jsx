import { useState } from 'react'
import onboardsConfig from '../../onboards.config.json'

const SLOT_COUNT = 5

export default function OnboardPanel() {
  const defaultSlots = onboardsConfig.slice(0, SLOT_COUNT).map((o) => o.id)
  const [slots, setSlots] = useState(defaultSlots)
  const [focusSlot, setFocusSlot] = useState(0)

  function setSlotVideo(slotIdx, videoId) {
    setSlots((prev) => prev.map((v, i) => (i === slotIdx ? videoId : v)))
  }

  function getVideo(id) {
    return onboardsConfig.find((o) => o.id === id)
  }

  return (
    <div className="onboard-panel">
      <div className="panel-title">ONBOARD CAMERAS</div>
      <div className="onboard-grid">
        {slots.map((slotId, idx) => {
          const video = getVideo(slotId)
          const isFocus = idx === focusSlot
          return (
            <div
              key={idx}
              className={`onboard-slot${isFocus ? ' focus' : ''}`}
              onClick={() => setFocusSlot(idx)}
            >
              <div className="slot-header">
                <select
                  className="slot-select"
                  value={slotId}
                  onChange={(e) => setSlotVideo(idx, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {onboardsConfig.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {video ? (
                <iframe
                  className="onboard-iframe"
                  src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=0&mute=1&rel=0`}
                  title={video.label}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <div className="slot-empty">No feed selected</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

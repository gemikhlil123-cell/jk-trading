'use client'

interface Props {
  currentPnl: number
  target: number
}

export function LucidChallenge({ currentPnl, target }: Props) {
  const pct = Math.min(100, Math.max(0, (currentPnl / target) * 100))
  const achieved = currentPnl >= target
  const remaining = target - currentPnl

  return (
    <div className="card-gold p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[#D4AF37] text-xs font-bold tracking-wide">🎯 تقدم Lucid Challenge</p>
          <p className="text-[#4A5A7A] text-[10px] mt-0.5">الهدف: <span className="text-[#D4AF37] font-bold">${target.toLocaleString()}</span></p>
        </div>
        <p className={`text-2xl font-black ${achieved ? 'text-[#D4AF37]' : currentPnl >= 0 ? 'text-[#1DB954]' : 'text-[#E74C3C]'}`}>
          {pct.toFixed(1)}%
        </p>
      </div>

      <div className="progress-track mb-2">
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            background: achieved
              ? 'linear-gradient(90deg, #D4AF37, #F5E6A3)'
              : currentPnl >= 0
              ? 'linear-gradient(90deg, #A07D1C, #D4AF37)'
              : 'linear-gradient(90deg, #991B1B, #E74C3C)',
          }}
        />
      </div>

      <div className="flex justify-between text-xs mt-2">
        <span className="text-[#8899BB]">
          المحقق: <b className={currentPnl >= 0 ? 'text-[#1DB954]' : 'text-[#E74C3C]'}>
            {currentPnl >= 0 ? '+' : ''}${currentPnl.toFixed(0)}
          </b>
        </span>
        <span className="text-[#4A5A7A]">
          {achieved ? '🏆 تم تحقيق الهدف!' : `المتبقي: $${remaining.toFixed(0)}`}
        </span>
      </div>
    </div>
  )
}

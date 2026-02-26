import { useSocket } from '../hooks/useSocket';
import { resourceUrl } from '../config/api';
import './ProjectorPage.css';

export default function ProjectorPage() {
  const { state } = useSocket();

  const as = state?.auctionState || {};
  const config = state?.config || {};
  const teams = state?.teams || [];
  const { phase, currentPlayer: p, currentBid, leadingTeam, bidHistory = [], timerRemaining = 0 } = as;

  const isIdle = !p || phase === 'idle';
  const isLive = phase === 'live';
  const nextIncrement =
    (currentBid || 0) < (config.thresholdBid ?? 200)
      ? config.highIncrement ?? 20
      : config.lowIncrement ?? 10;
  const nextBid = (currentBid || 0) + nextIncrement;

  return (
    <div className="proj-root">
      {isIdle ? (
        <div className="proj-idle">
          <div className="proj-idle-inner">
            {config.leagueLogo && (
              <img
                className="proj-idle-logo"
                src={resourceUrl(config.leagueLogo)}
                alt=""
              />
            )}
            <h1 className="proj-idle-title">
              {config.leagueName || 'Premier Player League'}
            </h1>
            <p className="proj-idle-season">
              {config.leagueSeason || 'Season 7'} · Live Auction
            </p>
            <div className="proj-idle-live-badge">
              <span className="proj-idle-dot" />
              LIVE
            </div>
          </div>
        </div>
      ) : (
        <div className="proj-live">
          <div className="proj-live-body">
            <div className="proj-hero">
              <div className="proj-hero-photo-wrap">
                <img
                  className="proj-hero-photo"
                  src={resourceUrl(p?.photo)}
                  alt=""
                />
                <div className="proj-hero-photo-edge" />
              </div>

              <div className="proj-hero-info">
                <span className="proj-hero-pos">{p?.position}</span>
                <h2 className="proj-hero-name">{p?.name}</h2>
                <div className="proj-hero-meta">
                  <span className="proj-hero-rating">
                    <strong>{p?.rating}</strong> OVR
                  </span>
                  <span className="proj-hero-base">
                    Base ₹{p?.basePrice?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="proj-bid-block">
              <div className="proj-bid-label">Current bid</div>
              <div className="proj-bid-value">₹{(currentBid || 0).toLocaleString()}</div>
              {isLive && (
                <div
                  className={`proj-timer ${(timerRemaining ?? 0) <= 3 ? 'proj-timer-crit' : ''}`}
                >
                  {Math.max(0, timerRemaining ?? 0)}s
                </div>
              )}
              <div className="proj-leader">
                {leadingTeam ? (
                  <>
                    {leadingTeam.logo && (
                      <img
                        className="proj-leader-logo"
                        src={resourceUrl(leadingTeam.logo)}
                        alt=""
                      />
                    )}
                    <span
                      className="proj-leader-name"
                      style={{
                        backgroundColor: leadingTeam.color,
                        color: leadingTeam.color === '#ffffff' || leadingTeam.color === '#fff' ? '#111' : '#fff',
                      }}
                    >
                      {leadingTeam.name}
                    </span>
                  </>
                ) : (
                  <span className="proj-leader-empty">No bids yet</span>
                )}
              </div>
              <div className="proj-next-bid">
                Next bid: ₹{nextBid.toLocaleString()}
              </div>
              {bidHistory.length > 0 && (
                <div className="proj-history">
                  {bidHistory.slice(0, 5).map((b, i) => (
                    <div key={i} className="proj-history-row">
                      {b.logo ? (
                        <img className="proj-history-logo" src={resourceUrl(b.logo)} alt="" />
                      ) : (
                        <span
                          className="proj-history-dot"
                          style={{ backgroundColor: b.color }}
                        />
                      )}
                      <span className="proj-history-team" style={{ color: b.color }}>
                        {i === 0 ? '↑ ' : ''}{b.team}
                      </span>
                      <span className="proj-history-amount">₹{b.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <footer className="proj-strip">
            {teams.map((t) => {
              const isLeading = leadingTeam?.id === t.id;
              const rem = t.budget - t.spent;
              return (
                <div
                  key={t.id}
                  className={`proj-strip-item ${isLeading ? 'proj-strip-item-leading' : ''}`}
                >
                  {t.logo ? (
                    <img className="proj-strip-logo" src={resourceUrl(t.logo)} alt="" />
                  ) : (
                    <span
                      className="proj-strip-dot"
                      style={{ backgroundColor: t.color }}
                    />
                  )}
                  <div className="proj-strip-text">
                    <span className="proj-strip-name" style={{ color: t.color }}>
                      {isLeading ? '↑ ' : ''}{t.name}
                    </span>
                    <span className="proj-strip-count">
                      {t.players?.length || 0} players
                    </span>
                  </div>
                  <div className="proj-strip-budget">
                    <span className="proj-strip-amount" style={isLeading ? { color: t.color } : {}}>
                      ₹{rem.toLocaleString()}
                    </span>
                    <span className="proj-strip-lbl">left</span>
                  </div>
                </div>
              );
            })}
          </footer>
        </div>
      )}
    </div>
  );
}

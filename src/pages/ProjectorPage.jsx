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

  return (
    <div className="proj-root min-vh-100">
      {isIdle ? (
        <div className="proj-idle d-flex flex-column align-items-center justify-content-center position-fixed top-0 start-0 end-0 bottom-0">
          {config.leagueLogo && (
            <img
              className="proj-idle-logo img-fluid mb-4"
              src={resourceUrl(config.leagueLogo)}
              alt=""
            />
          )}
          <h1 className="proj-idle-name text-uppercase">{config.leagueName || 'PPL'}</h1>
          <p className="proj-idle-season text-uppercase">
            {config.leagueName || 'PPL'} · {config.leagueSeason || 'Season 7'}
          </p>
          <div className="proj-idle-dot mt-5">LIVE AUCTION</div>
        </div>
      ) : (
        <div className="proj-main d-flex flex-column position-fixed top-0 start-0 end-0 bottom-0">
          <div className="proj-main-area flex-grow-1 row g-0">
            <div className="proj-col-photo col-12 col-lg-4 position-relative overflow-hidden">
              <img
                className="proj-player-img img-fluid w-100 h-100"
                src={resourceUrl(p?.photo)}
                alt=""
                style={{ objectFit: 'cover', objectPosition: 'top center' }}
              />
              <div className="proj-col-photo-fade position-absolute top-0 start-0 end-0 bottom-0" />
            </div>

            <div className="proj-col-bid col-12 col-lg-4 d-flex flex-column align-items-center justify-content-center position-relative p-4">
              <div className="proj-bid-lbl text-uppercase small text-muted">Current bid</div>
              {isLive && (
                <span
                  className={`badge proj-countdown mb-2 ${(timerRemaining ?? 0) <= 3 ? 'proj-countdown-crit' : ''}`}
                >
                  {Math.max(0, timerRemaining ?? 0)}s
                </span>
              )}
              <div className="proj-bid-amount text-success fw-bold text-center">
                ₹{(currentBid || 0).toLocaleString()}
              </div>
              <div className="proj-leader-block d-flex flex-column align-items-center gap-2 mt-2">
                {leadingTeam ? (
                  <>
                    {leadingTeam.logo && (
                      <img
                        className="proj-leader-logo rounded"
                        src={resourceUrl(leadingTeam.logo)}
                        alt=""
                      />
                    )}
                    <div
                      className="proj-leader-name rounded px-3 py-1 fw-bold text-truncate"
                      style={{ background: leadingTeam.color, color: '#000', maxWidth: '100%' }}
                    >
                      {leadingTeam.name}
                    </div>
                  </>
                ) : (
                  <div className="proj-leader-name proj-no-bids rounded px-3 py-1">
                    No bids yet
                  </div>
                )}
              </div>
              <div className="proj-bid-divider my-2" />
              <p className="proj-next-row small text-muted text-center mb-0">
                Next bid: ₹
                {(currentBid || 0) +
                  (currentBid < (config.thresholdBid ?? 200)
                    ? (config.highIncrement ?? 20)
                    : (config.lowIncrement ?? 10))}
              </p>
              <div className="proj-bid-hist w-100 mt-3">
                {bidHistory.slice(0, 5).map((b, i) => (
                  <div key={i} className="d-flex align-items-center gap-2 py-2 px-2 rounded proj-bh-row">
                    {b.logo ? (
                      <img
                        className="proj-bh-tlogo rounded flex-shrink-0"
                        src={resourceUrl(b.logo)}
                        alt=""
                      />
                    ) : (
                      <div
                        className="proj-bh-tlogo rounded flex-shrink-0"
                        style={{ background: b.color, opacity: 0.5, width: 16, height: 16 }}
                      />
                    )}
                    <span className="fw-bold flex-grow-1 text-truncate" style={{ color: b.color }}>
                      {i === 0 ? '🏆 ' : ''}{b.team}
                    </span>
                    <span className="text-success small flex-shrink-0">
                      ₹{b.amount?.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="proj-col-details col-12 col-lg-4 position-relative d-flex flex-column justify-content-end overflow-hidden">
              <div
                className="proj-details-bg position-absolute"
                style={p?.photo ? { backgroundImage: `url(${resourceUrl(p.photo)})` } : {}}
              />
              <div className="proj-details-overlay position-absolute top-0 start-0 end-0 bottom-0" />
              <div className="proj-details-content position-relative p-4">
                {config.leagueLogo && (
                  <div className="d-flex align-items-center gap-2 mb-3 proj-league-badge">
                    <img src={resourceUrl(config.leagueLogo)} alt="" className="proj-league-img" />
                    <span className="small fw-bold text-uppercase text-muted">
                      {config.leagueSeason || ''}
                    </span>
                  </div>
                )}
                <span className="badge bg-success align-self-start mb-2 proj-detail-pos">
                  {p?.position}
                </span>
                <h2 className="proj-detail-name text-uppercase fw-bold mb-2">{p?.name}</h2>
                <div className="d-flex align-items-center proj-detail-rating-row">
                  <div className="proj-rating-ring rounded-circle border border-success d-flex flex-column align-items-center justify-content-center">
                    <span className="proj-num text-success fw-bold">{p?.rating}</span>
                    <span className="proj-lbl text-success small">OVR</span>
                  </div>
                </div>
                <p className="proj-detail-meta small text-muted mb-0">
                  BASE PRICE ₹{p?.basePrice?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="proj-strip d-flex flex-shrink-0 border-top">
            {teams.map((t) => {
              const isLeading = leadingTeam?.id === t.id;
              const rem = t.budget - t.spent;
              return (
                <div
                  key={t.id}
                  className={`proj-strip-team flex-grow-1 d-flex align-items-center gap-2 px-2 ${isLeading ? 'proj-strip-leading' : ''}`}
                >
                  {t.logo ? (
                    <img
                      className="proj-s-logo rounded flex-shrink-0"
                      src={resourceUrl(t.logo)}
                      alt=""
                    />
                  ) : (
                    <div
                      className="proj-s-logo rounded flex-shrink-0"
                      style={{
                        background: t.color,
                        opacity: isLeading ? 0.6 : 0.2,
                        width: 36,
                        height: 36,
                      }}
                    />
                  )}
                  <div className="proj-s-info flex-grow-1 min-w-0">
                    <div
                      className="proj-s-name fw-bold text-truncate"
                      style={{
                        color: t.color,
                        ...(isLeading ? { textShadow: `0 0 12px ${t.color}88` } : {}),
                      }}
                    >
                      {isLeading ? '⬆ ' : ''}{t.name}
                    </div>
                    <div className="proj-s-count small text-muted">
                      {t.players?.length || 0} player{(t.players?.length || 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="proj-s-budget text-end flex-shrink-0">
                    <div
                      className="proj-s-bnum fw-bold"
                      style={isLeading ? { color: t.color } : {}}
                    >
                      ₹{rem.toLocaleString()}
                    </div>
                    <div className="proj-s-blbl small text-muted">Remaining</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

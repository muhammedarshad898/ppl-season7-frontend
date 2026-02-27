import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSocket, getSocket } from '../hooks/useSocket';
import { resourceUrl } from '../config/api';
import { SoldCardContent, UnsoldCardContent } from '../components/SoldOverlay';
import './ManagerPage.css';

export default function ManagerPage() {
  const [myTeamId, setMyTeamId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('live');
  const [timerRemaining, setTimerRemaining] = useState(null);

  const { state } = useSocket();
  const socket = getSocket();

  useEffect(() => {
    const onTimer = ({ remaining }) => setTimerRemaining(remaining);
    socket.on('timerUpdate', onTimer);
    socket.on('timerFinalSeconds', onTimer);
    return () => {
      socket.off('timerUpdate', onTimer);
      socket.off('timerFinalSeconds', onTimer);
    };
  }, [socket]);

  useEffect(() => {
    document.body.classList.add('ppl-manager');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/bootstrap-quartz.css';
    link.id = 'ppl-manager-quartz-theme';
    document.head.appendChild(link);
    return () => {
      document.body.classList.remove('ppl-manager');
      const el = document.getElementById('ppl-manager-quartz-theme');
      if (el) el.remove();
    };
  }, []);

  const as = state?.auctionState || {};
  const teams = state?.teams || [];
  const config = state?.config || {};
  const team = teams.find((t) => t.id === myTeamId);

  const phase = typeof as.phase === 'string' ? as.phase.toLowerCase() : (as.phase || 'idle');
  const p = as.currentPlayer;
  const currentBid = as.currentBid || 0;
  const leadingTeam = as.leadingTeam;
  const bidHistory = as.bidHistory || [];
  const soldPlayers = Array.isArray(as.soldPlayers) ? as.soldPlayers : [];
  const isLeading = leadingTeam?.id === myTeamId;
  const isEnded = !p || phase === 'idle' || phase === 'sold' || phase === 'unsold';
  const displayTimer = phase === 'live' ? (timerRemaining ?? as.timerRemaining ?? 0) : 0;

  const showSoldOverlay =
    (phase === 'sold' || phase === 'idle') && soldPlayers.length > 0;
  const lastSoldEntry = showSoldOverlay ? soldPlayers[soldPlayers.length - 1] : null;
  const lastSoldForOverlay = lastSoldEntry
    ? {
        player: lastSoldEntry.player,
        team: {
          name: lastSoldEntry.team,
          color: lastSoldEntry.teamColor,
          logo: lastSoldEntry.teamLogo,
        },
        price: lastSoldEntry.price,
      }
    : null;

  const inc =
    currentBid < (config.thresholdBid ?? 200)
      ? (config.highIncrement ?? 20)
      : (config.lowIncrement ?? 10);
  const nextBid = currentBid + inc;

  const placeBid = () => {
    if (!myTeamId || phase !== 'live') return;
    socket.emit('placeBid', { teamId: myTeamId, amount: nextBid });
  };

  if (!myTeamId) {
    return (
      <div className="mgr-select-screen">
        <div className="mgr-select-card">
          <div className="mgr-select-icon-wrap">
            <span className="mgr-select-icon">👤</span>
          </div>
          <h2 className="mgr-select-title">{config.leagueName || 'Premier Player League'}</h2>
          <p className="mgr-select-sub">
            {config.leagueSeason || 'Season 7'} · Manager View
          </p>
          {config.leagueLogo && (
            <img
              className="mgr-select-logo"
              src={resourceUrl(config.leagueLogo)}
              alt=""
            />
          )}
          <label className="mgr-select-label">Select Your Team</label>
          <div className="mgr-select-teams">
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`mgr-select-team-btn ${selectedId === t.id ? 'mgr-select-team-btn-sel' : ''}`}
                onClick={() => setSelectedId(t.id)}
              >
                {t.logo ? (
                  <img className="mgr-select-team-logo rounded" src={resourceUrl(t.logo)} alt="" />
                ) : (
                  <div
                    className="mgr-select-team-logo rounded"
                    style={{ background: t.color, opacity: 0.4 }}
                  />
                )}
                <div className="flex-grow-1 min-w-0 text-start">
                  <div className="fw-bold" style={{ color: t.color }}>{t.name}</div>
                  <div className="mgr-select-team-meta">
                    ₹{(t.budget - t.spent).toLocaleString()} left · {t.players?.length || 0} players
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mgr-select-enter-btn"
            disabled={!selectedId}
            onClick={() => setMyTeamId(selectedId)}
          >
            Enter →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mgr-panel min-vh-100 d-flex flex-column">
      <header className="mgr-header">
        <div className="mgr-header-inner">
          <div className="d-flex align-items-center gap-3">
            {team?.logo && (
              <img className="mgr-header-logo rounded" src={resourceUrl(team.logo)} alt="" />
            )}
            <div>
              <h1 className="mgr-header-title" style={{ color: team?.color }}>
                {team?.name}
              </h1>
              <p className="mgr-header-sub">Manager view</p>
            </div>
            <span className={`mgr-phase-pill mgr-pp-${phase}`}>{phase?.toUpperCase() || 'IDLE'}</span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="mgr-header-remaining text-end">
              <div className="mgr-header-amount">₹{((team?.budget ?? 0) - (team?.spent ?? 0)).toLocaleString()}</div>
              <div className="mgr-header-amount-label">Remaining</div>
            </div>
            {phase === 'live' && (
              <span className={`mgr-timer-pill ${displayTimer <= 3 ? 'mgr-timer-pill-crit' : ''}`}>
                {Math.max(0, displayTimer)}s
              </span>
            )}
            <Link to="/" className="mgr-header-btn">← Home</Link>
          </div>
        </div>
      </header>

      <nav className="mgr-tabs">
        <button
          type="button"
          className={`mgr-tab ${tab === 'live' ? 'mgr-tab-active' : ''}`}
          onClick={() => setTab('live')}
        >
          📺 Live
        </button>
        <button
          type="button"
          className={`mgr-tab ${tab === 'squad' ? 'mgr-tab-active' : ''}`}
          onClick={() => setTab('squad')}
        >
          👥 My Squad
        </button>
        <button
          type="button"
          className={`mgr-tab ${tab === 'standings' ? 'mgr-tab-active' : ''}`}
          onClick={() => setTab('standings')}
        >
          🏆 Standings
        </button>
      </nav>

      <main className="mgr-main flex-grow-1">
        <div className="mgr-container">
        {tab === 'live' && (
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="mgr-card mgr-card-live overflow-hidden">
                <div
                  className="mgr-live-bg position-absolute"
                  style={p?.photo ? { backgroundImage: `url(${resourceUrl(p.photo)})` } : {}}
                />
                <div className="mgr-live-overlay position-absolute top-0 start-0 end-0 bottom-0" />
                {isEnded ? (
                  <div className="mgr-live-wait position-relative p-5 text-center">
                    {phase === 'unsold' ? (
                      <UnsoldCardContent playerName={p?.name} />
                    ) : showSoldOverlay ? (
                      <SoldCardContent lastSold={lastSoldForOverlay} />
                    ) : (
                      <>
                        {phase === 'idle' && '⚽ Waiting for next lot…'}
                        {phase === 'sold' && '✅ Sold! Next lot coming…'}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="position-relative row g-0 mgr-live-content">
                    <div className="col-auto">
                      <div className="mgr-live-photo">
                        <img src={resourceUrl(p?.photo)} alt="" className="d-block w-100" />
                      </div>
                    </div>
                    <div className="col p-4 d-flex flex-column justify-content-between">
                      {isLeading && (
                        <span className="mgr-live-you-badge">✅ YOUR TEAM</span>
                      )}
                      <span className="badge mgr-badge-pos align-self-start mb-2">{p?.position}</span>
                      <h4 className="mgr-live-name mb-1">{p?.name}</h4>
                      <p className="mgr-live-meta mb-2">
                        Rating: {p?.rating} · Base: ₹{p?.basePrice}
                      </p>
                      <div className="mb-2">
                        <span className="mgr-live-label">Current Bid</span>
                        <span className="mgr-live-bid">₹{currentBid.toLocaleString()}</span>
                      </div>
                      {leadingTeam && (
                        <div
                          className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded mgr-leading"
                          style={{ background: leadingTeam.color, color: '#000' }}
                        >
                          {leadingTeam.logo && (
                            <img src={resourceUrl(leadingTeam.logo)} alt="" width={18} height={18} className="rounded" />
                          )}
                          <span className="fw-bold small">
                            {isLeading ? '✅ YOUR TEAM' : leadingTeam.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!isEnded && phase === 'live' && (
                <div className="mgr-card mgr-card-bid">
                  <div className="mgr-card-body d-flex align-items-center gap-3 flex-wrap">
                    <span className="mgr-bid-label">Your next bid</span>
                    <span className="mgr-bid-amount">₹{nextBid.toLocaleString()}</span>
                    <span className="badge mgr-badge-inc">+₹{inc}</span>
                    <button
                      type="button"
                      className="mgr-btn-place ms-auto"
                      onClick={placeBid}
                    >
                      Place bid ₹{nextBid.toLocaleString()}
                    </button>
                  </div>
                </div>
              )}

              <div className="mgr-card">
                <div className="mgr-card-header">Bid history</div>
                <div className="mgr-card-body mgr-bid-list">
                  {bidHistory.length === 0 && (
                    <p className="mgr-muted small mb-0">No bids yet</p>
                  )}
                  {bidHistory.slice(0, 8).map((b, i) => (
                    <div
                      key={i}
                      className="mgr-bid-row d-flex align-items-center gap-2 py-2 px-3 rounded mb-2"
                      style={{ borderLeft: `3px solid ${b.color}` }}
                    >
                      {b.logo && (
                        <img src={resourceUrl(b.logo)} alt="" width={20} height={20} className="rounded flex-shrink-0" />
                      )}
                      <span className="fw-bold flex-grow-1" style={{ color: b.color }}>
                        {i === 0 ? '🏆 ' : ''}{b.team}
                        {b.team === team?.name ? ' ✓' : ''}
                      </span>
                      <span className="mgr-bid-price">₹{b.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'squad' && (
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="row g-3 mb-4">
                <div className="col-4">
                  <div className="mgr-card mgr-stat-card text-center">
                    <div className="mgr-card-body">
                      <div className="mgr-stat-val">₹{team?.budget?.toLocaleString()}</div>
                      <div className="mgr-stat-label">Budget</div>
                    </div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="mgr-card mgr-stat-card text-center">
                    <div className="mgr-card-body">
                      <div className="mgr-stat-val">₹{team?.spent?.toLocaleString()}</div>
                      <div className="mgr-stat-label">Spent</div>
                    </div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="mgr-card mgr-stat-card text-center">
                    <div className="mgr-card-body">
                      <div className="mgr-stat-val mgr-stat-remaining">
                        ₹{((team?.budget ?? 0) - (team?.spent ?? 0)).toLocaleString()}
                      </div>
                      <div className="mgr-stat-label">Remaining</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mgr-card">
                <div className="mgr-card-header">My Squad</div>
                <div className="mgr-squad-list">
                  {(team?.players || []).length === 0 && (
                    <div className="mgr-squad-empty">No players yet</div>
                  )}
                  {(team?.players || []).map((pl, i) => (
                    <div key={i} className="mgr-squad-item d-flex align-items-center gap-3">
                      <img
                        src={resourceUrl(pl.photo)}
                        alt=""
                        className="rounded-circle flex-shrink-0"
                        width={40}
                        height={40}
                        style={{ objectFit: 'cover' }}
                      />
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-bold mgr-squad-name">{pl.name}</div>
                        <div className="mgr-squad-meta">{pl.position} · {pl.rating} OVR</div>
                      </div>
                      <span className="mgr-squad-price">₹{(pl.soldPrice || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'standings' && (
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="mgr-card">
                <div className="mgr-card-header">Budget standings</div>
                <div className="mgr-standings-list">
                  {[...teams]
                    .sort((a, b) => (b.budget - b.spent) - (a.budget - a.spent))
                    .map((t, i) => {
                      const rem = t.budget - t.spent;
                      const isMe = t.id === myTeamId;
                      return (
                        <div
                          key={t.id}
                          className={`mgr-standings-item d-flex align-items-center gap-3 ${isMe ? 'mgr-standings-me' : ''}`}
                        >
                          <span className="mgr-standings-rank">
                            {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                          </span>
                          {t.logo ? (
                            <img
                              src={resourceUrl(t.logo)}
                              alt=""
                              className="rounded flex-shrink-0"
                              width={40}
                              height={40}
                              style={{ objectFit: 'contain' }}
                            />
                          ) : (
                            <div
                              className="rounded flex-shrink-0 mgr-standings-color"
                              style={{ background: t.color }}
                            />
                          )}
                          <div className="flex-grow-1 min-w-0">
                            <div className="fw-bold d-flex align-items-center gap-2" style={{ color: t.color }}>
                              {t.name}
                              {isMe && <span className="badge mgr-badge-you">YOU</span>}
                            </div>
                            <div className="mgr-standings-meta">{t.players?.length || 0} players</div>
                          </div>
                          <div className="text-end">
                            <div className="mgr-standings-rem">₹{rem.toLocaleString()}</div>
                            <div className="mgr-standings-left">left</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}

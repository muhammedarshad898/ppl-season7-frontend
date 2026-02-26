import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSocket, getSocket } from '../hooks/useSocket';
import { API_URL, resourceUrl } from '../config/api';
import './AdminPage.css';

const ADMIN_KEY = 'ppl_admin';

function verifyPassword(password) {
  return fetch(`${API_URL}/api/admin/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
    .then((r) => r.json())
    .then((data) => !!data?.ok);
}

function login(password) {
  return fetch(`${API_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  }).then((r) => {
    if (!r.ok) throw new Error('Invalid credentials');
    return r.json();
  });
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(ADMIN_KEY) === '1');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [token, setToken] = useState(() => sessionStorage.getItem('ppl_admin_token') || '');
  const [timerRemaining, setTimerRemaining] = useState(null);
  const [bidFlash, setBidFlash] = useState(false);
  const [message, setMessage] = useState('');
  const [playersPage, setPlayersPage] = useState(1);

  const { state } = useSocket();
  const socket = getSocket();

  const as = state?.auctionState || {};
  const { phase, currentPlayer: p, currentBid, leadingTeam, bidHistory = [], soldPlayers = [] } = as;
  const teams = state?.teams || [];
  const players = state?.players || [];
  const config = state?.config || {};

  const PLAYERS_PER_PAGE = 10;
  const totalPlayersPages = Math.max(1, Math.ceil((players?.length || 0) / PLAYERS_PER_PAGE));
  const paginatedPlayers = (players || []).slice(
    (playersPage - 1) * PLAYERS_PER_PAGE,
    playersPage * PLAYERS_PER_PAGE
  );

  /* Load Bootswatch Quartz theme only for admin panel; remove when leaving */
  useEffect(() => {
    document.body.classList.add('ppl-admin');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/bootstrap-quartz.css';
    link.id = 'ppl-admin-quartz-theme';
    document.head.appendChild(link);
    return () => {
      document.body.classList.remove('ppl-admin');
      const el = document.getElementById('ppl-admin-quartz-theme');
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    if (!authenticated || !token) return;
    socket.emit('admin:auth', { token });
  }, [authenticated, token, socket]);

  useEffect(() => {
    socket.on('timerUpdate', ({ remaining }) => setTimerRemaining(remaining));
    socket.on('timerFinalSeconds', ({ remaining }) => setTimerRemaining(remaining));
    socket.on('bidFlash', () => {
      setBidFlash(true);
      setTimeout(() => setBidFlash(false), 400);
    });
    socket.on('bidError', ({ msg }) => {
      setMessage(msg || '');
      setTimeout(() => setMessage(''), 4500);
    });
    socket.on('backupImported', () => {
      setMessage('Backup imported successfully.');
      setTimeout(() => setMessage(''), 3000);
    });
    return () => {
      socket.off('timerUpdate');
      socket.off('timerFinalSeconds');
      socket.off('bidFlash');
      socket.off('bidError');
      socket.off('backupImported');
    };
  }, [socket]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const pw = password.trim();
    if (!pw) {
      setLoginError('Enter password');
      return;
    }
    setLoginError('');
    try {
      const ok = await verifyPassword(pw);
      if (!ok) {
        setLoginError('Wrong password');
        setPassword('');
        return;
      }
      const data = await login(pw);
      if (data?.token) {
        setToken(data.token);
        sessionStorage.setItem('ppl_admin_token', data.token);
      }
      sessionStorage.setItem(ADMIN_KEY, '1');
      setAuthenticated(true);
    } catch (err) {
      setLoginError('Server auth unavailable. Refresh and try again.');
    }
  };

  const handleStart = (playerId) => {
    socket.emit('admin:startAuction', { playerId });
  };

  const handleSold = () => socket.emit('admin:sold');
  const handleUnsold = () => socket.emit('admin:unsold');
  const handleIdle = () => socket.emit('admin:idle');
  const handleUndo = () => socket.emit('admin:undoBid');

  const inc = currentBid < (config.thresholdBid ?? 200) ? (config.highIncrement ?? 20) : (config.lowIncrement ?? 10);
  const nextBid = (currentBid || 0) + inc;

  if (!authenticated) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card">
          <div className="admin-login-card-accent" />
          <div className="admin-login-card-inner">
            <div className="admin-login-brand">
              <div className="admin-login-icon-wrap">
                <span className="admin-login-icon" aria-hidden>◆</span>
              </div>
              <h1 className="admin-login-title">Auction Control</h1>
              <p className="admin-login-sub">Premier Player League · Season 7 · Admin</p>
            </div>
            <form className="admin-login-form" onSubmit={handleLogin}>
              <label className="admin-login-label" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                className="admin-login-input"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
              />
              <button type="submit" className="admin-login-btn">
                Sign in
              </button>
              {loginError && <p className="admin-login-error">{loginError}</p>}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel min-vh-100">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="d-flex align-items-center gap-3">
            {config.leagueLogo && (
              <img className="admin-header-logo" src={resourceUrl(config.leagueLogo)} alt="" />
            )}
            <div>
              <h1 className="admin-header-title">
                {config.leagueName || 'Premier Player League'}{' '}
                <span className="admin-header-season">{config.leagueSeason || 'S7'}</span>
              </h1>
              <p className="admin-header-sub">Auction control</p>
            </div>
            <span className={`admin-phase-pill pp-${phase}`}>
              {phase?.toUpperCase() || 'IDLE'}
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            {phase === 'live' && (
              <span className={`admin-timer-pill ${(timerRemaining ?? 0) <= 3 ? 'crit' : ''}`}>
                {Math.max(0, timerRemaining ?? 0)}s
              </span>
            )}
            <Link to="/projector" target="_blank" className="admin-header-btn">
              🖥 Projector
            </Link>
            <Link to="/manager" target="_blank" className="admin-header-btn">
              👤 Manager
            </Link>
            <Link to="/" className="admin-header-btn admin-header-btn-home">← Home</Link>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-container">
          <div className="row admin-row-gap">
            <div className="col-lg-8">
              <div className="admin-card admin-card-stage admin-card-spaced">
                <div className="admin-card-header">Live stage</div>
                <div className="admin-card-body">
                {!p || phase === 'idle' ? (
                  <p className="text-muted text-center py-4 mb-0">
                    Select a player below to start auction.
                  </p>
                ) : (
                  <>
                    <div className="row g-3 align-items-start">
                      <div className="col-auto">
                        <div className="admin-stage-photo rounded overflow-hidden bg-secondary">
                          <img src={resourceUrl(p.photo)} alt="" />
                          <span className="badge bg-success position-absolute bottom-0 start-0 m-2">
                            {p.position}
                          </span>
                        </div>
                      </div>
                      <div className="col">
                        <h5 className="mb-1">{p.name}</h5>
                        <p className="small text-muted mb-2">
                          Rating: {p.rating} · Base: ₹{p.basePrice} · #{p.id}
                        </p>
                        <div className="d-flex align-items-end gap-3 flex-wrap">
                          <div>
                            <label className="small text-muted text-uppercase d-block">Current bid</label>
                            <span className={`admin-bid-val fs-3 fw-bold text-success ${bidFlash ? 'flash' : ''}`}>
                              ₹{(currentBid || 0).toLocaleString()}
                            </span>
                          </div>
                          <span className="admin-timer-big text-success fw-bold ms-auto">
                            {(timerRemaining ?? 0)}s
                          </span>
                        </div>
                        {leadingTeam && (
                          <div
                            className="d-inline-flex align-items-center gap-2 mt-2 px-2 py-1 rounded"
                            style={{ background: leadingTeam.color, color: '#000' }}
                          >
                            {leadingTeam.logo && (
                              <img src={resourceUrl(leadingTeam.logo)} alt="" width={20} height={20} className="rounded" />
                            )}
                            <span className="fw-bold">{leadingTeam.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="admin-nbb d-flex align-items-center gap-2 flex-wrap mt-3 pt-3 border-top border-secondary">
                      <span className="small text-muted text-uppercase">Next bid</span>
                      <span className="text-success fw-bold">₹{nextBid.toLocaleString()}</span>
                      <span className="badge bg-success text-dark">+₹{inc}</span>
                    </div>
                    <div className="row g-2 mt-2">
                      <div className="col-6 col-md-3">
                        <button
                          type="button"
                          className="btn btn-success w-100"
                          onClick={handleSold}
                          disabled={!leadingTeam || phase !== 'live'}
                        >
                          ✓ Sold
                        </button>
                      </div>
                      <div className="col-6 col-md-3">
                        <button
                          type="button"
                          className="btn btn-warning w-100 text-dark"
                          onClick={handleUnsold}
                          disabled={phase !== 'live'}
                        >
                          ✕ Unsold
                        </button>
                      </div>
                      <div className="col-6 col-md-3">
                        <button
                          type="button"
                          className="btn btn-outline-secondary w-100"
                          onClick={handleIdle}
                          disabled={phase !== 'live'}
                        >
                          Idle
                        </button>
                      </div>
                      <div className="col-6 col-md-3">
                        <button
                          type="button"
                          className="btn btn-undo w-100"
                          onClick={handleUndo}
                          disabled={phase !== 'live'}
                        >
                          Undo
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {message && <p className="text-danger small mt-2 mb-0">{message}</p>}
              </div>
            </div>

            <section className="admin-players-section">
              <h2 className="admin-players-title">Players</h2>
              <div className="admin-table-container">
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Pos</th>
                        <th>Base</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPlayers.map((pl) => {
                        const isLive = pl.id === p?.id && phase === 'live';
                        const canStart = pl.status === 'available' && phase === 'idle';
                        return (
                          <tr key={pl.id} className={isLive ? 'admin-table-row-live' : ''}>
                            <td>{pl.id}</td>
                            <td>{pl.name}</td>
                            <td><span className="badge bg-secondary">{pl.position}</span></td>
                            <td>₹{pl.basePrice}</td>
                            <td>
                              {isLive && <span className="badge bg-success">LIVE</span>}
                              {pl.status === 'sold' && <span className="badge bg-warning text-dark">SOLD</span>}
                              {pl.status === 'unsold' && <span className="badge bg-danger">UNSOLD</span>}
                              {pl.status === 'available' && !isLive && (
                                <span className="badge bg-secondary">AVAIL</span>
                              )}
                            </td>
                            <td>
                              {canStart && (
                                <button
                                  type="button"
                                  className="admin-btn-start"
                                  onClick={() => handleStart(pl.id)}
                                >
                                  <span className="admin-btn-start-icon">▶</span>
                                  Start
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPlayersPages > 1 && (
                  <nav className="admin-pagination" aria-label="Players pagination">
                    <button
                      type="button"
                      className="admin-pagination-btn"
                      onClick={() => setPlayersPage((prev) => Math.max(1, prev - 1))}
                      disabled={playersPage <= 1}
                    >
                      ‹ Prev
                    </button>
                    <span className="admin-pagination-info">
                      Page {playersPage} of {totalPlayersPages}
                    </span>
                    <button
                      type="button"
                      className="admin-pagination-btn"
                      onClick={() => setPlayersPage((prev) => Math.min(totalPlayersPages, prev + 1))}
                      disabled={playersPage >= totalPlayersPages}
                    >
                      Next ›
                    </button>
                  </nav>
                )}
              </div>
            </section>
            </div>

            <div className="col-lg-4">
              <div className="admin-card admin-card-side admin-card-spaced">
                <div className="admin-card-header">Bid log</div>
                <div className="admin-card-body admin-bid-log">
                {bidHistory.length === 0 && (
                  <p className="text-muted small fst-italic mb-0">No bids yet</p>
                )}
                {bidHistory.slice(0, 12).map((b, i) => (
                  <div
                    key={i}
                    className="d-flex align-items-center gap-2 py-2 px-2 rounded mb-1 admin-bl"
                    style={{ borderLeft: `3px solid ${b.color}` }}
                  >
                    {b.logo && (
                      <img src={resourceUrl(b.logo)} alt="" width={18} height={18} className="rounded flex-shrink-0" />
                    )}
                    <span className="fw-bold flex-grow-1" style={{ color: b.color }}>
                      {i === 0 ? '🏆 ' : ''}{b.team}
                    </span>
                    <span className="text-success small">₹{b.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="admin-card admin-card-side admin-card-spaced">
              <div className="admin-card-header">Sold ({soldPlayers.length})</div>
              <div className="admin-card-body admin-sold-list">
                {soldPlayers.slice(0, 8).reverse().map((s, i) => (
                  <div key={i} className="admin-sold-item d-flex align-items-center gap-2 py-2">
                    <img
                      className="rounded flex-shrink-0"
                      src={resourceUrl(s.player?.photo)}
                      alt=""
                      width={36}
                      height={36}
                      style={{ objectFit: 'cover' }}
                    />
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-bold small">{s.player?.name}</div>
                      <div className="small" style={{ color: s.teamColor }}>{s.team}</div>
                    </div>
                    <span className="text-success fw-bold small">₹{s.price?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSocket, getSocket } from '../hooks/useSocket';
import { API_URL, resourceUrl } from '../config/api';
import { SoldCardContent, UnsoldCardContent } from '../components/SoldOverlay';
import { playTimerAlarm } from '../utils/timerAlarm';
import './AdminPage.css';

const ADMIN_KEY = 'ppl_admin';

const POSITION_OPTIONS = [
  { value: '', label: 'Select position' },
  { value: 'Goalkeeper', label: 'Goalkeeper' },
  { value: 'Centre Back', label: 'Centre Back' },
  { value: 'Right Back', label: 'Right Back' },
  { value: 'Left Back', label: 'Left Back' },
  { value: 'Defensive Midfielder', label: 'Defensive Midfielder' },
  { value: 'Central Midfielder', label: 'Central Midfielder' },
  { value: 'Attacking Midfielder', label: 'Attacking Midfielder' },
  { value: 'Right Winger', label: 'Right Winger' },
  { value: 'Left Winger', label: 'Left Winger' },
  { value: 'Striker', label: 'Striker' },
  { value: 'Forward', label: 'Forward' },
];

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
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [playerModal, setPlayerModal] = useState(null);
  const [deletePlayerId, setDeletePlayerId] = useState(null);
  const [playerForm, setPlayerForm] = useState({ name: '', position: '', rating: 80, basePrice: 100, photo: '' });
  const [uploadingPlayerPhoto, setUploadingPlayerPhoto] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const lastAlarmSecondRef = useRef(null);
  const [teamModal, setTeamModal] = useState(null);
  const [teamForm, setTeamForm] = useState({ name: '', color: '#6b7280', budget: 1500, logo: '' });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deleteTeamId, setDeleteTeamId] = useState(null);

  const { state } = useSocket();
  const socket = getSocket();

  const showToast = (message, type = 'success') => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ message, type });
    toastRef.current = setTimeout(() => {
      setToast(null);
      toastRef.current = null;
    }, 3000);
  };

  const as = state?.auctionState || {};
  const { currentPlayer: p, currentBid, leadingTeam, bidHistory = [], soldPlayers = [] } = as;
  const phase = typeof as.phase === 'string' ? as.phase.toLowerCase() : (as.phase || 'idle');
  const teams = state?.teams || [];
  const players = state?.players || [];
  const config = state?.config || {};

  const showSoldOverlay =
    phase === 'sold' && Array.isArray(soldPlayers) && soldPlayers.length > 0;
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

  const PLAYERS_PER_PAGE = 10;
  const playerSearchLower = (playerSearchQuery || '').trim().toLowerCase();
  const filteredPlayers =
    !playerSearchLower
      ? (players || [])
      : (players || []).filter(
          (pl) =>
            (pl.name && pl.name.toLowerCase().includes(playerSearchLower)) ||
            (pl.position && String(pl.position).toLowerCase().includes(playerSearchLower)) ||
            (pl.id != null && String(pl.id).includes(playerSearchQuery.trim()))
        );
  const totalPlayersPages = Math.max(1, Math.ceil((filteredPlayers.length || 0) / PLAYERS_PER_PAGE));
  const paginatedPlayers = filteredPlayers.slice(
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
    setPlayersPage(1);
  }, [playerSearchQuery]);

  useEffect(() => {
    if (!authenticated || !token) return;
    socket.emit('admin:auth', { token });
  }, [authenticated, token, socket]);

  useEffect(() => () => {
    if (toastRef.current) clearTimeout(toastRef.current);
  }, []);

  useEffect(() => {
    const onTimer = ({ remaining }) => {
      setTimerRemaining(remaining);
      const r = Math.max(0, Number(remaining));
      if (r >= 1 && r <= 5 && lastAlarmSecondRef.current !== r) {
        lastAlarmSecondRef.current = r;
        playTimerAlarm();
      }
      if (r > 5 || r === 0) lastAlarmSecondRef.current = null;
    };
    socket.on('timerUpdate', onTimer);
    socket.on('timerFinalSeconds', onTimer);
    socket.on('bidFlash', () => {
      setBidFlash(true);
      setTimeout(() => setBidFlash(false), 400);
    });
    socket.on('bidError', ({ msg }) => {
      showToast(msg || 'Something went wrong', 'error');
    });
    socket.on('backupImported', () => {
      showToast('Backup imported successfully');
    });
    return () => {
      socket.off('timerUpdate', onTimer);
      socket.off('timerFinalSeconds', onTimer);
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
      showToast('Login successful', 'success');
    } catch (err) {
      setLoginError('Server auth unavailable. Refresh and try again.');
    }
  };

  const handleStart = (playerId) => {
    socket.emit('admin:startAuction', { playerId });
  };

  const openAddPlayer = () => {
    setPlayerForm({ name: '', position: '', rating: 80, basePrice: 100, photo: '' });
    setPlayerModal('add');
  };

  const openEditPlayer = (pl) => {
    setPlayerForm({
      id: pl.id,
      name: pl.name || '',
      position: pl.position || '',
      rating: pl.rating ?? 80,
      basePrice: pl.basePrice ?? 100,
      photo: pl.photo || '',
    });
    setPlayerModal(pl);
  };

  const closePlayerModal = () => {
    setPlayerModal(null);
    setDeletePlayerId(null);
  };

  const handleSavePlayer = () => {
    if (playerModal === 'add') {
      const { name, position, rating, basePrice, photo } = playerForm;
      if (!name?.trim()) {
        setMessage('Name is required');
        return;
      }
      const ackTimeout = setTimeout(() => {
        showToast('Request timed out. Check your connection.', 'error');
      }, 8000);
      socket.emit(
        'admin:addPlayer',
        {
          name: name.trim(),
          position: (position || '').trim(),
          rating: Number(rating) || 80,
          basePrice: Number(basePrice) || 100,
          photo: (photo || '').trim(),
        },
        (err) => {
          clearTimeout(ackTimeout);
          if (err) {
            showToast(err, 'error');
            return;
          }
          closePlayerModal();
          showToast('Player added successfully');
        }
      );
      return;
    }
    if (playerModal && playerModal !== 'add' && playerForm.id) {
      socket.emit('admin:editPlayer', {
        id: playerForm.id,
        name: (playerForm.name || '').trim(),
        position: (playerForm.position || '').trim(),
        rating: Number(playerForm.rating) || 80,
        basePrice: Number(playerForm.basePrice) || 100,
        photo: (playerForm.photo || '').trim(),
      });
      closePlayerModal();
      showToast('Player updated successfully');
    }
  };

  const handleRemovePlayer = (playerId) => {
    setDeletePlayerId(playerId);
  };

  const confirmRemovePlayer = () => {
    if (deletePlayerId) {
      socket.emit('admin:removePlayer', { playerId: deletePlayerId });
      closePlayerModal();
      showToast('Player removed successfully');
    }
  };

  const handlePlayerPhotoUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploadingPlayerPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const base = API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch(`${base}/api/players/upload-photo`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data?.url) setPlayerForm((f) => ({ ...f, photo: data.url }));
      else showToast(data?.error || 'Upload failed', 'error');
    } catch (err) {
      showToast('Upload failed', 'error');
    } finally {
      setUploadingPlayerPhoto(false);
      e.target.value = '';
    }
  };

  const openAddTeam = () => {
    setTeamForm({ name: '', color: '#6b7280', budget: config?.teamBudgetLimit ?? 1500, logo: '' });
    setTeamModal('add');
  };

  const openEditTeam = (t) => {
    setTeamForm({
      id: t.id,
      name: t.name || '',
      color: t.color || '#6b7280',
      budget: t.budget ?? config?.teamBudgetLimit ?? 1500,
      logo: t.logo || '',
    });
    setTeamModal(t);
  };

  const closeTeamModal = () => {
    setTeamModal(null);
    setDeleteTeamId(null);
  };

  const handleTeamLogoUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const base = API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch(`${base}/api/teams/upload-logo`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data?.url) setTeamForm((f) => ({ ...f, logo: data.url }));
      else showToast(data?.error || 'Upload failed', 'error');
    } catch (err) {
      showToast('Upload failed', 'error');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleSaveTeam = () => {
    const { name, color, budget, logo } = teamForm;
    if (!name?.trim()) {
      showToast('Team name is required', 'error');
      return;
    }
    const numericIds = (teams || []).map((t) => parseInt(String(t.id).replace(/\D/g, ''), 10) || 0);
    const id = teamModal === 'add'
      ? 'T' + (numericIds.length ? Math.max(...numericIds, 0) + 1 : 1)
      : teamForm.id;
    socket.emit('admin:saveTeam', {
      id,
      name: name.trim(),
      color: color || '#6b7280',
      budget: Number(budget) || 1500,
      logo: logo || '',
    });
    closeTeamModal();
    showToast(teamModal === 'add' ? 'Team added successfully' : 'Team updated successfully');
  };

  const confirmRemoveTeam = () => {
    if (deleteTeamId) {
      socket.emit('admin:removeTeam', { teamId: deleteTeamId });
      closeTeamModal();
      showToast('Team removed successfully');
    }
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
                {phase === 'unsold' ? (
                  <UnsoldCardContent playerName={p?.name} />
                ) : showSoldOverlay ? (
                  <SoldCardContent lastSold={lastSoldForOverlay} />
                ) : !p || phase === 'idle' ? (
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
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <h2 className="admin-players-title mb-0">Players</h2>
                <input
                  type="search"
                  className="form-control admin-input admin-players-search"
                  placeholder="Search by name, position, or ID…"
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  aria-label="Search players"
                />
                <button type="button" className="btn btn-success admin-btn-add" onClick={openAddPlayer}>
                  + Add Player
                </button>
              </div>
              {playerSearchQuery.trim() && (
                <span className="small text-muted mb-2 d-block">
                  {filteredPlayers.length} of {players?.length || 0} players
                </span>
              )}
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
                        const canStart = pl.status === 'available' && (phase === 'idle' || phase === 'unsold' || phase === 'sold');
                        const canSetAvailable = pl.status === 'sold' || pl.status === 'unsold';
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
                              <div className="d-flex align-items-center gap-1 flex-wrap">
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
                                {canSetAvailable && (
                                  <button
                                    type="button"
                                    className="btn btn-sm admin-btn-available"
                                    onClick={() => {
                                      socket.emit('admin:resetPlayer', { playerId: pl.id });
                                      showToast(`${pl.name} set to available`);
                                    }}
                                    title="Set available again"
                                  >
                                    Set available
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-sm admin-btn-edit"
                                  onClick={() => openEditPlayer(pl)}
                                  title="Edit"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm admin-btn-delete"
                                  onClick={() => handleRemovePlayer(pl.id)}
                                  title="Remove"
                                  disabled={phase === 'live' && pl.id === p?.id}
                                >
                                  Delete
                                </button>
                              </div>
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
              <div className="admin-card-header d-flex align-items-center justify-content-between">
                <span>Teams</span>
                <button type="button" className="btn btn-sm admin-btn-add" onClick={openAddTeam}>
                  + Add Team
                </button>
              </div>
              <div className="admin-card-body">
                {(teams || []).map((t) => (
                  <div key={t.id} className="admin-team-row d-flex align-items-center gap-2 py-2">
                    {t.logo ? (
                      <img src={resourceUrl(t.logo)} alt="" width={28} height={28} className="rounded flex-shrink-0" style={{ objectFit: 'contain' }} />
                    ) : (
                      <span className="admin-team-dot rounded flex-shrink-0" style={{ width: 28, height: 28, backgroundColor: t.color || '#6b7280', opacity: 0.8 }} />
                    )}
                    <span className="flex-grow-1 small fw-bold" style={{ color: t.color }}>{t.name}</span>
                    <button type="button" className="btn btn-sm admin-btn-edit" onClick={() => openEditTeam(t)}>Edit</button>
                    <button type="button" className="btn btn-sm admin-btn-delete" onClick={() => setDeleteTeamId(t.id)}>Delete</button>
                  </div>
                ))}
                {(!teams || teams.length === 0) && (
                  <p className="text-muted small fst-italic mb-0">No teams yet. Add one above.</p>
                )}
              </div>
            </div>
            <div className="admin-card admin-card-side admin-card-spaced">
              <div className="admin-card-header">Sold ({soldPlayers.length})</div>
              <div className="admin-card-body admin-sold-list">
                {[...soldPlayers].reverse().map((s, i) => (
                  <div key={s.player?.id != null ? `sold-${s.player.id}` : `sold-i-${i}`} className="admin-sold-item d-flex align-items-center gap-2 py-2">
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

      {/* Add / Edit Player modal */}
      {(playerModal === 'add' || (playerModal && playerModal !== 'add')) && !deletePlayerId && (
        <div className="admin-modal-backdrop" onClick={closePlayerModal} role="presentation">
          <div className="admin-modal admin-modal-player" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="player-modal-title">
            <div className="admin-modal-header">
              <h3 id="player-modal-title" className="admin-modal-title">{playerModal === 'add' ? 'Add Player' : 'Edit Player'}</h3>
              <button type="button" className="admin-modal-close" onClick={closePlayerModal} aria-label="Close">
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-control admin-input"
                  value={playerForm.name}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Player name"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Position</label>
                <select
                  className="form-select admin-input"
                  value={playerForm.position}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, position: e.target.value }))}
                  aria-label="Position"
                >
                  {POSITION_OPTIONS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {playerForm.position &&
                    !POSITION_OPTIONS.some((opt) => opt.value === playerForm.position) && (
                    <option value={playerForm.position}>{playerForm.position}</option>
                  )}
                </select>
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label">Rating</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="form-control admin-input"
                    value={playerForm.rating}
                    onChange={(e) => setPlayerForm((f) => ({ ...f, rating: e.target.value }))}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label">Base price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control admin-input"
                    value={playerForm.basePrice}
                    onChange={(e) => setPlayerForm((f) => ({ ...f, basePrice: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mb-3 mt-2">
                <label className="form-label">Photo (upload or URL)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="form-control admin-input mb-2"
                  onChange={handlePlayerPhotoUpload}
                  disabled={uploadingPlayerPhoto}
                />
                {uploadingPlayerPhoto && <p className="small text-muted mb-2">Uploading…</p>}
                <input
                  type="text"
                  className="form-control admin-input"
                  value={playerForm.photo}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, photo: e.target.value }))}
                  placeholder="Or paste photo URL"
                />
                <div className="admin-player-photo-preview mt-2">
                  {playerForm.photo ? (
                    <img
                      src={resourceUrl(playerForm.photo)}
                      alt="Preview"
                      className="admin-player-photo-preview-img"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="admin-player-photo-preview-placeholder">No photo</div>
                  )}
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={closePlayerModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" onClick={handleSavePlayer}>
                {playerModal === 'add' ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success / error toast */}
      {toast && (
        <div className={`admin-toast admin-toast-${toast.type}`} role="alert">
          <span className="admin-toast-icon">{toast.type === 'success' ? '✓' : '!'}</span>
          <span className="admin-toast-message">{toast.message}</span>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletePlayerId && (
        <div className="admin-modal-backdrop" onClick={closePlayerModal} role="presentation">
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                Remove {players?.find((x) => x.id === deletePlayerId)?.name || 'this player'}?
              </h3>
              <button type="button" className="admin-modal-close" onClick={closePlayerModal} aria-label="Close">
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="mb-0">This will remove the player from the list. This action cannot be undone.</p>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={closePlayerModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmRemovePlayer}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Team modal (with logo upload) */}
      {(teamModal === 'add' || (teamModal && teamModal !== 'add')) && !deleteTeamId && (
        <div className="admin-modal-backdrop" onClick={closeTeamModal} role="presentation">
          <div className="admin-modal admin-modal-player" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{teamModal === 'add' ? 'Add Team' : 'Edit Team'}</h3>
              <button type="button" className="admin-modal-close" onClick={closeTeamModal} aria-label="Close">
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="mb-3">
                <label className="form-label">Team name</label>
                <input
                  type="text"
                  className="form-control admin-input"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Team name"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Color</label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="color"
                    className="admin-input-color"
                    value={teamForm.color || '#6b7280'}
                    onChange={(e) => setTeamForm((f) => ({ ...f, color: e.target.value }))}
                  />
                  <input
                    type="text"
                    className="form-control admin-input flex-grow-1"
                    value={teamForm.color || ''}
                    onChange={(e) => setTeamForm((f) => ({ ...f, color: e.target.value }))}
                    placeholder="#hex"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Budget (₹)</label>
                <input
                  type="number"
                  min={1}
                  className="form-control admin-input"
                  value={teamForm.budget}
                  onChange={(e) => setTeamForm((f) => ({ ...f, budget: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Logo (upload image)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="form-control admin-input"
                  onChange={handleTeamLogoUpload}
                  disabled={uploadingLogo}
                />
                {uploadingLogo && <p className="small text-muted mt-1 mb-0">Uploading…</p>}
                {teamForm.logo && (
                  <div className="mt-2 d-flex align-items-center gap-2">
                    <img src={resourceUrl(teamForm.logo)} alt="" width={48} height={48} className="rounded border" style={{ objectFit: 'contain' }} />
                    <span className="small text-muted">Uploaded</span>
                    <button type="button" className="btn btn-sm admin-btn-delete" onClick={() => setTeamForm((f) => ({ ...f, logo: '' }))}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={closeTeamModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" onClick={handleSaveTeam}>
                {teamModal === 'add' ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete team confirmation */}
      {deleteTeamId && (
        <div className="admin-modal-backdrop" onClick={closeTeamModal} role="presentation">
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                Remove {teams?.find((t) => t.id === deleteTeamId)?.name || 'this team'}?
              </h3>
              <button type="button" className="admin-modal-close" onClick={closeTeamModal} aria-label="Close">
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="mb-0">This will remove the team and its squad. This action cannot be undone.</p>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={closeTeamModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmRemoveTeam}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

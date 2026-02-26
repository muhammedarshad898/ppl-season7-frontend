import { Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { resourceUrl } from '../config/api';
import './HomePage.css';

// Argentina + Brazil + France flag colors (mixed)
const FLAG_COLORS = [
  '#75AADB', /* Argentina blue */
  '#009C3B', /* Brazil green */
  '#002395', /* France blue */
  '#FFDF00', /* Brazil yellow */
  '#ED2939', /* France red */
  '#FFFFFF', /* Argentina/France white */
];

function FlagColoredText({ text, className = '' }) {
  const chars = [...(text || '')];
  return (
    <span className={className}>
      {chars.map((char, i) => (
        <span key={`${i}-${char}`} style={{ color: FLAG_COLORS[i % FLAG_COLORS.length] }}>
          {char}
        </span>
      ))}
    </span>
  );
}

function IconAdmin() {
  return (
    <svg className="home-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconProjector() {
  return (
    <svg className="home-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
function IconManager() {
  return (
    <svg className="home-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function HomePage() {
  const { state } = useSocket();
  const config = state?.config || {};
  const leagueName = config.leagueName || 'Premier Player League';
  const leagueSeason = config.leagueSeason || 'Season 7';
  const leagueLogo = config.leagueLogo;
  const sublineText = `${leagueName} · ${leagueSeason} · Auction System`;

  return (
    <div className="home-wrap">
      <video
        className="home-bg-video"
        src="/landing%20hero.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      />
      <div className="home-bg-pattern" />
      <div className="container py-5 position-relative">
        <div className="text-center mb-4">
          {leagueLogo && (
            <img
              className="home-logo img-fluid mb-3"
              src={resourceUrl(leagueLogo)}
              alt=""
            />
          )}
          <h1 className="home-headline">
            <FlagColoredText text={leagueName} />
          </h1>
          <p className="home-subline text-uppercase">
            <FlagColoredText text={sublineText} />
          </p>
        </div>
        <div className="row g-4 justify-content-center">
          <div className="col-md-6 col-lg-4">
            <Link to="/admin" className="card home-card home-card-admin text-decoration-none h-100">
              <div className="card-body">
                <div className="home-card-icon-wrap home-card-icon-admin">
                  <IconAdmin />
                </div>
                <h5 className="card-title home-card-title">Admin Control</h5>
                <p className="card-text home-card-desc">
                  Run the auction from one place: start lots, accept bids, mark players sold or unsold, and keep the event on track.
                </p>
              </div>
            </Link>
          </div>
          <div className="col-md-6 col-lg-4">
            <Link to="/projector" target="_blank" className="card home-card home-card-proj text-decoration-none h-100">
              <div className="card-body">
                <div className="home-card-icon-wrap home-card-icon-proj">
                  <IconProjector />
                </div>
                <h5 className="card-title home-card-title">Projector View</h5>
                <p className="card-text home-card-desc">
                  Full-screen display for the hall: current player, live bid, countdown, and team strip so the audience stays in the loop.
                </p>
              </div>
            </Link>
          </div>
          <div className="col-md-6 col-lg-4">
            <Link to="/manager" className="card home-card home-card-mgr text-decoration-none h-100">
              <div className="card-body">
                <div className="home-card-icon-wrap home-card-icon-mgr">
                  <IconManager />
                </div>
                <h5 className="card-title home-card-title">Manager</h5>
                <p className="card-text home-card-desc">
                  Place bids for your team, track your squad and remaining budget, and see how you rank against other teams.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

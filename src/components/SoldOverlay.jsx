import { resourceUrl } from '../config/api';
import './SoldOverlay.css';

function normalizeTeam(lastSold) {
  if (!lastSold) return null;
  if (lastSold.team && typeof lastSold.team === 'object') return lastSold.team;
  if (lastSold.teamName != null) {
    return { name: lastSold.teamName, color: lastSold.teamColor, logo: lastSold.teamLogo };
  }
  return null;
}

/**
 * Congratulations overlay (full viewport) for projector when a player is sold.
 * lastSold: { player, team: { name, color?, logo? }, price }.
 */
export default function SoldOverlay({ lastSold }) {
  if (!lastSold) return null;
  const team = normalizeTeam(lastSold);

  return (
    <div className="sold-overlay">
      <div className="sold-overlay-poppers" aria-hidden>
        {Array.from({ length: 60 }).map((_, i) => (
          <span key={i} className="sold-overlay-confetti" style={{ '--i': i }} />
        ))}
      </div>
      <div className="sold-overlay-content">
        <h2 className="sold-overlay-headline">🚨 PLAYER SOLD! 🚨</h2>
        <h3 className="sold-overlay-welcome">💥 Welcome to the Squad! 💥</h3>
        <p className="sold-overlay-tagline">The game just changed — and it&apos;s because of YOU!</p>
        <p className="sold-overlay-tagline2">Let&apos;s make this season unforgettable!</p>
        <div className="sold-overlay-player-team">
          <p className="sold-overlay-name">{lastSold.player?.name}</p>
          {team?.name && (
            <p
              className="sold-overlay-squad"
              style={{
                color: team.color || undefined,
                borderColor: team.color || undefined,
              }}
            >
              {team.logo && (
                <img
                  className="sold-overlay-team-logo"
                  src={resourceUrl(team.logo)}
                  alt=""
                />
              )}
              {team.name}
            </p>
          )}
        </div>
        <p className="sold-overlay-price">₹{Number(lastSold.price || 0).toLocaleString()}</p>
        <p className="sold-overlay-next-hint">Next auction starting soon…</p>
      </div>
    </div>
  );
}

/**
 * Same congratulations message for use inside a card (Admin Live stage, Manager live card).
 * Includes the same confetti poppers, clipped to the card.
 */
export function SoldCardContent({ lastSold }) {
  if (!lastSold) return null;
  const team = normalizeTeam(lastSold);

  return (
    <div className="sold-card-wrapper">
      <div className="sold-card-poppers" aria-hidden>
        {Array.from({ length: 50 }).map((_, i) => (
          <span key={i} className="sold-card-confetti" style={{ '--i': i }} />
        ))}
      </div>
      <div className="sold-card-content">
        <h3 className="sold-card-headline">🚨 PLAYER SOLD! 🚨</h3>
        <p className="sold-card-welcome">💥 Welcome to the Squad! 💥</p>
        <p className="sold-card-tagline">The game just changed — and it&apos;s because of YOU!</p>
        <div className="sold-card-player-team">
          <p className="sold-card-name">{lastSold.player?.name}</p>
          {team?.name && (
            <p
              className="sold-card-squad"
              style={{
                color: team.color || undefined,
                borderColor: team.color || undefined,
              }}
            >
              {team.logo && (
                <img
                  className="sold-card-team-logo"
                  src={resourceUrl(team.logo)}
                  alt=""
                />
              )}
              {team.name}
            </p>
          )}
        </div>
        <p className="sold-card-price">₹{Number(lastSold.price || 0).toLocaleString()}</p>
        <p className="sold-card-next-hint">Next auction starting soon…</p>
      </div>
    </div>
  );
}

/**
 * Unfortunately unsold message for use inside a card (Admin Live stage, Manager live card).
 * Shows "Unfortunately unsold" / "Better luck next time" with animating heart.
 */
export function UnsoldCardContent({ playerName }) {
  return (
    <div className="unsold-card-content">
      <h3 className="unsold-card-headline">Unfortunately unsold</h3>
      {playerName && <p className="unsold-card-player">{playerName} didn’t find a team this time.</p>}
      <p className="unsold-card-message">
        Better luck next time
        <span className="unsold-heart" aria-hidden>❤️</span>
      </p>
      <p className="unsold-card-next-hint">Next auction starting soon…</p>
    </div>
  );
}

/**
 * Full-viewport unsold overlay for projector (same message as UnsoldCardContent).
 */
export function UnsoldOverlay({ playerName }) {
  return (
    <div className="unsold-overlay">
      <div className="unsold-overlay-content">
        <h2 className="unsold-overlay-headline">Unfortunately unsold</h2>
        {playerName && <p className="unsold-overlay-player">{playerName} didn’t find a team this time.</p>}
        <p className="unsold-overlay-message">
          Better luck next time
          <span className="unsold-heart unsold-overlay-heart" aria-hidden>❤️</span>
        </p>
        <p className="unsold-overlay-next-hint">Next auction starting soon…</p>
      </div>
    </div>
  );
}

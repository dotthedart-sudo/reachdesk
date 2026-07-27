import { getMarketingUrl } from '../utils/domain';

/** Centered mark on auth / setup — same placement as linear.app signup */
export default function AuthLogo() {
  return (
    <a
      href={getMarketingUrl('/homepage')}
      className="auth-page-logo-link"
      aria-label="ReachDesk home"
    >
      <img src="/logo.png" alt="" className="auth-page-logo-img" width={40} height={40} />
    </a>
  );
}

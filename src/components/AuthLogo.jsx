import { getMarketingUrl } from '../utils/domain';
import { BRAND_NAME } from '../config/brand';

/** Centered mark on auth / setup — same placement as linear.app signup */
export default function AuthLogo() {
  return (
    <a
      href={getMarketingUrl('/homepage')}
      className="auth-page-logo-link"
      aria-label={`${BRAND_NAME} home`}
    >
      <img src="/logo.png" alt="" className="auth-page-logo-img" width={40} height={40} />
    </a>
  );
}

import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { SocialLinks } from './SocialLinks';
import { FOOTER_CONTENT, FOOTER_STYLES } from '@/constants/footerConstants';

/**
 * Footer brand section component
 * Displays brand logo, tagline, and social media links
 */
export function FooterBrand() {
  return (
    <div className={FOOTER_STYLES.BRAND_SECTION}>
      <Link to="/" className={FOOTER_STYLES.BRAND_LINK}>
        <div className={FOOTER_STYLES.BRAND_ICON}>
          <Home className={FOOTER_STYLES.BRAND_ICON_INNER} />
        </div>
        <span className={FOOTER_STYLES.BRAND_TEXT}>
          {FOOTER_CONTENT.BRAND_NAME}
        </span>
      </Link>
      
      <p className={FOOTER_STYLES.TAGLINE}>
        {FOOTER_CONTENT.TAGLINE}
      </p>
      
      <SocialLinks />
    </div>
  );
}
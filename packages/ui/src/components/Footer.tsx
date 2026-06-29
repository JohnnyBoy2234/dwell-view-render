import { FooterBrand } from './footer/FooterBrand';
import { FooterSection } from './footer/FooterSection';
import { FOOTER_LINKS, FOOTER_CONTENT, FOOTER_STYLES } from '@mzanzihomes/common/constants/footerConstants';

/**
 * Main footer component
 * Displays brand information, navigation links, and copyright
 */
export function Footer() {
  return (
    <footer className={FOOTER_STYLES.FOOTER}>
      <div className={FOOTER_STYLES.CONTAINER}>
        <div className={FOOTER_STYLES.GRID}>
          {/* Brand Section */}
          <FooterBrand />

          {/* Company Links */}
          <FooterSection
            title={FOOTER_CONTENT.SECTIONS.COMPANY}
            links={FOOTER_LINKS.company}
          />

          {/* Services Links */}
          <FooterSection
            title={FOOTER_CONTENT.SECTIONS.SERVICES}
            links={FOOTER_LINKS.services}
          />

          {/* Legal Links */}
          <FooterSection
            title={FOOTER_CONTENT.SECTIONS.LEGAL}
            links={FOOTER_LINKS.legal}
          />
        </div>

        {/* Bottom Section */}
        <div className={FOOTER_STYLES.BOTTOM_SECTION}>
          <p className={FOOTER_STYLES.COPYRIGHT}>
            {FOOTER_CONTENT.COPYRIGHT}
          </p>
          <p className={FOOTER_STYLES.MADE_WITH}>
            {FOOTER_CONTENT.MADE_WITH}
          </p>
        </div>
      </div>
    </footer>
  );
}
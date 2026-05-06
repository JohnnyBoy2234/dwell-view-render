import { Link } from "react-router-dom";
import { FOOTER_STYLES } from '@/constants/footerConstants';
import type { FooterLink } from '@/constants/footerConstants';

interface FooterSectionProps {
  title: string;
  links: readonly FooterLink[];
}

/**
 * Footer section component for displaying grouped links
 * Used for company, services, and legal link sections
 */
export function FooterSection({ title, links }: FooterSectionProps) {
  return (
    <div>
      <h3 className={FOOTER_STYLES.SECTION_TITLE}>{title}</h3>
      <ul className={FOOTER_STYLES.LINK_LIST}>
        {links.map((link, index) => (
          <li key={index}>
            <Link to={link.href} className={FOOTER_STYLES.LINK}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
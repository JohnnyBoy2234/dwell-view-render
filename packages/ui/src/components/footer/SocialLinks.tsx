import { SOCIAL_LINKS, FOOTER_STYLES } from '@mzanzihomes/common/constants/footerConstants';

/**
 * Social media links component
 * Renders social media icons with proper accessibility
 */
export function SocialLinks() {
  return (
    <div className={FOOTER_STYLES.SOCIAL_CONTAINER}>
      {SOCIAL_LINKS.map((social, index) => {
        const IconComponent = social.icon;
        
        return (
          <a 
            key={index}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className={FOOTER_STYLES.SOCIAL_LINK}
            aria-label={social.label}
          >
            <IconComponent className={FOOTER_STYLES.SOCIAL_ICON} />
          </a>
        );
      })}
    </div>
  );
}
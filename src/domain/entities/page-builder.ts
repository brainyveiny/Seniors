export interface SiteFooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

export interface SiteFooterBlockProps {
  /** Academy logo for navbar & footer (URL or data URL from upload). */
  logoUrl?: string;
  tagline: string;
  badgeText: string;
  showBadge: boolean;
  columns: SiteFooterColumn[];
  /** Supports {year} and {academy} placeholders */
  copyrightText: string;
  showContactStrip: boolean;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  showSocial: boolean;
  instagram: string;
  youtube: string;
  facebook: string;
  linkedin: string;
  telegram: string;
}

export interface PageBlock {
  id: string;
  type: "site-footer";
  enabled: boolean;
  props: SiteFooterBlockProps;
}

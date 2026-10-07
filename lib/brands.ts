export type BrandSlug =
  | 'animals-around-the-globe'
  | 'travel-binger'
  | 'doggo-digest'
  | 'feline-fam'
  | 'weather-fox'
  | 'discover-wild-science'

export interface Brand {
  slug: BrandSlug
  /** SQL-safe table prefix, e.g. aatg_subscribers */
  tablePrefix: string
  name: string
  shortName: string
  domain: string
  siteUrl: string
  rssFeedUrl: string
  fromEmail: string
  fromName: string
  digestName: string
  accentColor: string
  welcomeBlurb: string
  initial: string
}

export const BRANDS: Brand[] = [
  {
    slug: 'animals-around-the-globe',
    tablePrefix: 'aatg',
    name: 'Animals Around The Globe',
    shortName: 'AATG',
    domain: 'animalsaroundtheglobe.com',
    siteUrl: 'https://www.animalsaroundtheglobe.com/',
    rssFeedUrl: 'https://www.animalsaroundtheglobe.com/feed/',
    fromEmail: 'newsletter@animalsaroundtheglobe.com',
    fromName: 'Animals Around The Globe',
    digestName: 'The Animal Digest',
    accentColor: '#2d5a27',
    welcomeBlurb:
      "We'll send you the best animal stories, wildlife insights, and nature moments from around the world.",
    initial: 'A',
  },
  {
    slug: 'travel-binger',
    tablePrefix: 'travel_binger',
    name: 'Travel Binger',
    shortName: 'Travel Binger',
    domain: 'travelbinger.com',
    siteUrl: 'https://www.travelbinger.com/',
    rssFeedUrl: 'https://www.travelbinger.com/feed/',
    fromEmail: 'newsletter@travelbinger.com',
    fromName: 'Travel Binger',
    digestName: 'The Travel Digest',
    accentColor: '#0f4c81',
    welcomeBlurb: "We'll send you destination guides, travel tips, and stories worth the trip.",
    initial: 'T',
  },
  {
    slug: 'doggo-digest',
    tablePrefix: 'doggo_digest',
    name: 'Doggo Digest',
    shortName: 'Doggo Digest',
    domain: 'doggodigest.com',
    siteUrl: 'https://www.doggodigest.com/',
    rssFeedUrl: 'https://www.doggodigest.com/feed/',
    fromEmail: 'newsletter@doggodigest.com',
    fromName: 'Doggo Digest',
    digestName: 'Doggo Digest',
    accentColor: '#c05a1a',
    welcomeBlurb: "We'll send you the best dog stories, care tips, and heartfelt moments every week.",
    initial: 'D',
  },
  {
    slug: 'feline-fam',
    tablePrefix: 'feline_fam',
    name: 'Feline Fam',
    shortName: 'Feline Fam',
    domain: 'felinefam.com',
    siteUrl: 'https://www.felinefam.com/',
    rssFeedUrl: 'https://www.felinefam.com/feed/',
    fromEmail: 'newsletter@felinefam.com',
    fromName: 'Feline Fam',
    digestName: 'The Feline Digest',
    accentColor: '#7c3aed',
    welcomeBlurb: "We'll send you cat stories, care tips, and feline moments you'll love.",
    initial: 'F',
  },
  {
    slug: 'weather-fox',
    tablePrefix: 'weather_fox',
    name: 'Weather Fox',
    shortName: 'Weather Fox',
    domain: 'weather-fox.com',
    siteUrl: 'https://weather-fox.com/',
    rssFeedUrl: 'https://weather-fox.com/feed/',
    fromEmail: 'newsletter@weather-fox.com',
    fromName: 'Weather Fox',
    digestName: 'The Weather Digest',
    accentColor: '#0369a1',
    welcomeBlurb: "We'll send you forecasts, weather stories, and climate insights you can use.",
    initial: 'W',
  },
  {
    slug: 'discover-wild-science',
    tablePrefix: 'discover_wild_science',
    name: 'Discover Wild Science',
    shortName: 'Wild Science',
    domain: 'discoverwildscience.com',
    siteUrl: 'https://www.discoverwildscience.com/',
    rssFeedUrl: 'https://www.discoverwildscience.com/feed/',
    fromEmail: 'newsletter@discoverwildscience.com',
    fromName: 'Discover Wild Science',
    digestName: 'The Wild Science Digest',
    accentColor: '#166534',
    welcomeBlurb: "We'll send you discoveries, research stories, and wild science worth knowing.",
    initial: 'S',
  },
]

export const BRAND_SLUGS = BRANDS.map(b => b.slug)

export function getBrand(slug: string | undefined | null): Brand | null {
  if (!slug) return null
  return BRANDS.find(b => b.slug === slug) || null
}

export function requireBrand(slug: string | undefined | null): Brand {
  const brand = getBrand(slug)
  if (!brand) throw new Error(`Unknown brand: ${slug}`)
  return brand
}

export function brandTables(brand: Brand) {
  return {
    subscribers: `${brand.tablePrefix}_subscribers`,
    broadcasts: `${brand.tablePrefix}_broadcasts`,
    emailEvents: `${brand.tablePrefix}_email_events`,
  }
}

export function defaultDigestSubject(brand: Brand, date = new Date()) {
  return `${brand.digestName} — ${date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`
}

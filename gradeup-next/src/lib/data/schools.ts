/**
 * Featured schools data — single source of truth for the homepage
 * "Explore Teams" strip and the /schools directory page.
 *
 * Design notes:
 *   - `tier` segments the list into ncaa (Power 5 programs), hbcu
 *     (Historically Black Colleges & Universities), and hs
 *     (high-school programs frequently producing NIL-eligible athletes).
 *   - NCAA + HBCU entries carry a `logo` URL (Wikipedia-hosted, curl-
 *     verified). HS entries carry an `abbrev` for the letter-avatar
 *     rendering — Wikipedia doesn't reliably host clean HS athletic
 *     logos, so we use colored initial cards instead of broken images.
 *   - `school_name` on hs_athlete_profiles is what the /athletes page
 *     filters on. The `name` field here is what the URL uses
 *     (/athletes?school=${name}), so keep it short and unambiguous.
 */

export type SchoolTier = 'ncaa' | 'hbcu' | 'hs';

export interface FeaturedSchool {
  /** Short name used in URL query param: /athletes?school={name} */
  name: string;
  /** Display name on the card ("Oregon Ducks" / "Crenshaw Cougars") */
  fullName: string;
  /** 2-3 letter initials for letter-avatar rendering (HS tier) */
  abbrev?: string;
  /** Wikipedia-hosted logo URL (NCAA + HBCU tiers) */
  logo?: string;
  /** Athletic brand color — drives card chip tint + letter-avatar bg */
  color: string;
  /** Optional city/state label for the /schools directory */
  location?: string;
  tier: SchoolTier;
}

export const FEATURED_SCHOOLS: FeaturedSchool[] = [
  // ─── NCAA Power 5 ─────────────────────────────────────────────────
  { tier: 'ncaa', name: 'Stanford',       fullName: 'Stanford Cardinal',      location: 'Stanford, CA',   color: '#8C1515', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Stanford_Cardinal_logo.svg' },
  { tier: 'ncaa', name: 'Ohio State',     fullName: 'Ohio State Buckeyes',    location: 'Columbus, OH',   color: '#BB0000', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Ohio_State_Buckeyes_logo.svg' },
  { tier: 'ncaa', name: 'Michigan',       fullName: 'Michigan Wolverines',    location: 'Ann Arbor, MI',  color: '#FFCB05', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Michigan_Wolverines_logo.svg' },
  { tier: 'ncaa', name: 'USC',            fullName: 'USC Trojans',            location: 'Los Angeles, CA', color: '#990000', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/94/USC_Trojans_logo.svg' },
  { tier: 'ncaa', name: 'Alabama',        fullName: 'Alabama Crimson Tide',   location: 'Tuscaloosa, AL', color: '#9E1B32', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Alabama_Crimson_Tide_logo.svg' },
  { tier: 'ncaa', name: 'Texas',          fullName: 'Texas Longhorns',        location: 'Austin, TX',     color: '#BF5700', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Texas_Longhorns_logo.svg' },
  { tier: 'ncaa', name: 'Oregon',         fullName: 'Oregon Ducks',           location: 'Eugene, OR',     color: '#154733', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Oregon_Ducks_logo.svg' },
  { tier: 'ncaa', name: 'Duke',           fullName: 'Duke Blue Devils',       location: 'Durham, NC',     color: '#003087', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Duke_Athletics_logo.svg' },
  { tier: 'ncaa', name: 'Georgia',        fullName: 'Georgia Bulldogs',       location: 'Athens, GA',     color: '#BA0C2F', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Georgia_Athletics_logo.svg' },
  { tier: 'ncaa', name: 'UCLA',           fullName: 'UCLA Bruins',            location: 'Los Angeles, CA', color: '#2774AE', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d1/UCLA_Bruins_primary_logo.svg' },
  { tier: 'ncaa', name: 'Kansas',         fullName: 'Kansas Jayhawks',        location: 'Lawrence, KS',   color: '#0051BA', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Kansas_Jayhawks_1946_logo.svg' },
  { tier: 'ncaa', name: 'Nebraska',       fullName: 'Nebraska Cornhuskers',   location: 'Lincoln, NE',    color: '#E41C38', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Nebraska_Cornhuskers_logo.svg' },
  { tier: 'ncaa', name: 'Wisconsin',      fullName: 'Wisconsin Badgers',      location: 'Madison, WI',    color: '#C5050C', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Wisconsin_Badgers_logo.svg' },

  // ─── HBCU ─────────────────────────────────────────────────────────
  { tier: 'hbcu', name: 'Jackson State',     fullName: 'Jackson State Tigers',    location: 'Jackson, MS',     color: '#21409A', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Jackson_State_athletics_logo.svg' },
  { tier: 'hbcu', name: 'Howard',            fullName: 'Howard Bison',            location: 'Washington, DC',  color: '#E51937', logo: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Howard_Bison_logo.svg' },
  { tier: 'hbcu', name: 'Grambling State',   fullName: 'Grambling State Tigers',  location: 'Grambling, LA',   color: '#FFD700', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Grambling_State_Tigers_logo.svg' },
  { tier: 'hbcu', name: 'Florida A&M',       fullName: 'Florida A&M Rattlers',    location: 'Tallahassee, FL', color: '#FF8200', logo: 'https://upload.wikimedia.org/wikipedia/en/5/54/Florida_A%26M_Rattlers_logo.svg' },
  { tier: 'hbcu', name: 'NC A&T',            fullName: 'North Carolina A&T Aggies', location: 'Greensboro, NC', color: '#00529B', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/42/North_Carolina_A%26T_Aggies_logo.svg' },
  { tier: 'hbcu', name: 'Norfolk State',     fullName: 'Norfolk State Spartans',  location: 'Norfolk, VA',     color: '#046A38', logo: 'https://upload.wikimedia.org/wikipedia/en/7/78/Norfork_State_Spartans_logo.svg' },
  { tier: 'hbcu', name: 'Tennessee State',   fullName: 'Tennessee State Tigers',  location: 'Nashville, TN',   color: '#004B87', logo: 'https://upload.wikimedia.org/wikipedia/en/d/d3/Tennessee_State_Athletics_logo.svg' },
  { tier: 'hbcu', name: 'Southern',          fullName: 'Southern Jaguars',        location: 'Baton Rouge, LA', color: '#002D72', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Southern-u_logo_from_NCAA.svg' },
  { tier: 'hbcu', name: 'Morgan State',      fullName: 'Morgan State Bears',      location: 'Baltimore, MD',   color: '#001E62', logo: 'https://upload.wikimedia.org/wikipedia/en/8/8f/Morgan_State_Bears_logo.svg' },
  { tier: 'hbcu', name: 'Hampton',           fullName: 'Hampton Pirates',         location: 'Hampton, VA',     color: '#002F6C', logo: 'https://upload.wikimedia.org/wikipedia/en/7/71/Hampton_pirates_athletics_logo.png' },
  { tier: 'hbcu', name: 'Bethune-Cookman',   fullName: 'Bethune-Cookman Wildcats', location: 'Daytona Beach, FL', color: '#AC1A2F', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Bethune%E2%80%93Cookman_Wildcats_logo.svg' },
  { tier: 'hbcu', name: 'Prairie View A&M',  fullName: 'Prairie View A&M Panthers', location: 'Prairie View, TX', color: '#4B0082', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/81/Prairie_view_univ_athletics_textlogo.png' },

  // ─── High Schools ─────────────────────────────────────────────────
  // Letter-avatars rather than logos — Wikipedia's HS pages rarely host
  // clean athletic brandmarks (most URLs resolved to building photos or
  // unrelated icons). Initials + color still give each school visual
  // identity and avoid trademark/hotlink risk.
  // Los Angeles area
  { tier: 'hs', name: 'Crenshaw',       fullName: 'Crenshaw Cougars',          location: 'Los Angeles, CA', abbrev: 'CR',  color: '#1E4B8F' },
  { tier: 'hs', name: 'Dorsey',         fullName: 'Dorsey Dons',               location: 'Los Angeles, CA', abbrev: 'DD',  color: '#5B2E8C' },
  { tier: 'hs', name: 'Junipero Serra', fullName: 'Serra Cavaliers',           location: 'Gardena, CA',     abbrev: 'JS',  color: '#0A7C47' },
  { tier: 'hs', name: 'View Park',      fullName: 'View Park Knights',         location: 'Los Angeles, CA', abbrev: 'VP',  color: '#B31B1B' },
  { tier: 'hs', name: 'Fairfax',        fullName: 'Fairfax Lions',             location: 'Los Angeles, CA', abbrev: 'FX',  color: '#C41230' },
  { tier: 'hs', name: 'Narbonne',       fullName: 'Narbonne Gauchos',          location: 'Harbor City, CA', abbrev: 'NB',  color: '#006747' },
  { tier: 'hs', name: 'Mater Dei',      fullName: 'Mater Dei Monarchs',        location: 'Santa Ana, CA',   abbrev: 'MD',  color: '#A32638' },
  { tier: 'hs', name: 'St. John Bosco', fullName: 'St. John Bosco Braves',     location: 'Bellflower, CA',  abbrev: 'SJB', color: '#00703C' },
  // National NIL powerhouses
  { tier: 'hs', name: 'IMG Academy',    fullName: 'IMG Academy Ascenders',     location: 'Bradenton, FL',   abbrev: 'IMG', color: '#004B87' },
  { tier: 'hs', name: 'Montverde',      fullName: 'Montverde Eagles',          location: 'Montverde, FL',   abbrev: 'MVA', color: '#C5A54F' },
  { tier: 'hs', name: 'DeMatha',        fullName: 'DeMatha Stags',             location: 'Hyattsville, MD', abbrev: 'DM',  color: '#002F6C' },
  { tier: 'hs', name: 'Miami Northwestern', fullName: 'Northwestern Bulls',    location: 'Miami, FL',       abbrev: 'MNW', color: '#552583' },
  { tier: 'hs', name: 'DeSoto',         fullName: 'DeSoto Eagles',             location: 'DeSoto, TX',      abbrev: 'DS',  color: '#C8102E' },
  { tier: 'hs', name: 'Duncanville',    fullName: 'Duncanville Panthers',      location: 'Duncanville, TX', abbrev: 'DV',  color: '#FFC72C' },
  { tier: 'hs', name: 'Bishop Gorman',  fullName: 'Bishop Gorman Gaels',       location: 'Las Vegas, NV',   abbrev: 'BG',  color: '#6A2C91' },
  { tier: 'hs', name: 'St. Frances',    fullName: 'St. Frances Panthers',      location: 'Baltimore, MD',   abbrev: 'SFA', color: '#0C356A' },
  { tier: 'hs', name: 'Paramus Catholic', fullName: 'Paramus Catholic Paladins', location: 'Paramus, NJ',  abbrev: 'PC',  color: '#006F3C' },
  { tier: 'hs', name: 'Bergen Catholic', fullName: 'Bergen Catholic Crusaders', location: 'Oradell, NJ',    abbrev: 'BC',  color: '#8B0000' },
];

export const SCHOOL_TIER_LABELS: Record<SchoolTier, string> = {
  ncaa: 'NCAA',
  hbcu: 'HBCU',
  hs: 'High School',
};

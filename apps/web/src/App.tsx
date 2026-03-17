import React, { useState, useEffect, useCallback, useRef } from 'react' // useCallback used in StoryOverlay
import { finaPointsToTrustStrength, PROVIDER_ACCENT } from './lib/verificationApi'
import type { VerificationResult, SportType } from './lib/verificationApi'
import { HighlightCardCanvas, useHighlightShare, captureAndShare } from './components/HighlightCard'
import type { HighlightAchievement } from './components/HighlightCard'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  MoreHorizontal,
  BadgeCheck,
  Download,
  FileText,
  Sun,
  Moon,
  Home,
  BarChart2,
  MessageCircle,
  Sparkles,
  X,
  Award,
  Link2,
  ChevronRight,
  ChevronLeft,
  Settings,
  CheckCircle2,
  Circle,
  Trophy,
  Shield,
  Camera,
  Zap,
  Users,
  User,
  Heart,
  Share2,
  GraduationCap,
  ChevronDown,
  Flame,
  Check,
  Waves,
  Bike,
  Mountain,
  Globe,
  Activity,
  Medal,
  Search,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@repo/ui/Button'
import { cn } from '@repo/ui/utils'
import './style.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type AIQuery = 'consistency' | 'nextrace' | 'recovery'
type ProfileTab = 'activities' | 'gear' | 'photos' | 'achievements'

// ─── Achievement System Types ─────────────────────────────────────────────────

type TrustLayerId = 'self' | 'media' | 'device' | 'peer' | 'institutional' | 'official'

type AchievementTrustLayer = {
  id: TrustLayerId
  label: string
  verified: boolean
}

type JourneyNode = {
  id: string
  stage: string
  date: string
  detail?: string
  activities?: string[]
  trustLayerIds: TrustLayerId[]
  /** Level 2 drill-down: core fields for instant scanability */
  duration?: string
  distanceKm?: number
  distanceLabel?: string
  mediaUrls?: string[]
  notes?: string
}

type AchievementArtefact = {
  type: 'result' | 'device' | 'media'
  label: string
  value?: string
  sublabel?: string
  source?: string
}

type ActivityLogEntry = {
  id: string
  title: string
  date: string
  type: 'run' | 'bike' | 'swim' | 'strength' | 'event' | 'session' | 'match' | 'hike' | 'practice'
  distanceKm?: number
  duration?: string
  deviceData?: string
  photoUrl?: string
  description?: string
  layerIds: TrustLayerId[]
  heartRate?: number // Fitbit biometric — avg bpm for the activity
}

type AchievementSummaryStats = {
  completionTime?: string
  stat1: { label: string; value: string }
  stat2: { label: string; value: string }
  stat3: { label: string; value: string }
}

type Achievement = {
  id: string
  title: string
  eventName: string
  status: 'In Progress' | 'Completed' | 'Planned'
  progress: number
  thumbnail?: string
  activityCount: number
  trustLayers: AchievementTrustLayer[]
  journey: JourneyNode[]
  rootOfTrust?: string
  artefacts?: AchievementArtefact[]
  faceVerified?: boolean
  pillar?: 'sport' | 'education'
  summaryStats?: AchievementSummaryStats
  activityLog?: ActivityLogEntry[]
  verificationData?: VerificationResult
  sportType?: SportType
}

type RaceResult = {
  id: string
  eventName: string
  year: number
  distance: string
  city: string
  certBody: string
  bib: string
  time: string
  rank: string
  pace: string
  category?: string
  runsignupRaceId?: number
  verifiedVia?: 'runsignup' | 'mock'
}

// ─── RunSignUp API types ───────────────────────────────────────────────────────

type RsuAddress = {
  city?: string
  state?: string
  country_code?: string
}

type RsuRaceEntry = {
  race: {
    race_id: number
    name: string
    next_date?: string
    address?: RsuAddress
    logo_url?: string
    url?: string
    is_free_race?: string
    race_type?: string
  }
}

type RsuSearchResponse = { races?: RsuRaceEntry[] }

type RsuResultEntry = {
  finish_time?: string
  clock_time?: string
  bib_num?: string
  place?: string | number
  age_group_place?: string | number
  gender_place?: string | number
  first_name?: string
  last_name?: string
  age?: number | string
  gender?: string
}

type RsuResultsResponse = { results?: { individual_results?: RsuResultEntry[] } }

// ─── Strava Types ─────────────────────────────────────────────────────────────

type StravaActivity = {
  id: number
  name: string
  sport_type: string
  type: string
  start_date: string
  distance: number // meters
  moving_time: number // seconds
  elapsed_time: number
  total_elevation_gain: number
  has_heartrate: boolean
  average_heartrate?: number
  map?: { summary_polyline?: string }
}

type StravaCumulativeStats = {
  runCount: number
  totalDistanceKm: number
  totalHours: number
  recentActivity?: StravaActivity
}

type FitbitDailySummary = {
  steps: number
  caloriesOut: number
  distanceKm: number
  activeMinutes: number // fairlyActive + veryActive
  restingHeartRate?: number
  floors?: number
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const BANNER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAckrQNeLLacYVKjTFk8h6tvvya3n0y-3xfxYD_mZX6_gYxF4xBGKVu6iaWc6RuyFGleCfYup5GXBi1TQosJWJSSPq2-1YxIR0pxpcSLaWgouBg5hBQMAD1sBV-yC3CS3diUJYm1OzeCH4M64dSsIJjTovLsx95AmzfCcYK7t6YvCysfoW6Ou-AzTLTWcBKzn7krUfk_JM-e7PrYE0ctL3T5XJY4bqo0OuecbWLAuSdZoq7DPo3oHq3iNKHSKfBEZDJ_PitibpE79tK'
const AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCMkSakZ3VjnIEOOfstFxFIkyDhNOvVqoZ_qo-7NUZk3fzdqvTLLmAOdBT9EU-J87NcfupfhvNuTkiG5POCLO22V5dzR_JdtYo1L7vfFDaZCTLSHGhGbdmFjqWiW9PDQ_FnmrDgyt8B5ueu5EgXcvUY_9vDldQR2NFmnt7rc-uBDvxwidEtyJYk1mVrWaS8LKVc_dt5kYkMgGxTLzOplQd6KbJn1HdPfmNnPb_Tb29ZEsxG3rBwa8FNaNkG6_ayuuRSXrA9piqqfuZQ'

const GALLERY_ITEMS = [
  {
    id: 1,
    category: 'Training',
    alt: 'Athlete cycling on a road bike',
    src: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop',
  },
  {
    id: 2,
    category: 'Events',
    alt: 'Triathlon swim start',
    src: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=400&h=400&fit=crop',
  },
  {
    id: 3,
    category: 'Training',
    alt: 'Running on a mountain trail',
    src: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop',
  },
  {
    id: 4,
    category: 'Events',
    alt: 'Race day finish line crowd',
    src: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=400&h=400&fit=crop',
  },
  {
    id: 5,
    category: 'Training',
    alt: 'Open water swimming',
    src: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=400&h=400&fit=crop',
  },
  {
    id: 6,
    category: 'Events',
    alt: 'Podium moment',
    src: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&h=400&fit=crop',
  },
  {
    id: 7,
    category: 'Training',
    alt: 'Early morning run',
    src: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=400&fit=crop',
  },
  {
    id: 8,
    category: 'Training',
    alt: 'Strength training session',
    src: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&h=400&fit=crop',
  },
  {
    id: 9,
    category: 'Events',
    alt: 'Summit view after trail race',
    src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=400&fit=crop',
  },
]

const AI_RESPONSES: Record<AIQuery, string> = {
  consistency:
    'Alex maintains a 94% training consistency score with an average of 12.4 hours/week. Peak output occurs on Tuesdays and Saturdays. Recommend maintaining current cadence into race week.',
  nextrace:
    'Based on current pace trajectory (+15% over 6 months), projected marathon finish: 2:57:34. Optimal race date window: April–May 2025. Tapering recommended from T-3 weeks.',
  recovery:
    'HRV trend shows strong adaptation. Average resting HR: 48bpm. Sleep quality score: 87/100. Recovery index: Elite tier. Consider 1 active recovery day after long run sessions.',
}

const AI_BUTTONS: { key: AIQuery; icon: string; label: string }[] = [
  { key: 'consistency', icon: '⚡', label: 'Analyze Consistency' },
  { key: 'nextrace', icon: '📈', label: 'Predict Next Race' },
  { key: 'recovery', icon: '🧪', label: 'View Recovery' },
]

const HIGHLIGHT_ITEMS = [
  {
    id: 'training',
    label: 'Training',
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=150&h=150&fit=crop',
  },
  {
    id: 'recovery',
    label: 'Recovery',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=150&h=150&fit=crop',
  },
  {
    id: 'races',
    label: 'Races',
    imageUrl: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=150&h=150&fit=crop',
  },
  {
    id: 'adventures',
    label: 'Adventures',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=150&h=150&fit=crop',
  },
  {
    id: 'fuel',
    label: 'Fuel',
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=150&h=150&fit=crop',
  },
]

const HIGHLIGHT_VIEW_CONTENT: Record<
  string,
  { description: string; images: { src: string; alt: string }[] }
> = {
  Training: {
    description: 'Strength sessions, bike intervals, and run blocks. 12.4 hrs/week average.',
    images: [
      {
        src: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=900&fit=crop',
        alt: 'Gym training',
      },
      {
        src: 'https://images.unsplash.com/photo-1532294229087-9c2c3b0c5b9d?w=600&h=900&fit=crop',
        alt: 'Road bike',
      },
      {
        src: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=900&fit=crop',
        alt: 'Running track',
      },
      {
        src: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&h=900&fit=crop',
        alt: 'Swim lane',
      },
    ],
  },
  Recovery: {
    description: 'Yoga, stretching, and rest days. HRV and sleep tracked.',
    images: [
      {
        src: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=900&fit=crop',
        alt: 'Yoga recovery',
      },
      {
        src: 'https://images.unsplash.com/photo-1599901860904-f0a4a6e0c381?w=600&h=900&fit=crop',
        alt: 'Foam rolling',
      },
      {
        src: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=900&fit=crop',
        alt: 'Meditation',
      },
    ],
  },
  Races: {
    description: 'Marathons, 70.3s, and local 5Ks. 85 events completed.',
    images: [
      {
        src: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&h=900&fit=crop',
        alt: 'Finish line',
      },
      {
        src: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&h=900&fit=crop',
        alt: 'Triathlon swim start',
      },
      {
        src: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600&h=900&fit=crop',
        alt: 'Marathon crowd',
      },
      {
        src: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=900&fit=crop',
        alt: 'Podium',
      },
    ],
  },
  Adventures: {
    description: 'Trail runs, ultras, and big days in the mountains.',
    images: [
      {
        src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=900&fit=crop',
        alt: 'Mountain trail',
      },
      {
        src: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=900&fit=crop',
        alt: 'Trail running',
      },
      {
        src: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&h=900&fit=crop',
        alt: 'Summit view',
      },
      {
        src: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&h=900&fit=crop',
        alt: 'Camping',
      },
    ],
  },
  Fuel: {
    description: 'Race-day nutrition and everyday eating. Balanced macros.',
    images: [
      {
        src: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=900&fit=crop',
        alt: 'Healthy meal',
      },
      {
        src: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=900&fit=crop',
        alt: 'Salad bowl',
      },
      {
        src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=900&fit=crop',
        alt: 'Smoothie',
      },
      {
        src: 'https://images.unsplash.com/photo-1604329760661-e71dc83f2b26?w=600&h=900&fit=crop',
        alt: 'Energy bars',
      },
    ],
  },
}

const SKILLS = [
  'Endurance',
  'Pacing',
  'Swim',
  'Bike',
  'Run',
  'Trail',
  'Marathon',
  '70.3',
  'Nutrition',
  'Recovery',
]

const MOCK_RACE_RESULTS: RaceResult[] = [
  {
    id: 'tcslondon-2024',
    eventName: 'TCS London Marathon',
    year: 2024,
    distance: '42.2 km',
    city: 'London, UK',
    certBody: 'AIMS / World Athletics',
    bib: 'A-41872',
    time: '3:02:14',
    rank: '1,842 / 56,000',
    pace: '4:19 /km',
    category: 'Open Male 30–34',
  },
  {
    id: 'dubai-2024',
    eventName: 'Standard Chartered Dubai Marathon',
    year: 2024,
    distance: '42.2 km',
    city: 'Dubai, UAE',
    certBody: 'IAAF / AIMS Certified',
    bib: 'D-10044',
    time: '2:58:51',
    rank: '312 / 9,400',
    pace: '4:14 /km',
    category: 'Open Male 30–34',
  },
  {
    id: 'chicago-2023',
    eventName: 'Bank of America Chicago Marathon',
    year: 2023,
    distance: '42.2 km',
    city: 'Chicago, IL',
    certBody: 'AIMS / USATF',
    bib: 'C-28811',
    time: '3:11:07',
    rank: '4,220 / 47,000',
    pace: '4:32 /km',
    category: 'Open Male 30–34',
  },
  {
    id: 'norcal-703-2024',
    eventName: 'NorCal Regional 70.3 Triathlon',
    year: 2024,
    distance: '113 km',
    city: 'Sacramento, CA',
    certBody: 'World Triathlon / USAT',
    bib: 'T-0091',
    time: '4:44:02',
    rank: '3rd / 148 (AG)',
    pace: '—',
    category: 'Male 30–34',
  },
  {
    id: 'tokyo-2025',
    eventName: 'Tokyo Marathon',
    year: 2025,
    distance: '42.2 km',
    city: 'Tokyo, Japan',
    certBody: 'AIMS / World Athletics',
    bib: 'TK-5571',
    time: '2:54:38',
    rank: '601 / 38,000',
    pace: '4:08 /km',
    category: 'Open Male 30–34',
  },
]

// ─── RunSignUp API helpers ────────────────────────────────────────────────────
// Dev: proxied via Vite → /api/runsignup → https://runsignup.com/rest
// Prod: swap RSU_BASE to a Firebase Function URL that adds CORS + auth headers.

const RSU_BASE = '/api/runsignup'

async function rsuSearchRaces(query: string): Promise<RsuRaceEntry[]> {
  const res = await fetch(
    `${RSU_BASE}/races?format=json&name=${encodeURIComponent(query)}&results_per_page=8&page=1`
  )
  if (!res.ok) throw new Error(`RunSignUp search ${res.status}`)
  const data: RsuSearchResponse = await res.json()
  return data.races ?? []
}

async function rsuLookupResult(raceId: number, bib: string): Promise<RsuResultEntry | null> {
  const res = await fetch(
    `${RSU_BASE}/race/${raceId}/results/get-results?format=json&bib_num=${encodeURIComponent(bib)}&results_per_page=1`
  )
  if (!res.ok) return null
  const data: RsuResultsResponse = await res.json()
  const entries = data.results?.individual_results ?? []
  return entries[0] ?? null
}

// ─── Fitbit Web API helpers ────────────────────────────────────────────────────
// Fitbit provides biometric data (heart rate, steps, distance) per activity.
// Set VITE_FITBIT_CLIENT_ID + VITE_FITBIT_CLIENT_SECRET in .env for live OAuth.
// Without a valid token: AntiGravity simulator kicks in automatically.

const _fitbitEnv = (import.meta as { env: Record<string, string> }).env
const FITBIT_CLIENT_ID = _fitbitEnv.VITE_FITBIT_CLIENT_ID ?? ''
const FITBIT_CLIENT_SECRET = _fitbitEnv.VITE_FITBIT_CLIENT_SECRET ?? ''
const FITBIT_REDIRECT_URI =
  _fitbitEnv.VITE_FITBIT_REDIRECT_URI ?? `${window.location.origin}/exchange_token`

/** Redirect to Fitbit OAuth consent screen */
function connectFitbit() {
  if (!FITBIT_CLIENT_ID) return
  const scope = 'activity heartrate'
  const redirectUri = encodeURIComponent(FITBIT_REDIRECT_URI)
  window.location.href =
    `https://www.fitbit.com/oauth2/authorize?client_id=${FITBIT_CLIENT_ID}` +
    `&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=fitbit`
}

/**
 * Exchange an authorization code for tokens.
 * Fitbit requires Basic Auth: base64(clientId:clientSecret).
 * Proxied through Vite (/api/fitbit-token) to avoid CORS.
 */
async function exchangeFitbitToken(
  code: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  try {
    const res = await fetch('/api/fitbit-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: FITBIT_REDIRECT_URI,
      }).toString(),
    })
    if (!res.ok) return null
    return res.json() as Promise<{
      access_token: string
      refresh_token: string
      expires_in: number
    }>
  } catch {
    return null
  }
}

/**
 * Fitbit activity name → Flinki ActivityType
 * Fitbit uses string names like "Running", "Cycling", "Swimming", "Walking".
 */
function fitbitToActivityType(activityName: string): ActivityType {
  const s = activityName.toLowerCase()
  if (s.includes('cycling') || s.includes('bike') || s.includes('ride') || s.includes('spinning'))
    return 'ride'
  if (s.includes('swim')) return 'swim'
  if (s.includes('run') || s.includes('jog') || s.includes('walk') || s.includes('hike'))
    return 'run'
  return 'other'
}

/**
 * Normalize a Fitbit activity log entry into our internal StravaActivity schema.
 * Fitbit duration is in milliseconds; distance is in the user's preferred unit
 * (we assume km; Fitbit distanceUnit field may say "Kilometer" or "Mile").
 */
function normalizeFitbitActivity(raw: Record<string, unknown>): StravaActivity {
  const durationMs = Number(raw.duration ?? 0)
  const durationSec = Math.round(durationMs / 1000)

  // Fitbit distance unit: default km, convert if miles
  const distanceUnit = String(raw.distanceUnit ?? 'Kilometer').toLowerCase()
  const rawDist = Number(raw.distance ?? 0)
  const distanceMeters = distanceUnit.includes('mile') ? rawDist * 1609.34 : rawDist * 1000

  const sportType = String(raw.activityParentName ?? raw.name ?? 'Activity')
  let internalType = 'Run'
  if (/cycling|bike|ride|spinning/i.test(sportType)) internalType = 'Ride'
  else if (/swim/i.test(sportType)) internalType = 'Swim'

  const startDate = `${String(raw.startDate ?? new Date().toISOString().split('T')[0])}T${String(raw.startTime ?? '00:00')}:00`

  return {
    id: Number(raw.logId ?? Date.now() + Math.random()),
    name: String(raw.name ?? `Fitbit ${internalType}`),
    sport_type: internalType,
    type: internalType,
    start_date: startDate,
    distance: distanceMeters,
    moving_time: durationSec,
    elapsed_time: durationSec,
    total_elevation_gain: Math.round(Number(raw.elevationGain ?? 0)),
    has_heartrate: !!raw.averageHeartRate,
    average_heartrate: raw.averageHeartRate ? Number(raw.averageHeartRate) : undefined,
    map: {}, // Fitbit does not expose GPS polylines via the web API
  }
}

/** Fetch the last 20 activities from Fitbit using a stored access token */
async function fetchFitbitActivities(accessToken: string): Promise<StravaActivity[]> {
  try {
    const afterDate = new Date()
    afterDate.setDate(afterDate.getDate() - 90)
    const url = `/api/fitbit/1/user/-/activities/list.json?afterDate=${afterDate.toISOString().split('T')[0]}&sort=desc&offset=0&limit=20`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return []
    const json = (await res.json()) as { activities?: Record<string, unknown>[] }
    return (json.activities ?? []).map(normalizeFitbitActivity)
  } catch {
    return []
  }
}

/** Fetch today's Fitbit daily activity summary + resting heart rate */
async function fetchFitbitDailySummary(accessToken: string): Promise<FitbitDailySummary | null> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const [summaryRes, hrRes] = await Promise.all([
      fetch(`/api/fitbit/1/user/-/activities/date/${today}.json`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`/api/fitbit/1/user/-/activities/heart/date/today/1d.json`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ])
    if (!summaryRes.ok) return null
    const summaryJson = (await summaryRes.json()) as {
      summary?: {
        steps?: number
        caloriesOut?: number
        distances?: { activity: string; distance: number }[]
        fairlyActiveMinutes?: number
        veryActiveMinutes?: number
        floors?: number
      }
    }
    const s = summaryJson.summary
    if (!s) return null

    const totalDist = s.distances?.find(d => d.activity === 'total')?.distance ?? 0

    let restingHeartRate: number | undefined
    if (hrRes.ok) {
      const hrJson = (await hrRes.json()) as {
        'activities-heart'?: { value?: { restingHeartRate?: number } }[]
      }
      restingHeartRate = hrJson['activities-heart']?.[0]?.value?.restingHeartRate
    }

    return {
      steps: s.steps ?? 0,
      caloriesOut: s.caloriesOut ?? 0,
      distanceKm: Math.round(totalDist * 10) / 10,
      activeMinutes: (s.fairlyActiveMinutes ?? 0) + (s.veryActiveMinutes ?? 0),
      floors: s.floors,
      restingHeartRate,
    }
  } catch {
    return null
  }
}

/** Derive cumulative stats from a list of normalized device activities */
function computeStravaStats(activities: StravaActivity[]): StravaCumulativeStats {
  const runs = activities.filter(a =>
    ['Run', 'VirtualRun', 'TrailRun'].includes(a.sport_type ?? a.type)
  )
  const totalDistanceKm = activities.reduce((s, a) => s + (a.distance ?? 0), 0) / 1000
  const totalHours = activities.reduce((s, a) => s + (a.moving_time ?? 0), 0) / 3600
  return {
    runCount: runs.length,
    totalDistanceKm: Math.round(totalDistanceKm),
    totalHours: Math.round(totalHours),
    recentActivity: activities[0],
  }
}

// ─── Achievement Data (empty — populated via "Log Past" / RunSignUp flow) ──────

/** Achievements start empty. They are created through the PostComposer
 *  "Log Past" tab (RunSignUp BIB verification → Layer 6) or the
 *  Feature/Journey creation flow. */
const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'test-marathon-2026',
    title: 'Standard Chartered Marathon HK',
    eventName: 'Standard Chartered Hong Kong Marathon 2026',
    status: 'Completed',
    thumbnail: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&h=450&fit=crop',
    progress: 100,
    activityCount: 1,
    rootOfTrust: 'Official Race Result',
    pillar: 'sport',
    sportType: 'marathon',
    summaryStats: {
      completionTime: '3:22:07',
      stat1: { label: 'Finish Time', value: '3:22:07' },
      stat2: { label: 'Distance', value: '42.2 km' },
      stat3: { label: 'Overall Rank', value: '188 / 4,200' },
    },
    trustLayers: [
      { id: 'self', label: 'Self-Declared', verified: true },
      { id: 'device', label: 'Fitbit Biometrics', verified: true },
      { id: 'media', label: 'Photo Evidence', verified: true },
      { id: 'peer', label: 'Peer Witness', verified: true },
      { id: 'institutional', label: 'SportSplits', verified: true },
      { id: 'official', label: 'Race Organiser', verified: false },
    ],
    journey: [
      {
        id: 'j1',
        stage: 'Registration',
        date: '2025-11-01',
        detail: 'Registered for Standard Chartered HK Marathon',
        trustLayerIds: ['self'],
      },
      {
        id: 'j2',
        stage: 'Training',
        date: '2026-01-15',
        detail: '16-week marathon training block complete',
        duration: '9:45:00',
        distanceKm: 120,
        trustLayerIds: ['self', 'device'],
      },
      {
        id: 'j3',
        stage: 'Race Day',
        date: '2026-02-16',
        detail: 'Finished in 3:22:07 · Rank 188/4,200',
        duration: '3:22:07',
        distanceKm: 42.2,
        trustLayerIds: ['self', 'device', 'media', 'peer', 'institutional'],
      },
    ],
    artefacts: [
      {
        type: 'result',
        label: 'Finish Time',
        value: '3:22:07',
        sublabel: 'Net chip time',
        source: 'SportSplits',
      },
      {
        type: 'result',
        label: 'Overall Rank',
        value: '188 / 4,200',
        sublabel: 'Open category',
        source: 'SportSplits',
      },
      {
        type: 'device',
        label: 'Avg Heart Rate',
        value: '158 bpm',
        sublabel: 'Race day',
        source: 'Fitbit',
      },
    ],
    activityLog: [
      {
        id: 'al1',
        title: 'Race Day — SCHKM 2026',
        date: '2026-02-16',
        type: 'run',
        distanceKm: 42.2,
        duration: '3:22:07',
        heartRate: 158,
        layerIds: ['self', 'device', 'institutional'],
      },
    ],
    verificationData: {
      provider: 'sportsplits',
      providerLabel: 'SportSplits',
      providerLogoText: 'SS',
      eventName: 'Standard Chartered Hong Kong Marathon 2026',
      year: 2026,
      rank: '188',
      totalParticipants: 4200,
      verified: true,
      splits: [
        { label: '10K', time: '0:47:23', paceOrSpeed: '4:44/km', progressPct: 24 },
        { label: '21.1K', time: '1:40:11', paceOrSpeed: '4:46/km', progressPct: 50 },
        { label: '30K', time: '2:24:55', paceOrSpeed: '4:52/km', progressPct: 71 },
        { label: 'Finish', time: '3:22:07', paceOrSpeed: '4:48/km', progressPct: 100 },
      ],
      trustNote: 'Rank 188/4,200 · Standard Chartered HK Marathon 2026 · SportSplits',
    },
  },
]

// ─── Story Overlay ────────────────────────────────────────────────────────────

const STORY_DURATION = 4000

function StoryOverlay({
  highlight,
  onClose,
}: {
  highlight: (typeof HIGHLIGHT_ITEMS)[0]
  onClose: () => void
}) {
  const content = HIGHLIGHT_VIEW_CONTENT[highlight.label]
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [progress, setProgress] = useState(0)

  const goNext = useCallback(() => {
    if (currentIndex < content.images.length - 1) {
      setDirection(1)
      setCurrentIndex(i => i + 1)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentIndex, content.images.length, onClose])

  const goPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex(i => i - 1)
      setProgress(0)
    }
  }

  useEffect(() => {
    setProgress(0)
    let start = 0
    let rafId: number

    const tick = (ts: number) => {
      if (!start) start = ts
      const elapsed = ts - start
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100)
      setProgress(pct)
      if (pct < 100) {
        rafId = requestAnimationFrame(tick)
      } else {
        goNext()
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [currentIndex, goNext])

  if (!content) return null

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0.85 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-25%' : '25%', opacity: 0.6, scale: 0.96 }),
  }

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: '#0A0A0A' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Segmented progress bar */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
        {content.images.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                transition: i === currentIndex ? 'none' : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Header row */}
      <div className="absolute top-10 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/50 flex-shrink-0">
            <img
              src={highlight.imageUrl}
              alt={highlight.label}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-white font-black text-sm uppercase tracking-wider leading-none">
              {highlight.label}
            </p>
            <p className="text-white/50 text-[11px] font-medium mt-0.5">
              {currentIndex + 1} / {content.images.length}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Close story"
        >
          <X size={18} className="text-white" />
        </button>
      </div>

      {/* Story media container */}
      <div className="relative w-full max-w-[390px] h-[calc(100dvh-0px)] sm:h-[85dvh] sm:rounded-2xl overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0"
          >
            <img
              src={content.images[currentIndex].src}
              alt={content.images[currentIndex].alt}
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Caption gradient */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pt-20 pb-8 px-5">
              <p className="text-white text-sm font-semibold leading-relaxed">
                {content.description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Tap zones — invisible buttons over left/right halves */}
        <button
          className="absolute left-0 top-0 w-[45%] h-full z-10 outline-none"
          onClick={goPrev}
          aria-label="Previous story"
        />
        <button
          className="absolute right-0 top-0 w-[55%] h-full z-10 outline-none"
          onClick={goNext}
          aria-label="Next story"
        />

        {/* Visible arrow controls (desktop) */}
        {currentIndex > 0 && (
          <button
            onClick={goPrev}
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)' }}
            aria-label="Previous story"
          >
            <ChevronLeft size={22} className="text-white" />
          </button>
        )}
        <button
          onClick={goNext}
          className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)' }}
          aria-label="Next story"
        >
          <ChevronRight size={22} className="text-white" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Achievement Components ───────────────────────────────────────────────────

/** Six-dot Trust Stack: L1=gray, L2–L6=primary accent (#210366 light / #00FFFF dark) */
const TRUST_LAYER_ORDER: TrustLayerId[] = [
  'self',
  'media',
  'device',
  'peer',
  'institutional',
  'official',
]

function TrustStack({
  layers,
  size = 'md',
  variant = 'default',
}: {
  layers: AchievementTrustLayer[]
  size?: 'sm' | 'md'
  variant?: 'default' | 'shelf'
}) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
  return (
    <div className="flex items-center gap-1">
      {TRUST_LAYER_ORDER.map((id, i) => {
        const layer = layers.find(l => l.id === id)
        const verified = layer?.verified ?? false
        const isHighTrust = i >= 3 // peer, institutional, official
        const isOfficial = id === 'official'
        const isSelf = id === 'self'

        let colorClass: string
        if (variant === 'shelf') {
          colorClass = verified
            ? isHighTrust
              ? 'bg-[#5B32B0] dark:bg-[#00FFFF] shadow-[0_0_6px_2px_rgba(91,50,176,0.5)] dark:shadow-[0_0_6px_2px_rgba(224,224,224,0.5)]'
              : 'bg-white/40'
            : 'bg-white/15'
        } else {
          colorClass = verified
            ? isOfficial
              ? 'bg-[#5B32B0] dark:bg-[#00FFFF] shadow-[0_0_6px_2px_rgba(91,50,176,0.55)] dark:shadow-[0_0_6px_2px_rgba(224,224,224,0.55)]'
              : isSelf
                ? 'bg-slate-400 dark:bg-slate-500'
                : 'bg-[#5B32B0] dark:bg-[#00FFFF]'
            : 'bg-slate-200 dark:bg-slate-700'
        }

        return (
          <div
            key={id}
            title={`L${i + 1}: ${layer?.label ?? id}${verified ? ' ✓' : ''}`}
            className={cn(dotSize, 'rounded-full flex-shrink-0 transition-all', colorClass)}
          />
        )
      })}
    </div>
  )
}

function getTrustIcon(id: TrustLayerId, size = 9) {
  switch (id) {
    case 'self':
      return <User size={size} />
    case 'media':
      return <Camera size={size} />
    case 'device':
      return <Zap size={size} />
    case 'peer':
      return <Users size={size} />
    case 'institutional':
      return <Shield size={size} />
    case 'official':
      return <Trophy size={size} />
  }
}

/** Evolution Trophy: primary accent (#210366 light / #00FFFF dark) as verified layers increase */
function EvolutionTrophy({ count, size = 'md' }: { count: number; size?: 'sm' | 'md' }) {
  const TIER_LABEL: Record<number, string> = {
    0: '—',
    1: 'Logged',
    2: 'Documented',
    3: 'Tracked',
    4: 'Witnessed',
    5: 'Endorsed',
    6: 'Certified',
  }
  const label = TIER_LABEL[count] ?? '—'
  const iconSize = size === 'sm' ? 16 : 22
  const isActive = count >= 3

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-0.5 flex-shrink-0',
        isActive ? 'text-[#210366] dark:text-[#00FFFF]' : 'text-slate-400 dark:text-slate-500',
        size === 'sm' ? 'w-8' : 'w-10 pt-0.5'
      )}
    >
      <motion.div
        animate={count === 6 ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={count === 6 ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        <Trophy
          size={iconSize}
          strokeWidth={count <= 1 ? 1.5 : 2.5}
          style={{
            color: 'currentColor',
            fill: count >= 4 ? 'currentColor' : 'none',
            opacity: count >= 4 ? 0.25 : 1,
          }}
        />
      </motion.div>
      <span
        className={cn(
          'font-black uppercase tracking-wider whitespace-nowrap',
          size === 'sm' ? 'text-[6px]' : 'text-[7px]'
        )}
      >
        {label}
      </span>
    </div>
  )
}

function AchievementCard({
  achievement,
  selected,
  waterfallAttached,
  onSelect,
}: {
  achievement: Achievement
  selected: boolean
  waterfallAttached?: boolean
  onSelect: () => void
}) {
  const verifiedCount = (achievement.trustLayers ?? []).filter(l => l.verified).length
  const isComplete = achievement.status === 'Completed'
  const isEdu = achievement.pillar === 'education'

  const gaugeActive = verifiedCount >= 2

  return (
    <motion.div
      role="button"
      tabIndex={0}
      className={cn(
        'w-full rounded-2xl border overflow-hidden cursor-pointer',
        'flex flex-col sm:flex-row',
        waterfallAttached && 'rounded-b-none border-b-0',
        'bg-white dark:bg-[#1E293B] shadow-lg border-slate-200/80 dark:border-slate-700/80',
        selected
          ? 'border-[#210366] dark:border-[#00FFFF] shadow-[0_0_0_2px_rgba(33,3,102,0.2)] dark:shadow-[0_0_0_2px_rgba(0,255,255,0.25)]'
          : 'hover:border-[#210366]/50 dark:hover:border-[#00FFFF]/40'
      )}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      aria-expanded={selected}
      aria-label={`${achievement.title}, ${achievement.eventName}. ${verifiedCount} of ${(achievement.trustLayers ?? []).length} trust signals. ${selected ? 'Collapse evidence' : 'View evidence'}`}
    >
      {/* PHOTO — full-width banner on mobile, left column on sm+ */}
      <div className="w-full h-36 sm:w-[28%] sm:min-w-[140px] sm:max-w-[260px] sm:h-auto flex-shrink-0 relative bg-slate-300 dark:bg-slate-700 overflow-hidden sm:self-stretch sm:min-h-[200px]">
        {achievement.thumbnail && (
          <img
            src={achievement.thumbnail}
            alt={achievement.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Status pill */}
        <div className="absolute top-2.5 left-2">
          <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#210366]/90 dark:bg-[#00FFFF]/90 text-white dark:text-[#0F172A]">
            {isComplete ? 'Awarded' : 'Active'}
          </span>
        </div>

        {/* EDU badge */}
        {isEdu && (
          <div className="absolute top-2.5 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#210366]/95 dark:bg-[#00FFFF]/95 border border-[#210366]/40 dark:border-[#00FFFF]/40 shadow-sm">
            <GraduationCap size={10} className="text-white dark:text-[#0F172A] flex-shrink-0" />
            <span className="text-[9px] font-black text-white dark:text-[#0F172A] leading-none uppercase tracking-wider">
              Beyond the Classroom
            </span>
          </div>
        )}

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-2 py-2 bg-gradient-to-t from-black/80 to-transparent">
          {verifiedCount === 6 ? (
            <span className="text-[7.5px] font-black uppercase tracking-widest text-[#210366] dark:text-[#00FFFF] [text-shadow:0_0_8px_rgba(33,3,102,0.6)] dark:[text-shadow:0_0_8px_rgba(0,255,255,0.6)]">
              ✦ Gold Tier
            </span>
          ) : isEdu && achievement.rootOfTrust ? (
            <span className="text-[9px] font-black text-white leading-tight line-clamp-2 drop-shadow-sm">
              {achievement.rootOfTrust.split('·')[0].trim()}
            </span>
          ) : (
            <span className="text-[7px] font-semibold text-white/60">
              {achievement.activityCount} sessions
            </span>
          )}
        </div>

        {/* AI Verified dot */}
        {achievement.faceVerified && (
          <div className="absolute top-8 left-2 flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-black/60 border border-[#210366]/40 dark:border-[#00FFFF]/40">
            <Sparkles size={6} className="text-[#210366] dark:text-[#00FFFF]" />
            <span className="text-[5.5px] font-black text-white/90 leading-none">AI</span>
          </div>
        )}
      </div>

      {/* CONTENT ROW — takes full width on mobile, flex-1 on sm+ */}
      <div className="flex flex-row flex-1 min-w-0">
        {/* CENTER: Identity + signals */}
        <div className="flex-1 flex flex-col justify-between px-4 py-3 sm:py-4 lg:px-6 min-w-0">
          <div>
            {/* Root-of-trust badge — hidden on mobile to save space */}
            {achievement.rootOfTrust && (
              <div
                className={cn(
                  'hidden sm:inline-flex items-center gap-2.5 mb-2 px-3 py-2 rounded-xl border-2',
                  'bg-[#210366]/8 dark:bg-[#00FFFF]/10 border-[#210366]/30 dark:border-[#00FFFF]/40'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-black border-2',
                    'bg-[#210366]/15 dark:bg-[#00FFFF]/15 border-[#210366] dark:border-[#00FFFF] text-[#210366] dark:text-[#00FFFF]'
                  )}
                >
                  {isEdu ? (
                    achievement.rootOfTrust.split('·')[0].trim().slice(0, 2).toUpperCase()
                  ) : (
                    <Shield size={20} strokeWidth={2.5} />
                  )}
                </div>
                <div className="min-w-0">
                  <span
                    className={cn(
                      'block font-black leading-tight truncate text-[13px] lg:text-[15px]',
                      'text-[#210366] dark:text-[#00FFFF]'
                    )}
                  >
                    {achievement.rootOfTrust.split('·')[0].trim()}
                  </span>
                  {isEdu && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#5B32B0] dark:text-[#00FFFF]">
                      Layer 5 · Institutional
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Title — smaller on mobile, clamp on sm+ */}
            <h4 className="font-black tracking-tight leading-tight text-black dark:text-white text-[17px] sm:text-[22px]">
              {achievement.title}
            </h4>
            <p className="text-[12px] sm:text-[13px] lg:text-[14px] font-semibold text-black/70 dark:text-white/70 mt-0.5 leading-tight truncate">
              {achievement.eventName}
            </p>
          </div>

          {/* Bottom: Signal depth + View Evidence chevron */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  gaugeActive
                    ? 'bg-[#5B32B0] dark:bg-[#00FFFF] shadow-[0_0_6px_rgba(91,50,176,0.6)] dark:shadow-[0_0_6px_rgba(224,224,224,0.6)]'
                    : 'bg-slate-400 dark:bg-slate-500'
                )}
                aria-hidden
              />
              <span className="text-[11px] font-bold text-black/70 dark:text-white/70 tabular-nums">
                {verifiedCount}/6 signals
              </span>
            </div>
            <div
              className={cn(
                'flex items-center gap-1.5 text-[11px] font-black',
                selected ? 'text-[#5B32B0] dark:text-[#00FFFF]' : 'text-black/60 dark:text-white/60'
              )}
            >
              {selected ? 'Collapse' : 'View Evidence'}
              <motion.span
                animate={{ rotate: selected ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                aria-hidden
              >
                <ChevronDown size={14} strokeWidth={2.5} />
              </motion.span>
            </div>
          </div>
        </div>

        {/* RIGHT: Trophy + trust gauge */}
        <div
          className={cn(
            'w-[72px] sm:w-[14%] sm:min-w-[72px] sm:max-w-[100px] flex-shrink-0 flex flex-col items-center justify-center gap-2 py-3 sm:py-4 px-2 border-l',
            'border-slate-100 dark:border-slate-700/40'
          )}
        >
          <EvolutionTrophy count={verifiedCount} size="sm" />
          <div className="flex flex-col gap-0.5 w-full max-w-[48px]">
            {TRUST_LAYER_ORDER.map((id, i) => {
              const layer = (achievement.trustLayers ?? []).find(l => l.id === id)
              const verified = layer?.verified ?? false
              const isSelf = i === 0
              return (
                <div
                  key={id}
                  className="relative h-[6px] rounded-sm overflow-hidden bg-slate-100 dark:bg-slate-700/60"
                >
                  {verified && (
                    <motion.div
                      className={cn(
                        'absolute inset-0 rounded-sm',
                        isSelf
                          ? 'bg-slate-400 dark:bg-slate-500'
                          : 'bg-[#210366] dark:bg-[#00FFFF]',
                        i === 5 &&
                          'shadow-[0_0_3px_1px_rgba(33,3,102,0.4)] dark:shadow-[0_0_3px_1px_rgba(0,255,255,0.4)]'
                      )}
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.45, delay: i * 0.07, ease: 'easeOut' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <span className="text-[7px] font-bold text-slate-400 tabular-nums">
            {verifiedCount}/6
          </span>
        </div>
      </div>
    </motion.div>
  )
}

const LAYER_FULL_NAMES: Record<TrustLayerId, string> = {
  self: "ATHLETE'S LOG",
  media: 'PHOTO PROOF',
  device: 'LIVE DATA',
  peer: 'SQUAD VOUCHED',
  institutional: 'INSTITUTIONAL',
  official: 'OFFICIAL RESULT',
}

function AchievementWaterfallPanel({
  achievement,
  attachedToCard,
  onClose,
  onJourneyClick,
  deviceStats,
  deviceError,
  shareRef,
}: {
  achievement: Achievement
  attachedToCard?: boolean
  onClose: () => void
  onJourneyClick: () => void
  deviceStats?: StravaCumulativeStats | null
  deviceError?: string | null
  shareRef?: React.RefObject<HTMLDivElement>
}) {
  const trustLayers = achievement.trustLayers ?? []
  const verifiedCount = trustLayers.filter(l => l.verified).length
  const isComplete = achievement.status === 'Completed'
  const rootOfTrustLabel = achievement.rootOfTrust?.split('·')[0].trim() ?? 'Flinki Verified'
  const allVerified = verifiedCount === trustLayers.length && trustLayers.length > 0
  const [showCongrats, setShowCongrats] = useState(false)

  const deviceArtefacts = achievement.artefacts?.filter(a => a.type === 'device') ?? []
  const resultArtefacts = achievement.artefacts?.filter(a => a.type === 'result') ?? []
  const mediaArtefacts = achievement.artefacts?.filter(a => a.type === 'media') ?? []
  const primaryResult = resultArtefacts[0]
  const primaryDevice = deviceArtefacts[0]
  const primaryMedia = mediaArtefacts[0]

  const borderCls = 'border-[#210366]/20 dark:border-[#00FFFF]/20'
  const headerCls =
    'bg-gradient-to-r from-[#210366]/5 to-[#210366]/10 dark:from-[#00FFFF]/10 dark:to-[#00FFFF]/5 border-[#210366]/15 dark:border-[#00FFFF]/20'

  /** Activity type → icon helper */
  function ActivityTypeIcon({
    type,
    size = 13,
  }: {
    type: ActivityLogEntry['type']
    size?: number
  }) {
    const cls = 'flex-shrink-0 text-[#210366] dark:text-[#00FFFF]'
    switch (type) {
      case 'run':
        return <Activity size={size} className={cls} />
      case 'bike':
        return <Bike size={size} className={cls} />
      case 'swim':
        return <Waves size={size} className={cls} />
      case 'hike':
        return <Mountain size={size} className={cls} />
      case 'match':
        return <Users size={size} className={cls} />
      case 'practice':
        return <GraduationCap size={size} className={cls} />
      case 'event':
        return <Trophy size={size} className={cls} />
      default:
        return <BarChart2 size={size} className={cls} />
    }
  }

  /** One Evidence Block per layer — collapsed by default, L1 activity list, L2 inline detail */
  function EvidenceBlock({
    id,
    layerIndex,
    verified,
    primaryText,
    subText,
    rootLabel,
    activities,
    verificationData,
  }: {
    id: TrustLayerId
    layerIndex: number
    verified: boolean
    primaryText: string
    subText?: string
    rootLabel: string
    activities: ActivityLogEntry[]
    verificationData?: VerificationResult
  }) {
    const [open, setOpen] = useState(false)
    const [selectedActivity, setSelectedActivity] = useState<ActivityLogEntry | null>(null)

    return (
      <div
        className={cn(
          'rounded-lg border overflow-hidden',
          verified
            ? 'bg-white/80 dark:bg-[#1E293B] border-[#210366]/20 dark:border-[#00FFFF]/20'
            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
        )}
      >
        {/* ── Layer header row (always visible) ── */}
        <button
          type="button"
          onClick={() => {
            setOpen(o => !o)
            setSelectedActivity(null)
          }}
          className="w-full flex items-center justify-between px-3 py-2 gap-2 text-left"
        >
          <span
            className={cn(
              'text-[11px] font-black uppercase tracking-widest',
              verified ? 'text-[#210366] dark:text-[#00FFFF]' : 'text-black/40 dark:text-white/40'
            )}
          >
            L{layerIndex + 1} · {LAYER_FULL_NAMES[id]}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {activities.length > 0 && (
              <span className="text-[9px] font-black text-slate-400 tabular-nums">
                {activities.length}
              </span>
            )}
            {verified ? (
              <CheckCircle2 size={13} className="text-[#210366] dark:text-[#00FFFF]" />
            ) : (
              <Circle size={13} className="text-black/30 dark:text-white/30" />
            )}
            <ChevronDown
              size={13}
              className={cn('transition-transform text-slate-400', open && 'rotate-180')}
            />
          </div>
        </button>

        {/* ── Level 2: Individual Activity Detail ── */}
        {open && selectedActivity && (
          <div className="border-t border-slate-200/60 dark:border-slate-600/40">
            <button
              type="button"
              onClick={() => setSelectedActivity(null)}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black text-[#210366] dark:text-[#00FFFF] hover:underline w-full"
            >
              <ArrowLeft size={11} /> Back to activities
            </button>
            <div className="px-3 pb-3 border-t border-slate-200/60 dark:border-slate-600/40 space-y-2.5">
              <div className="flex items-start gap-2 pt-2.5">
                <div className="w-7 h-7 rounded-md bg-[#210366]/8 dark:bg-[#00FFFF]/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ActivityTypeIcon type={selectedActivity.type} size={14} />
                </div>
                <div>
                  <p className="text-[13px] font-black text-black dark:text-white leading-tight">
                    {selectedActivity.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{selectedActivity.date}</p>
                </div>
              </div>
              {(selectedActivity.distanceKm !== undefined || selectedActivity.duration) && (
                <div className="flex gap-2">
                  {selectedActivity.distanceKm !== undefined && (
                    <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-2.5 py-2 text-center">
                      <p className="text-[14px] font-black text-black dark:text-white tabular-nums">
                        {selectedActivity.distanceKm} km
                      </p>
                      <p className="text-[9px] text-slate-400">Distance</p>
                    </div>
                  )}
                  {selectedActivity.duration && (
                    <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-2.5 py-2 text-center">
                      <p className="text-[14px] font-black text-black dark:text-white tabular-nums">
                        {selectedActivity.duration}
                      </p>
                      <p className="text-[9px] text-slate-400">Duration</p>
                    </div>
                  )}
                </div>
              )}
              {/* ── Biometric Root of Trust — Fitbit heart rate ── */}
              {selectedActivity.heartRate && (
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#F59E0B]/8 dark:bg-[#00FFFF]/8 border border-[#F59E0B]/25 dark:border-[#00FFFF]/20">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="flex-shrink-0 text-[#F59E0B] dark:text-[#00FFFF]"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-black text-[#F59E0B] dark:text-[#00FFFF] tabular-nums">
                      {selectedActivity.heartRate} bpm
                    </span>
                    <span className="text-[9px] text-black/50 dark:text-white/50 ml-1.5">
                      Avg Heart Rate
                    </span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-wider text-[#F59E0B] dark:text-[#00FFFF] flex-shrink-0">
                    Fitbit Verified
                  </span>
                </div>
              )}
              {selectedActivity.deviceData && (
                <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-[#210366]/5 dark:bg-[#00FFFF]/5 border border-[#210366]/15 dark:border-[#00FFFF]/15">
                  <Zap
                    size={11}
                    className="text-[#210366] dark:text-[#00FFFF] flex-shrink-0 mt-0.5"
                  />
                  <p className="text-[10px] font-bold text-black/80 dark:text-white/80">
                    {selectedActivity.deviceData}
                  </p>
                </div>
              )}
              {selectedActivity.photoUrl && (
                <img
                  src={selectedActivity.photoUrl}
                  alt={selectedActivity.title}
                  className="w-full rounded-lg object-cover max-h-32"
                />
              )}
              {selectedActivity.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {selectedActivity.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Level 1: Layer Evidence + Activity Timeline ── */}
        {open && !selectedActivity && (
          <div className="border-t border-slate-200/60 dark:border-slate-600/40">
            {/* Layer evidence summary */}
            <div className="px-3 pt-2.5 pb-2">
              <p
                className={cn(
                  'text-[1.25rem] font-black tabular-nums leading-tight',
                  verified ? 'text-black dark:text-white' : 'text-black/40 dark:text-white/40'
                )}
                style={{ fontFeatureSettings: '"tnum"' }}
              >
                {primaryText}
              </p>
              {subText && (
                <p className="mt-0.5 text-[0.75rem] font-bold text-black/60 dark:text-white/60">
                  {subText}
                </p>
              )}
              {/* Provider badge + root-of-trust label */}
              <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-600/40 flex-wrap">
                {verificationData ? (
                  <>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white"
                      style={{ backgroundColor: PROVIDER_ACCENT[verificationData.provider] }}
                    >
                      {verificationData.providerLogoText}
                    </span>
                    <span className="text-[10px] font-black text-black/70 dark:text-white/70 truncate">
                      {verificationData.trustNote}
                    </span>
                    {typeof verificationData.finaPoints === 'number' && (
                      <span className="ml-auto text-[10px] font-black text-[#005BAC] dark:text-[#00FFFF]">
                        {finaPointsToTrustStrength(verificationData.finaPoints)}% Trust
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Shield
                      size={12}
                      className={cn(
                        'flex-shrink-0',
                        verified
                          ? 'text-[#210366] dark:text-[#00FFFF]'
                          : 'text-black/40 dark:text-white/40'
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] font-black uppercase tracking-wider',
                        verified
                          ? 'text-black/70 dark:text-white/70'
                          : 'text-black/40 dark:text-white/40'
                      )}
                    >
                      {rootLabel}
                    </span>
                  </>
                )}
              </div>

              {/* SportSplits horizontal progress bar */}
              {verificationData?.splits && verificationData.splits.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Race Splits
                  </p>
                  {verificationData.splits.map(split => (
                    <div key={split.label} className="flex items-center gap-2">
                      <span className="w-10 text-[9px] font-black text-black/60 dark:text-white/60 flex-shrink-0">
                        {split.label}
                      </span>
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${split.progressPct}%`,
                            backgroundColor: PROVIDER_ACCENT[verificationData.provider],
                          }}
                        />
                      </div>
                      <span className="w-14 text-[9px] font-black tabular-nums text-black dark:text-white text-right flex-shrink-0">
                        {split.time}
                      </span>
                      {split.paceOrSpeed && (
                        <span className="text-[8px] text-slate-400 flex-shrink-0 hidden sm:block">
                          {split.paceOrSpeed}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Sportradar peloton note */}
              {verificationData?.pelotonNote && (
                <p className="mt-2 text-[10px] font-bold text-[#00FFFF] dark:text-[#00FFFF]">
                  {verificationData.pelotonNote}
                </p>
              )}
            </div>
            {/* Activity Timeline */}
            {activities.length > 0 && (
              <div className="border-t border-slate-200/60 dark:border-slate-600/40">
                <p className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Activity Timeline
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {activities.map(activity => (
                    <button
                      key={activity.id}
                      type="button"
                      onClick={() => setSelectedActivity(activity)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-md bg-[#210366]/8 dark:bg-[#00FFFF]/8 flex items-center justify-center flex-shrink-0">
                        <ActivityTypeIcon type={activity.type} size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-black dark:text-white truncate">
                          {activity.title}
                        </p>
                        <p className="text-[9px] text-slate-400 truncate">
                          {activity.date}
                          {activity.distanceKm !== undefined && ` · ${activity.distanceKm} km`}
                          {activity.duration && ` · ${activity.duration}`}
                        </p>
                      </div>
                      {activity.heartRate && (
                        <span className="flex items-center gap-0.5 flex-shrink-0 text-[9px] font-black text-[#F59E0B] dark:text-[#00FFFF] bg-[#F59E0B]/10 dark:bg-[#00FFFF]/10 px-1.5 py-0.5 rounded-full">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                          </svg>
                          {activity.heartRate}
                        </span>
                      )}
                      <ChevronRight
                        size={11}
                        className="text-slate-300 dark:text-slate-600 flex-shrink-0"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={shareRef}
      className={cn(
        'overflow-hidden border bg-white dark:bg-[#1E293B]',
        attachedToCard ? 'rounded-b-2xl rounded-t-none border-t-0' : 'rounded-2xl border mt-3',
        borderCls
      )}
    >
      {/* Connector: vertical line from card gauge into first node (when attached) */}
      {attachedToCard && (
        <div className="flex justify-end px-3 pt-0" aria-hidden>
          <div className="w-0.5 h-3 rounded-b bg-gradient-to-b from-[#210366] to-[#210366]/40 dark:from-[#00FFFF] dark:to-[#00FFFF]/40" />
        </div>
      )}

      {/* Header: title + fixed Trophy (persistent rank anchor) */}
      <div className={cn('flex items-center justify-between px-4 py-2.5 border-b', headerCls)}>
        <div className="flex items-center gap-2.5 min-w-0">
          {achievement.thumbnail && (
            <div
              className="w-9 h-9 rounded-lg flex-shrink-0 bg-cover bg-center border border-white/60 dark:border-white/10"
              style={{ backgroundImage: `url('${achievement.thumbnail}')` }}
            />
          )}
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-black/60 dark:text-white/60">
              Evidence Audit Trail
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <EvolutionTrophy count={verifiedCount} size="sm" />
          <button
            type="button"
            onClick={onJourneyClick}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border transition-colors',
              'border-[#210366]/40 text-[#210366] dark:text-[#00FFFF] hover:bg-[#210366]/6 dark:hover:bg-[#00FFFF]/10'
            )}
          >
            <FileText size={10} /> Full Journey
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#210366] dark:focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2"
            aria-label="Close evidence waterfall"
          >
            <X size={13} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Completion celebration banner */}
      {isComplete && (
        <div className="mx-3 mt-3 px-4 py-3 rounded-xl bg-[#210366]/8 dark:bg-[#00FFFF]/10 border border-[#210366]/20 dark:border-[#00FFFF]/20 flex items-start gap-2.5">
          <Trophy size={14} className="text-[#210366] dark:text-[#00FFFF] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-black text-[#210366] dark:text-[#00FFFF]">
              Congratulations on finishing {achievement.title}!
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Add your results to your Flinki profile to complete the record.
            </p>
          </div>
        </div>
      )}

      {/* ── Achievement Summary (Top Level) ── */}
      {(achievement.summaryStats || deviceStats) && (
        <div className="mx-3 mt-3 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden bg-slate-50 dark:bg-slate-800/50">
          <div className="px-3 pt-2.5 pb-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-black dark:text-white leading-tight">
                {achievement.title}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">{achievement.eventName}</p>
              {deviceStats && (
                <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-black uppercase tracking-wider text-amber-500">
                  <svg
                    viewBox="0 0 24 24"
                    width="8"
                    height="8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Verified via Fitbit
                </span>
              )}
            </div>
            {achievement.summaryStats?.completionTime && (
              <span className="text-[10px] font-black text-[#210366] dark:text-[#00FFFF] bg-[#210366]/8 dark:bg-[#00FFFF]/10 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                {isComplete
                  ? `Completed · ${achievement.summaryStats.completionTime}`
                  : achievement.summaryStats.completionTime}
              </span>
            )}
          </div>
          {/* Strava cumulative stats override when connected */}
          {deviceStats ? (
            <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700/60">
              {[
                { label: 'Training Runs', value: `${deviceStats.runCount}` },
                {
                  label: 'Total Distance',
                  value: `${deviceStats.totalDistanceKm} km`,
                },
                { label: 'Hours Logged', value: `${deviceStats.totalHours} h` },
              ].map(stat => (
                <div key={stat.label} className="px-2 py-2.5 text-center">
                  <p className="text-[13px] font-black text-black dark:text-white tabular-nums leading-tight">
                    {stat.value}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{stat.label}</p>
                </div>
              ))}
            </div>
          ) : achievement.summaryStats ? (
            <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700/60">
              {(
                [
                  achievement.summaryStats.stat1,
                  achievement.summaryStats.stat2,
                  achievement.summaryStats.stat3,
                ] as { label: string; value: string }[]
              ).map(stat => (
                <div key={stat.label} className="px-2 py-2.5 text-center">
                  <p className="text-[13px] font-black text-black dark:text-white tabular-nums leading-tight">
                    {stat.value}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{stat.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* ── Strava Error Nudge (Layer 3 GPS missing) ── */}
      {deviceError && (
        <div className="mx-3 mt-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 flex items-start gap-2">
          <Zap size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-black text-amber-700 dark:text-amber-400">
              Device sync issue
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">{deviceError}</p>
          </div>
        </div>
      )}

      {/* ── 6 Evidence Layers ── */}
      <div className="p-3 lg:p-4 space-y-2">
        {TRUST_LAYER_ORDER.map((id, i) => {
          const layer = trustLayers.find(l => l.id === id)
          const verified = layer?.verified ?? false
          const layerActivities =
            achievement.activityLog?.filter(a => a.layerIds.includes(id)) ?? []

          let primaryText: string
          let subText: string | undefined
          let rootLabel: string

          switch (id) {
            case 'official':
              primaryText = primaryResult?.value ?? (verified ? 'Certified' : '—')
              subText = primaryResult?.sublabel ?? primaryResult?.label
              rootLabel = primaryResult?.source ?? rootOfTrustLabel
              break
            case 'institutional':
              primaryText = achievement.rootOfTrust ? rootOfTrustLabel : verified ? 'Verified' : '—'
              subText = achievement.rootOfTrust ?? undefined
              rootLabel = achievement.rootOfTrust ?? rootOfTrustLabel
              break
            case 'device':
              primaryText = primaryDevice?.value ?? (verified ? 'Live Data' : '—')
              subText = primaryDevice?.label
              rootLabel = deviceStats
                ? 'Verified via Fitbit · Layer 3'
                : primaryDevice?.source ?? 'Apple Health · Garmin · Fitbit'
              break
            case 'media':
              primaryText =
                primaryMedia?.value ?? primaryMedia?.label ?? (verified ? 'Photo Proof' : '—')
              subText = primaryMedia?.sublabel ?? primaryMedia?.source
              rootLabel = primaryMedia?.source ?? rootOfTrustLabel
              break
            case 'peer':
              primaryText = verified ? 'Squad Vouched' : '—'
              subText = verified ? 'Community witness' : undefined
              rootLabel = 'Flinki Athletes'
              break
            default:
              primaryText = verified ? "Athlete's Log" : '—'
              subText = achievement.journey[0]
                ? `${achievement.journey[0].stage} · ${achievement.journey[0].date}`
                : undefined
              rootLabel = 'Flinki'
          }

          return (
            <EvidenceBlock
              key={id}
              id={id}
              layerIndex={i}
              verified={verified}
              primaryText={primaryText}
              subText={subText}
              rootLabel={rootLabel}
              activities={layerActivities}
              verificationData={id === 'official' ? achievement.verificationData : undefined}
            />
          )
        })}

        {/* ── Complete button ── */}
        <div className="pt-1 pb-1">
          <button
            type="button"
            disabled={!allVerified}
            onClick={() => setShowCongrats(true)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[13px] uppercase tracking-widest transition-all',
              allVerified
                ? 'bg-[#1D9E75] text-white shadow-lg hover:opacity-90 active:scale-[0.98]'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            )}
          >
            <Trophy size={14} />
            {allVerified ? 'Mark as Complete' : `Complete (${verifiedCount}/6 layers verified)`}
          </button>
        </div>
      </div>

      {/* ── Congratulations modal ── */}
      <AnimatePresence>
        {showCongrats && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCongrats(false)}
            style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.7)' }}
          >
            <motion.div
              className="relative bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center"
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Gradient top bar */}
              <div className="h-2 w-full bg-[#1D9E75]" />

              {/* Confetti dots */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
                {[...Array(18)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: ['#210366', '#1D9E75', '#FFD700', '#FF6B6B', '#00FFFF'][i % 5],
                      left: `${(i * 37 + 10) % 90}%`,
                      top: `${(i * 23 + 5) % 60}%`,
                    }}
                    initial={{ opacity: 0, scale: 0, y: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      scale: [0, 1.2, 1, 0],
                      y: [0, -30, -60, -90],
                    }}
                    transition={{ duration: 1.8, delay: i * 0.07, ease: 'easeOut' }}
                  />
                ))}
              </div>

              <div className="px-6 pt-8 pb-8 flex flex-col items-center gap-4">
                {/* Trophy icon */}
                <motion.div
                  className="w-20 h-20 rounded-full bg-[#1D9E75] flex items-center justify-center shadow-xl"
                  initial={{ rotate: -10, scale: 0.7 }}
                  animate={{ rotate: ['-10deg', '10deg', '0deg'], scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
                >
                  <Trophy size={36} className="text-white" />
                </motion.div>

                {/* Headline */}
                <div>
                  <motion.p
                    className="text-[11px] font-black uppercase tracking-widest text-[#1D9E75] mb-1"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    All 6 Layers Verified
                  </motion.p>
                  <motion.h2
                    className="text-[22px] font-black text-black dark:text-white leading-tight"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 }}
                  >
                    You did it, Champion!
                  </motion.h2>
                </div>

                {/* Message */}
                <motion.p
                  className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <span className="font-black text-black dark:text-white">{achievement.title}</span>{' '}
                  is now fully verified and locked into your Flinki record forever. Every drop of
                  sweat, every early morning — it's all proven. This is what excellence looks like.
                </motion.p>

                {/* Stats pill row */}
                {achievement.summaryStats && (
                  <motion.div
                    className="flex gap-2 w-full"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.48 }}
                  >
                    {[
                      achievement.summaryStats.stat1,
                      achievement.summaryStats.stat2,
                      achievement.summaryStats.stat3,
                    ].map(s => (
                      <div
                        key={s.label}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl py-2.5 text-center"
                      >
                        <p className="text-[15px] font-black text-black dark:text-white tabular-nums">
                          {s.value}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* CTA */}
                <motion.button
                  type="button"
                  onClick={() => setShowCongrats(false)}
                  className="mt-1 w-full py-3 rounded-xl bg-[#1D9E75] text-white font-black text-[13px] uppercase tracking-widest shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  Claim Your Achievement 🏆
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AchievementJourneyModal({
  achievement,
  onClose,
  shareRef,
}: {
  achievement: Achievement
  onClose: () => void
  shareRef?: React.RefObject<HTMLDivElement>
}) {
  const modalTrustLayers = achievement.trustLayers ?? []
  const verifiedCount = modalTrustLayers.filter(l => l.verified).length
  const isComplete = achievement.status === 'Completed'
  const [selectedNode, setSelectedNode] = useState<JourneyNode | null>(null)

  return (
    <motion.div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.65)' }}
    >
      <motion.div
        ref={shareRef}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[92dvh] overflow-hidden flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Banner header */}
        <div className="flex-shrink-0 relative">
          {achievement.thumbnail && (
            <div
              className="h-36 bg-cover bg-center"
              style={{ backgroundImage: `url('${achievement.thumbnail}')` }}
            >
              <div className="absolute inset-0 h-36 bg-gradient-to-t from-black/80 to-black/10" />
            </div>
          )}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {shareRef && (
              <button
                type="button"
                onClick={() => {
                  const node = shareRef.current
                  if (!node) return
                  captureAndShare(
                    node,
                    `flinki-${achievement.id}-journey.png`,
                    achievement.title,
                    `${achievement.eventName} · Verified on Flinki`
                  )
                }}
                className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-black/50 text-white text-[11px] font-black hover:bg-black/70 transition-colors"
                aria-label="Share achievement"
              >
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                </svg>
                Share
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="absolute bottom-3 left-4 right-12">
            <p className="text-[9px] font-black text-white/55 uppercase tracking-widest mb-0.5">
              {achievement.eventName}
            </p>
            <h2 className="text-white font-black text-xl leading-tight">{achievement.title}</h2>
            <span
              className={cn(
                'inline-block mt-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full',
                isComplete
                  ? 'bg-[#210366]/90 dark:bg-[#00FFFF]/90 text-slate-900 dark:text-[#0F172A]'
                  : 'bg-[#210366]/90 dark:bg-[#00FFFF]/90 text-white dark:text-[#0F172A]'
              )}
            >
              {achievement.status}
            </span>
          </div>
        </div>

        {/* Scrollable body: Level 2 drill-down or Level 1 timeline */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {selectedNode ? (
            /* Level 2 — Individual Activity Detail */
            <div className="px-5 py-5">
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="flex items-center gap-1.5 text-[11px] font-black text-[#210366] dark:text-[#00FFFF] mb-4 hover:underline"
              >
                <ChevronLeft size={14} />
                Back to timeline
              </button>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Activity detail
              </p>
              <h3 className="text-lg font-black text-black dark:text-white mb-4">
                {selectedNode.stage}
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Date
                  </p>
                  <p className="text-sm font-bold text-black dark:text-white tabular-nums">
                    {selectedNode.date}
                  </p>
                </div>
                {selectedNode.duration && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Duration
                    </p>
                    <p className="text-sm font-bold text-black dark:text-white tabular-nums">
                      {selectedNode.duration}
                    </p>
                  </div>
                )}
                {(selectedNode.distanceLabel ?? selectedNode.distanceKm != null) && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700 col-span-2">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Distance
                    </p>
                    <p className="text-sm font-bold text-black dark:text-white tabular-nums">
                      {selectedNode.distanceLabel ?? `${selectedNode.distanceKm} km`}
                    </p>
                  </div>
                )}
              </div>
              {selectedNode.detail && (
                <div className="mb-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Summary
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {selectedNode.detail}
                  </p>
                </div>
              )}
              {selectedNode.notes && (
                <div className="mb-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {selectedNode.notes}
                  </p>
                </div>
              )}
              {selectedNode.mediaUrls && selectedNode.mediaUrls.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    Media
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedNode.mediaUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Verification strength */}
              <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Signal Strength
                  </p>
                  <span className="text-[10px] font-black text-[#210366] dark:text-[#00FFFF]">
                    {verifiedCount}/{modalTrustLayers.length} Signals
                  </span>
                </div>
                <div className="flex gap-1 mb-3">
                  {modalTrustLayers.map(layer => (
                    <div
                      key={layer.id}
                      className={cn(
                        'flex-1 h-2 rounded-full',
                        layer.verified
                          ? 'bg-[#210366] dark:bg-[#00FFFF]'
                          : 'bg-slate-200 dark:bg-slate-700'
                      )}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {modalTrustLayers.map(layer => (
                    <span
                      key={layer.id}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold',
                        layer.verified
                          ? 'bg-[#210366]/10 dark:bg-[#00FFFF]/10 text-[#210366] dark:text-[#00FFFF]'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                      )}
                    >
                      {layer.verified ? <CheckCircle2 size={9} /> : <Circle size={9} />}
                      {getTrustIcon(layer.id, 9)}
                      {layer.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Journey timeline — tap node for Level 2 detail */}
              <div className="px-5 py-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-5">
                  Achievement Journey · Tap a node for detail
                </p>
                <div className="space-y-0">
                  {achievement.journey.map((node, i) => {
                    const isLast = i === achievement.journey.length - 1
                    const hasContent = node.trustLayerIds.length > 0 || !!node.detail
                    const hasDrillDown = !!(
                      node.duration ??
                      node.distanceKm ??
                      node.distanceLabel ??
                      node.notes ??
                      node.mediaUrls?.length
                    )

                    return (
                      <div key={node.id} className="flex gap-4">
                        <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                          <div
                            className={cn(
                              'w-3 h-3 rounded-full ring-2 flex-shrink-0',
                              hasContent
                                ? 'bg-[#210366] dark:bg-[#00FFFF] ring-[#210366]/25 dark:ring-[#00FFFF]/25'
                                : 'bg-slate-200 dark:bg-slate-700 ring-transparent'
                            )}
                          />
                          {!isLast && (
                            <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-1 min-h-[52px]" />
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => hasDrillDown && setSelectedNode(node)}
                          className={cn(
                            'flex-1 pb-6 text-left rounded-lg -mx-1 px-1 transition-colors',
                            hasDrillDown &&
                              'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                          )}
                        >
                          <div className="flex items-baseline gap-2 mb-1.5">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#210366] dark:text-[#00FFFF]">
                              {node.stage}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {node.date}
                            </span>
                            {hasDrillDown && (
                              <span className="text-[9px] text-slate-400 ml-auto">View detail</span>
                            )}
                          </div>
                          {node.detail && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2 line-clamp-2">
                              {node.detail}
                            </p>
                          )}
                          {node.activities && node.activities.length > 0 && (
                            <ul className="space-y-1 mb-2">
                              {node.activities.map((act, ai) => (
                                <li
                                  key={ai}
                                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
                                >
                                  <div className="w-1 h-1 rounded-full bg-[#210366] dark:bg-[#00FFFF] flex-shrink-0" />
                                  {act}
                                </li>
                              ))}
                            </ul>
                          )}
                          {node.trustLayerIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {node.trustLayerIds.map(layerId => {
                                const layer = modalTrustLayers.find(l => l.id === layerId)
                                if (!layer) return null
                                return (
                                  <span
                                    key={layerId}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#210366]/10 dark:bg-[#00FFFF]/10 text-[#210366] dark:text-[#00FFFF] text-[9px] font-bold"
                                  >
                                    {getTrustIcon(layerId, 8)}
                                    {layer.label}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Flinki branding footer — always visible in the capture */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            {/* Logomark: two overlapping hexagons */}
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <polygon points="11,1 20,6 20,16 11,21 2,16 2,6" fill="#210366" opacity="0.15" />
              <polygon
                points="11,4 18,8 18,15 11,19 4,15 4,8"
                fill="none"
                stroke="#210366"
                strokeWidth="1.5"
              />
              <polygon points="11,7 16,10 16,14 11,17 6,14 6,10" fill="#210366" />
            </svg>
            <span className="text-[13px] font-black tracking-tight text-[#210366] dark:text-[#00FFFF]">
              flinki
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 tracking-wide">
            Verified Achievement
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Flinki Snapshot Modal ────────────────────────────────────────────────────

const TRUST_LAYER_META: { id: TrustLayerId; label: string }[] = [
  { id: 'self', label: "Athlete's Log" },
  { id: 'media', label: 'Photo Proof' },
  { id: 'device', label: 'Live Data' },
  { id: 'peer', label: 'Squad Vouched' },
  { id: 'institutional', label: 'Org Backed' },
  { id: 'official', label: 'Race Certified' },
]

function FlinkiSnapshotModal({
  achievements,
  onClose,
}: {
  achievements: Achievement[]
  onClose: () => void
}) {
  const totalPossible = achievements.length * 6
  const totalVerified = achievements.reduce(
    (sum, a) => sum + (a.trustLayers ?? []).filter(l => l.verified).length,
    0
  )
  const score = Math.round((totalVerified / totalPossible) * 100)

  // Sort highest trust first
  const sorted = [...achievements].sort(
    (a, b) =>
      (b.trustLayers ?? []).filter(l => l.verified).length -
      (a.trustLayers ?? []).filter(l => l.verified).length
  )

  function exportVerifiedCV() {
    const achievementsHtml = achievements
      .map(a => {
        const verified = (a.trustLayers ?? []).filter(l => l.verified).length
        const dots = (
          ['self', 'media', 'device', 'peer', 'institutional', 'official'] as TrustLayerId[]
        )
          .map(id => {
            const layer = (a.trustLayers ?? []).find(l => l.id === id)
            return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${layer?.verified ? '#210366' : '#e2e8f0'};margin-right:3px;vertical-align:middle;"></span>`
          })
          .join('')
        return `
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:12px;break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div>
              <p style="font-weight:900;font-size:15px;margin:0 0 2px 0;">${a.title}</p>
              <p style="color:#64748b;font-size:11px;margin:0;">${a.eventName}</p>
            </div>
            <span style="font-size:9px;font-weight:900;padding:3px 8px;border-radius:999px;background:${a.status === 'Completed' ? '#dcfce7' : '#fef3c7'};color:${a.status === 'Completed' ? '#15803d' : '#92400e'};">${a.status === 'Completed' ? 'AWARDED' : a.status.toUpperCase()}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
            <div>${dots}</div>
            <span style="font-size:10px;color:#64748b;">${verified}/6 proof signals · ${a.activityCount} sessions</span>
          </div>
          ${a.rootOfTrust ? `<p style="font-size:10px;color:#210366;font-weight:700;margin:0;">✦ Certified by: ${a.rootOfTrust}</p>` : ''}
          ${a.artefacts && a.artefacts.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">${a.artefacts.map(ar => `<span style="font-size:9px;background:#f1f5f9;padding:3px 8px;border-radius:6px;color:#475569;"><strong>${ar.label}:</strong> ${ar.value ?? ''}${ar.sublabel ? ` · ${ar.sublabel}` : ''}</span>`).join('')}</div>` : ''}
        </div>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Flinki Verified CV – Alex Rivera</title>
  <style>
    @page { margin: 18mm 20mm; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
    body { color: #0f172a; background: white; margin: 0; padding: 32px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body style="max-width:780px;margin:0 auto;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #210366;gap:20px;">
    <!-- Avatar -->
    <div style="flex-shrink:0;">
      <img
        src="${AVATAR}"
        alt="Alex Rivera"
        style="width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid #210366;display:block;"
        crossorigin="anonymous"
      />
    </div>
    <!-- Identity -->
    <div style="flex:1;min-width:0;">
      <p style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 4px 0;">Flinki · Global Verified Passport</p>
      <h1 style="font-size:26px;font-weight:900;margin:0 0 3px 0;">Alex Rivera</h1>
      <p style="color:#64748b;font-size:12px;margin:0 0 6px 0;">Elite Triathlete · CS Student · Sausalito, CA · UC Berkeley</p>
      <p style="color:#475569;font-size:11px;margin:0;">Elite Endurance Athlete and CS Student. Optimizing VO2 Max for the 2026 Ironman while building scalable web architectures.</p>
    </div>
    <!-- Rep Score -->
    <div style="text-align:center;background:#210366;color:white;padding:14px 22px;border-radius:14px;flex-shrink:0;">
      <p style="font-size:34px;font-weight:900;margin:0;line-height:1;">${score}</p>
      <p style="font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;margin:5px 0 0 0;opacity:0.85;">Rep Score</p>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
    ${[
      { label: 'Total Achievements', value: String(achievements.length) },
      {
        label: 'Awarded',
        value: String(achievements.filter(a => a.status === 'Completed').length),
      },
      { label: 'Proof Signals', value: `${totalVerified}/${totalPossible}` },
      { label: 'Trust Score', value: `${score}%` },
    ]
      .map(
        s => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center;">
      <p style="font-size:20px;font-weight:900;margin:0 0 2px 0;">${s.value}</p>
      <p style="font-size:9px;color:#64748b;margin:0;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;">${s.label}</p>
    </div>`
      )
      .join('')}
  </div>

  <h2 style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;color:#94a3b8;margin:0 0 10px 0;">Achievement Ledger</h2>
  ${achievementsHtml}

  <div style="margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
    <p style="font-size:9px;color:#94a3b8;margin:0;">Generated by Flinki · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p style="font-size:9px;font-weight:900;color:#210366;margin:0;">flinki.app/@alexrivera</p>
  </div>
</body>
</html>`

    const w = window.open('', '_blank', 'width=900,height=720')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => {
      w.print()
    }, 400)
  }

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ backdropFilter: 'blur(14px)', background: 'rgba(0,0,0,0.78)' }}
    >
      <motion.div
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[92dvh] overflow-hidden flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
      >
        {/* PDF-style header */}
        <div className="flex-shrink-0 bg-gradient-to-br from-slate-900 to-[#0d4fa8] p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[9px] font-black text-white/45 uppercase tracking-[0.2em] mb-1">
                Flinki Proof Record
              </p>
              <h2 className="text-white font-black text-xl leading-tight">Alex Rivera</h2>
              <p className="text-white/60 text-xs font-semibold mt-0.5">
                Elite Triathlete · CS Student
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X size={15} className="text-white" />
            </button>
          </div>

          {/* Reputation score bar */}
          <div className="bg-black/30 rounded-2xl p-3.5 flex items-center gap-4">
            <div className="text-center flex-shrink-0 w-14">
              <p className="font-black text-3xl leading-none text-white [text-shadow:0_0_12px_rgba(255,255,255,0.4)]">
                {score}
              </p>
              <p className="text-white/60 text-[9px] font-black uppercase tracking-wider mt-1">
                Rep Score
              </p>
            </div>
            <div className="flex-1">
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 6 }).map((_, i) => {
                  const threshold = Math.round((score / 100) * 6)
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 h-2 rounded-full',
                        i < threshold ? 'bg-white' : 'bg-white/15'
                      )}
                    />
                  )
                })}
              </div>
              <p className="text-white/60 text-[10px] font-semibold">
                {totalVerified}/{totalPossible} proof layers active
              </p>
            </div>
          </div>
        </div>

        {/* Achievement list sorted by trust */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="p-5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4">
              Achievements · Ranked by Signal
            </p>
            {sorted.map((ach, rank) => {
              const verifiedCount = (ach.trustLayers ?? []).filter(l => l.verified).length
              const isComplete = ach.status === 'Completed'
              return (
                <div
                  key={ach.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden"
                >
                  {/* Trust tier header */}
                  <div
                    className={cn(
                      'px-3 py-2 flex items-center justify-between',
                      verifiedCount === 6
                        ? 'bg-[#210366]/8 dark:bg-[#00FFFF]/8 border-b border-[#210366]/20 dark:border-[#00FFFF]/20'
                        : 'bg-[#210366]/6 dark:bg-[#00FFFF]/6 border-b border-[#210366]/15 dark:border-[#00FFFF]/15'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[9px] font-black text-slate-400 tabular-nums">
                        #{rank + 1}
                      </span>
                      <TrustStack layers={ach.trustLayers} size="sm" />
                    </div>
                    <span
                      className={cn(
                        'text-[9px] font-black uppercase tracking-wider',
                        isComplete
                          ? 'text-[#210366] dark:text-[#00FFFF]'
                          : 'text-[#210366] dark:text-[#00FFFF]'
                      )}
                    >
                      {verifiedCount}/6 signals
                    </span>
                  </div>
                  {/* Achievement info */}
                  <div className="px-3 py-2.5">
                    <h4 className="font-black text-sm leading-tight">{ach.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {ach.eventName}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={cn(
                          'text-[10px] font-black px-2 py-0.5 rounded-full',
                          isComplete
                            ? 'bg-[#210366]/12 dark:bg-[#00FFFF]/12 text-[#210366] dark:text-[#00FFFF]'
                            : 'bg-[#210366]/10 dark:bg-[#00FFFF]/10 text-[#210366] dark:text-[#00FFFF]'
                        )}
                      >
                        {ach.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {ach.progress}% complete
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Trust Layer Legend */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 mt-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                Signal Key
              </p>
              <div className="space-y-2">
                {TRUST_LAYER_META.map((layer, i) => {
                  const isOfficial = layer.id === 'official'
                  const isSelf = layer.id === 'self'
                  return (
                    <div key={layer.id} className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'w-2.5 h-2.5 rounded-full flex-shrink-0',
                          isOfficial
                            ? 'bg-[#210366] dark:bg-[#00FFFF] shadow-[0_0_6px_2px_rgba(33,3,102,0.5)] dark:shadow-[0_0_6px_2px_rgba(0,255,255,0.5)]'
                            : isSelf
                              ? 'bg-slate-400 dark:bg-slate-500'
                              : 'bg-[#210366] dark:bg-[#00FFFF]'
                        )}
                      />
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                        L{i + 1} — {layer.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Export CTA */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            onClick={exportVerifiedCV}
            className="w-full gap-2 rounded-xl bg-[#210366] dark:bg-[#00FFFF] hover:bg-[#210366]/90 dark:hover:bg-[#00FFFF]/90 text-white dark:text-[#0F172A] text-sm font-bold shadow-[0_0_12px_rgba(33,3,102,0.3)] dark:shadow-[0_0_12px_rgba(0,255,255,0.3)]"
          >
            <Download size={14} />
            Export Verified CV · PDF
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Post Composer ────────────────────────────────────────────────────────────

type PostComposerMode = 'activity' | 'past'
type ActivityType = 'run' | 'ride' | 'swim' | 'other'

/** Format seconds → HH:MM:SS (or MM:SS when under 1 hour) */
function fmtMovingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtPaceMinPerKm(seconds: number, distKm: number): string {
  if (distKm === 0) return '—'
  const paceSeconds = seconds / distKm
  const pm = Math.floor(paceSeconds / 60)
  const ps = Math.round(paceSeconds % 60)
  return `${pm}:${String(ps).padStart(2, '0')}`
}

type PostComposerProps = { deviceActivities?: StravaActivity[]; deviceConnected?: boolean }

function PostComposer({ deviceActivities = [], deviceConnected = false }: PostComposerProps) {
  const [mode, setMode] = useState<PostComposerMode>('activity')
  const [activityType, setActivityType] = useState<ActivityType>('run')
  const [isPublic, setIsPublic] = useState(true)
  const [linkedAchievement, setLinkedAchievement] = useState<Achievement | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [eventSearch, setEventSearch] = useState('')
  const [rsuRaces, setRsuRaces] = useState<RsuRaceEntry[]>([])
  const [selectedRsuRace, setSelectedRsuRace] = useState<RsuRaceEntry | null>(null)
  const [bibInput, setBibInput] = useState('')
  const [isFetchingResult, setIsFetchingResult] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [verifiedResult, setVerifiedResult] = useState<RaceResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [selectedStravaActivity, setSelectedStravaActivity] = useState<StravaActivity | null>(null)
  const [showStravaList, setShowStravaList] = useState(false)

  // Debounced race search — tries live RunSignUp API, falls back to mock data
  useEffect(() => {
    if (selectedRsuRace || verifiedResult || eventSearch.length < 2) {
      setRsuRaces([])
      setShowNudge(false)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const races = await rsuSearchRaces(eventSearch)
        setRsuRaces(races)
        if (races.length === 0) {
          // Fallback: filter mock data so demo always works
          const q = eventSearch.toLowerCase()
          const mocks = MOCK_RACE_RESULTS.filter(
            r =>
              r.eventName.toLowerCase().includes(q) ||
              r.city.toLowerCase().includes(q) ||
              String(r.year).includes(q)
          )
          setRsuRaces(
            mocks.map(m => ({
              race: {
                race_id: m.runsignupRaceId ?? 0,
                name: `${m.eventName} ${m.year}`,
                address: { city: m.city },
                url: '',
              },
            }))
          )
          setShowNudge(mocks.length === 0)
        } else {
          setShowNudge(false)
        }
      } catch {
        // API unreachable (CORS in prod without proxy) — use mock fallback
        const q = eventSearch.toLowerCase()
        const mocks = MOCK_RACE_RESULTS.filter(
          r =>
            r.eventName.toLowerCase().includes(q) ||
            r.city.toLowerCase().includes(q) ||
            String(r.year).includes(q)
        )
        setRsuRaces(
          mocks.map(m => ({
            race: {
              race_id: m.runsignupRaceId ?? 0,
              name: `${m.eventName} ${m.year}`,
              address: { city: m.city },
              url: '',
            },
          }))
        )
        setShowNudge(mocks.length === 0)
      } finally {
        setIsSearching(false)
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [eventSearch, selectedRsuRace, verifiedResult])

  async function handleVerifyBib() {
    if (!selectedRsuRace || !bibInput.trim()) return
    setIsFetchingResult(true)
    setLookupError(null)
    try {
      const entry = await rsuLookupResult(selectedRsuRace.race.race_id, bibInput.trim())
      if (entry && (entry.finish_time ?? entry.clock_time)) {
        const addr = selectedRsuRace.race.address
        const city = [addr?.city, addr?.state].filter(Boolean).join(', ') || 'Unknown'
        setVerifiedResult({
          id: `rsu-${selectedRsuRace.race.race_id}`,
          eventName: selectedRsuRace.race.name,
          year: new Date().getFullYear(),
          distance: '42.2 km',
          city,
          certBody: 'RunSignUp · Official Results',
          bib: entry.bib_num ?? bibInput,
          time: entry.finish_time ?? entry.clock_time ?? '—',
          rank: entry.place ? `${entry.place}` : '—',
          pace: '—',
          category: entry.gender
            ? `${entry.gender}${entry.age ? ' · Age ' + entry.age : ''}`
            : undefined,
          runsignupRaceId: selectedRsuRace.race.race_id,
          verifiedVia: 'runsignup',
        })
      } else {
        // No live result — inject mock if BIB matches a mock entry
        const mockMatch = MOCK_RACE_RESULTS.find(
          m => m.bib.toLowerCase() === bibInput.trim().toLowerCase()
        )
        if (mockMatch) {
          setVerifiedResult({ ...mockMatch, verifiedVia: 'mock' })
        } else {
          setLookupError(
            `No result found for BIB ${bibInput}. Upload a photo of your medal to reach Layer 2.`
          )
        }
      }
    } catch {
      setLookupError('Could not reach RunSignUp. Check your connection or enter result manually.')
    } finally {
      setIsFetchingResult(false)
    }
  }

  const fieldCls =
    'rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 cursor-text hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-colors'

  function DataField({
    label,
    unit,
    placeholder,
    value: valueProp,
  }: {
    label: string
    unit?: string
    placeholder?: string
    value?: string
  }) {
    const [localValue, setLocalValue] = useState(valueProp ?? '')
    useEffect(() => {
      setLocalValue(valueProp ?? '')
    }, [valueProp])
    return (
      <div className={fieldCls}>
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <input
            type="text"
            value={localValue}
            onChange={e => setLocalValue(e.target.value)}
            placeholder={placeholder ?? '—'}
            className="text-base font-black text-black dark:text-white bg-transparent outline-none w-full placeholder-slate-300 dark:placeholder-slate-600"
          />
          {unit && <span className="text-[10px] text-slate-400 flex-shrink-0">{unit}</span>}
        </div>
      </div>
    )
  }

  const VisibilityToggle = (
    <button
      type="button"
      onClick={() => setIsPublic(v => !v)}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors',
        isPublic
          ? 'text-[#210366] dark:text-[#00FFFF] border-[#210366]/30 dark:border-[#00FFFF]/30 bg-[#210366]/5 dark:bg-[#00FFFF]/5'
          : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
      )}
    >
      {isPublic ? <Globe size={12} /> : <Shield size={12} />}
      {isPublic ? 'Public' : 'Private'}
    </button>
  )

  const evidenceRow = (
    <div className="flex items-center justify-between pt-1">
      <div className="flex gap-1.5 flex-wrap">
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-colors"
        >
          <Camera size={12} /> Photo
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-colors"
        >
          <Zap size={12} /> Device
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-colors"
        >
          <Users size={12} /> Tag
        </button>
        {VisibilityToggle}
      </div>
      <button
        type="button"
        className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-[12px] font-black bg-[#210366] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] hover:bg-[#6d4cc2] dark:hover:bg-[#00FFFF]/90 transition-colors"
      >
        Post <ChevronRight size={12} />
      </button>
    </div>
  )

  const achievementLink = (
    <div className="relative">
      {linkedAchievement ? (
        <div className="w-full flex items-center gap-2 rounded-lg border border-[#210366]/40 dark:border-[#00FFFF]/30 px-3 py-2.5 bg-[#210366]/5 dark:bg-[#00FFFF]/5">
          {linkedAchievement.thumbnail && (
            <div
              className="w-6 h-6 rounded-md flex-shrink-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${linkedAchievement.thumbnail}')` }}
            />
          )}
          <Trophy size={12} className="text-[#210366] dark:text-[#00FFFF] flex-shrink-0" />
          <span className="text-[11px] font-bold text-[#210366] dark:text-[#00FFFF] flex-1 truncate">
            {linkedAchievement.title}
          </span>
          <button
            type="button"
            onClick={() => setLinkedAchievement(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
            aria-label="Remove linked achievement"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(p => !p)}
          className="w-full flex items-center gap-2 rounded-lg border border-dashed border-[#210366]/30 dark:border-[#00FFFF]/20 px-3 py-2.5 hover:border-[#210366]/60 dark:hover:border-[#00FFFF]/40 transition-colors group"
        >
          <Trophy size={12} className="text-[#210366] dark:text-[#00FFFF] flex-shrink-0" />
          <span className="text-[11px] text-slate-400 flex-1 text-left">Link to achievement</span>
          <ChevronDown
            size={12}
            className={cn('text-slate-400 transition-transform', showPicker && 'rotate-180')}
          />
        </button>
      )}
      {showPicker && !linkedAchievement && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xl overflow-hidden">
          <p className="px-3 pt-2.5 pb-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
            Select achievement
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-52 overflow-y-auto">
            {ACHIEVEMENTS.map(ach => (
              <button
                key={ach.id}
                type="button"
                onClick={() => {
                  setLinkedAchievement(ach)
                  setShowPicker(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                {ach.thumbnail && (
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${ach.thumbnail}')` }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-black dark:text-white truncate">
                    {ach.title}
                  </p>
                  <p className="text-[9px] text-slate-400 truncate">{ach.eventName}</p>
                </div>
                <span
                  className={cn(
                    'flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full',
                    ach.status === 'Completed'
                      ? 'bg-[#E1F5EE] text-[#0F6E56] dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-[#FAEEDA] text-[#854F0B] dark:bg-amber-900/30 dark:text-amber-400'
                  )}
                >
                  {ach.status === 'Completed' ? 'Awarded' : ach.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  function ActivityForm() {
    const sa = selectedStravaActivity
    const distKm = sa ? (sa.distance / 1000).toFixed(1) : undefined
    const duration = sa ? fmtMovingTime(sa.moving_time) : undefined
    const elevation = sa ? Math.round(sa.total_elevation_gain).toString() : undefined
    const dateStr = sa ? new Date(sa.start_date).toLocaleDateString() : undefined
    const pace =
      sa && sa.distance > 0 ? fmtPaceMinPerKm(sa.moving_time, sa.distance / 1000) : undefined
    const speedKmh =
      sa && sa.moving_time > 0
        ? (sa.distance / 1000 / (sa.moving_time / 3600)).toFixed(1)
        : undefined
    const distM = sa ? Math.round(sa.distance).toString() : undefined

    if (activityType === 'run') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <DataField label="Distance" unit="km" value={distKm} />
            <DataField label="Duration" unit="h:m" value={duration} />
            <DataField label="Elevation" unit="m" value={elevation} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DataField label="Date" placeholder="Today" value={dateStr} />
            <DataField label="Avg Pace" unit="min/km" value={pace} />
          </div>
          {achievementLink}
          {evidenceRow}
        </div>
      )
    }
    if (activityType === 'ride') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <DataField label="Distance" unit="km" value={distKm} />
            <DataField label="Duration" unit="h:m" value={duration} />
            <DataField label="Avg Speed" unit="km/h" value={speedKmh} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DataField label="Date" placeholder="Today" value={dateStr} />
            <DataField label="Elevation" unit="m" value={elevation} />
          </div>
          {achievementLink}
          {evidenceRow}
        </div>
      )
    }
    if (activityType === 'swim') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <DataField label="Distance" unit="m" value={distM} />
            <DataField label="Duration" unit="h:m" value={duration} />
            <DataField label="Date" placeholder="Today" value={dateStr} />
          </div>
          {/* Pool vs Open Water toggle */}
          <div className="flex gap-1.5">
            {['Pool', 'Open Water'].map(env => (
              <button
                key={env}
                type="button"
                className="px-3 py-1.5 rounded-lg text-[11px] font-black border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-colors first:bg-[#210366] first:dark:bg-[#00FFFF] first:text-white first:dark:text-[#0F172A] first:border-transparent"
              >
                {env}
              </button>
            ))}
          </div>
          {achievementLink}
          {evidenceRow}
        </div>
      )
    }
    // Other — plain social post
    return (
      <div className="space-y-3">
        <textarea
          placeholder="What's on your mind?"
          className={cn(
            fieldCls,
            'min-h-[72px] w-full resize-none text-sm text-black dark:text-white bg-transparent outline-none placeholder-slate-400'
          )}
        />
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-colors"
            >
              <Camera size={12} /> Photo
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-colors"
            >
              <Users size={12} /> Tag
            </button>
            {VisibilityToggle}
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-[12px] font-black bg-[#210366] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] hover:bg-[#6d4cc2] dark:hover:bg-[#00FFFF]/90 transition-colors"
          >
            Post <ChevronRight size={12} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
      {/* Mode tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-700/60">
        {(['activity', 'past'] as PostComposerMode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'flex-1 py-3 text-[11px] font-black uppercase tracking-wider transition-colors',
              mode === m
                ? 'text-[#210366] dark:text-[#00FFFF] border-b-2 border-[#210366] dark:border-[#00FFFF] -mb-px'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            )}
          >
            {m === 'activity' ? 'Log Activity' : 'Log Past'}
          </button>
        ))}
      </div>

      {mode === 'activity' ? (
        <div className="p-4 space-y-3">
          {/* ── Verified Device Picker (Fitbit) ── */}
          {deviceConnected && deviceActivities.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStravaList(s => !s)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold border transition-colors',
                  selectedStravaActivity
                    ? 'border-[#F59E0B]/50 bg-[#F59E0B]/5 text-[#F59E0B]'
                    : 'border-dashed border-[#210366]/40 dark:border-[#00FFFF]/30 text-slate-500 dark:text-slate-400 hover:border-[#210366]/60 dark:hover:border-[#00FFFF]/50'
                )}
              >
                {/* Fitbit heart icon */}
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
                <span className="flex-1 text-left truncate">
                  {selectedStravaActivity ? selectedStravaActivity.name : 'Import Fitbit Activity'}
                </span>
                {selectedStravaActivity ? (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      setSelectedStravaActivity(null)
                      setShowStravaList(false)
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
                    aria-label="Clear activity"
                  >
                    <X size={12} />
                  </button>
                ) : (
                  <ChevronDown
                    size={12}
                    className={cn(
                      'text-slate-400 transition-transform flex-shrink-0',
                      showStravaList && 'rotate-180'
                    )}
                  />
                )}
              </button>
              {showStravaList && !selectedStravaActivity && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xl overflow-hidden">
                  <p className="px-3 pt-2.5 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Verified Device Activities · Fitbit
                  </p>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-52 overflow-y-auto">
                    {deviceActivities.slice(0, 8).map(act => {
                      const distKm = (act.distance / 1000).toFixed(1)
                      const mins = Math.floor(act.moving_time / 60)
                      const sport = act.sport_type ?? act.type ?? ''
                      const sportLower = sport.toLowerCase()
                      // Device source icon — inferred from activity name prefix set by normalizeTerraActivity
                      const sourceIcon = act.name.toLowerCase().includes('apple')
                        ? '🍎'
                        : act.name.toLowerCase().includes('garmin')
                          ? '⌚'
                          : act.name.toLowerCase().includes('polar')
                            ? '❄️'
                            : sportLower.includes('ride')
                              ? '🚴'
                              : sportLower.includes('swim')
                                ? '🏊'
                                : '🏃'
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => {
                            setActivityType(fitbitToActivityType(sport))
                            setSelectedStravaActivity(act)
                            setShowStravaList(false)
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#210366]/8 dark:bg-[#00FFFF]/8 flex items-center justify-center flex-shrink-0 text-sm">
                            {sourceIcon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-black dark:text-white truncate">
                              {act.name}
                            </p>
                            <p className="text-[9px] text-slate-400">
                              {distKm} km · {mins} min ·{' '}
                              {new Date(act.start_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            Layer 3
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Activity type selector */}
          <div className="flex gap-1.5 flex-wrap">
            {(['run', 'ride', 'swim', 'other'] as ActivityType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setActivityType(type)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide border transition-colors',
                  activityType === type
                    ? 'bg-[#210366] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] border-transparent'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30'
                )}
              >
                {type}
              </button>
            ))}
          </div>
          {ActivityForm()}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {/* ── Event search via RunSignUp ── */}
          <div className={cn(fieldCls, 'flex items-center gap-2')}>
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                {selectedRsuRace ? 'Race Selected' : 'Search Race / Event via RunSignUp'}
              </p>
              {selectedRsuRace ? (
                <p className="text-sm font-black text-black dark:text-white truncate">
                  {selectedRsuRace.race.name}
                </p>
              ) : (
                <input
                  type="text"
                  value={eventSearch}
                  onChange={e => {
                    setEventSearch(e.target.value)
                    setVerifiedResult(null)
                  }}
                  placeholder='e.g. "TCS London Marathon 2024"'
                  className="text-sm text-black dark:text-white bg-transparent outline-none w-full placeholder-slate-400"
                />
              )}
            </div>
            {isSearching && (
              <span className="text-[10px] text-slate-400 animate-pulse flex-shrink-0">
                Searching…
              </span>
            )}
            {selectedRsuRace && !verifiedResult && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRsuRace(null)
                  setEventSearch('')
                  setBibInput('')
                  setLookupError(null)
                }}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label="Clear race selection"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* ── Live results dropdown ── */}
          {!selectedRsuRace && !verifiedResult && rsuRaces.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#1E293B] shadow-xl overflow-hidden">
              <p className="px-3 pt-2.5 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Races Found · RunSignUp
              </p>
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-44 overflow-y-auto">
                {rsuRaces.map((r, idx) => {
                  const addr = r.race.address
                  const cityLabel = [addr?.city, addr?.state].filter(Boolean).join(', ')
                  return (
                    <button
                      key={r.race.race_id || idx}
                      type="button"
                      onClick={() => {
                        setSelectedRsuRace(r)
                        setRsuRaces([])
                        setEventSearch(r.race.name)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#210366]/10 dark:bg-[#00FFFF]/10 flex items-center justify-center flex-shrink-0">
                        <Medal size={14} className="text-[#210366] dark:text-[#00FFFF]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-black text-black dark:text-white truncate">
                          {r.race.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {cityLabel || 'Unknown location'}
                          {r.race.next_date ? ` · ${r.race.next_date}` : ''}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#210366]/10 dark:bg-[#00FFFF]/10 text-[#210366] dark:text-[#00FFFF]">
                        Official
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Trust Layer Nudge ── */}
          {(showNudge || lookupError) && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-3.5">
              <p className="text-[11px] font-black text-amber-800 dark:text-amber-400 mb-1">
                {lookupError ? 'BIB not found' : 'No official result found'}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed">
                {lookupError ??
                  "We couldn't find an official result. Upload a photo of your medal to reach "}
                {!lookupError && (
                  <span className="font-black text-[#210366] dark:text-[#00FFFF]">Layer 2</span>
                )}
                {lookupError && (
                  <>
                    {' '}
                    Upload a photo of your medal to reach{' '}
                    <span className="font-black text-[#210366] dark:text-[#00FFFF]">Layer 2</span>.
                  </>
                )}
              </p>
              <button
                type="button"
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
              >
                <Camera size={12} /> Upload Medal Photo
              </button>
            </div>
          )}

          {/* ── BIB lookup step (race picked, not yet verified) ── */}
          {selectedRsuRace && !verifiedResult && !lookupError && (
            <div className="space-y-2">
              <div className={cn(fieldCls)}>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Your BIB Number
                </p>
                <input
                  type="text"
                  value={bibInput}
                  onChange={e => setBibInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleVerifyBib()}
                  placeholder="e.g. A-41872"
                  className="text-sm font-black text-black dark:text-white bg-transparent outline-none w-full placeholder-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleVerifyBib()}
                disabled={!bibInput.trim() || isFetchingResult}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-black transition-colors',
                  isFetchingResult || !bibInput.trim()
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-wait'
                    : 'bg-[#210366] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] hover:bg-[#6d4cc2] dark:hover:bg-[#00FFFF]/90'
                )}
              >
                {isFetchingResult ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Verifying via RunSignUp…
                  </>
                ) : (
                  <>
                    <BadgeCheck size={14} /> Verify via RunSignUp · Layer 6
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Verified & locked result — Trophy evolution ── */}
          {verifiedResult ? (
            <div className="space-y-3">
              {/* Gold trophy evolution header — 22pt min per spec */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#210366]/8 dark:bg-[#00FFFF]/8 border border-[#210366]/25 dark:border-[#00FFFF]/20">
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="flex-shrink-0 text-[#210366] dark:text-[#00FFFF]"
                >
                  <Trophy
                    size={32}
                    strokeWidth={2}
                    style={{ fill: 'currentColor', opacity: 0.3 }}
                  />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-[22px] leading-tight font-black text-black dark:text-white">
                    {verifiedResult.eventName}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {verifiedResult.city} · {verifiedResult.distance}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#210366] dark:bg-[#00FFFF] text-white dark:text-[#0F172A]">
                    Layer 6 · Certified
                  </span>
                  {verifiedResult.verifiedVia === 'runsignup' && (
                    <a
                      href="https://runsignup.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[8px] font-black text-[#210366] dark:text-[#00FFFF] hover:underline"
                    >
                      <Link2 size={8} /> Verified by RunSignUp
                    </a>
                  )}
                </div>
              </div>

              {/* Locked metric fields */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Finish Time', value: verifiedResult.time },
                  { label: 'BIB', value: verifiedResult.bib },
                  { label: 'Rank', value: verifiedResult.rank },
                ].map(f => (
                  <div key={f.label} className={cn(fieldCls, 'bg-slate-50 dark:bg-slate-800/40')}>
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        {f.label}
                      </p>
                      <Shield size={8} className="text-[#210366] dark:text-[#00FFFF]" />
                    </div>
                    <p className="text-base font-black text-black dark:text-white">{f.value}</p>
                    <p className="text-[8px] text-[#210366] dark:text-[#00FFFF] font-bold mt-0.5">
                      Verified · Read-only
                    </p>
                  </div>
                ))}
              </div>

              {verifiedResult.pace !== '—' && (
                <div className={cn(fieldCls, 'bg-slate-50 dark:bg-slate-800/40')}>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Avg Pace
                    </p>
                    <Shield size={8} className="text-[#210366] dark:text-[#00FFFF]" />
                  </div>
                  <p className="text-base font-black text-black dark:text-white">
                    {verifiedResult.pace}
                  </p>
                  <p className="text-[8px] text-[#210366] dark:text-[#00FFFF] font-bold mt-0.5">
                    Verified · Read-only
                  </p>
                </div>
              )}

              {verifiedResult.category && (
                <div className={fieldCls}>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Category
                  </p>
                  <input
                    type="text"
                    defaultValue={verifiedResult.category}
                    className="text-sm font-black text-black dark:text-white bg-transparent outline-none w-full"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-colors"
                  >
                    <Camera size={12} /> Photo
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-colors"
                  >
                    <FileText size={12} /> Certificate
                  </button>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-[12px] font-black bg-[#210366] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] hover:bg-[#6d4cc2] dark:hover:bg-[#00FFFF]/90 transition-colors"
                >
                  Add to Achievements <ChevronRight size={12} />
                </button>
              </div>
            </div>
          ) : (
            /* ── Manual fallback when nothing typed yet ── */
            !showNudge &&
            !selectedRsuRace &&
            !lookupError &&
            eventSearch.length < 2 && (
              <div className="space-y-3">
                <div className={fieldCls}>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Achievement
                  </p>
                  <input
                    type="text"
                    placeholder='e.g. "Dubai Marathon 2022"'
                    className="text-sm text-black dark:text-white bg-transparent outline-none w-full placeholder-slate-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={fieldCls}>
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Date completed
                    </p>
                    <input
                      type="date"
                      className="text-sm font-black text-black dark:text-white bg-transparent outline-none w-full [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                  <div className={fieldCls}>
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Result
                    </p>
                    <input
                      type="text"
                      placeholder="e.g. 3:44:02"
                      className="text-sm font-black text-black dark:text-white bg-transparent outline-none w-full placeholder-slate-400"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-colors"
                    >
                      <FileText size={12} /> Certificate
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-colors"
                    >
                      <Camera size={12} /> Photo
                    </button>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-[12px] font-black bg-[#210366] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] hover:bg-[#6d4cc2] dark:hover:bg-[#00FFFF]/90 transition-colors"
                  >
                    Add to Achievements <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export function App() {
  const [isDark, setIsDark] = useState(false)
  const [profileTab, setProfileTab] = useState<ProfileTab>('activities')
  const [isFollowing, setIsFollowing] = useState(false)
  const [aiQuery, setAiQuery] = useState<AIQuery | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [viewingHighlight, setViewingHighlight] = useState<(typeof HIGHLIGHT_ITEMS)[0] | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null)
  const [showSnapshot, setShowSnapshot] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  // ── Fitbit device state ──────────────────────────────────────────────────────
  const [deviceConnected, setDeviceConnected] = useState(false)
  const [deviceActivities, setDeviceActivities] = useState<StravaActivity[]>([])
  const [deviceStats, setDeviceStats] = useState<StravaCumulativeStats | null>(null)
  const [fitbitToday, setFitbitToday] = useState<FitbitDailySummary | null>(null)
  const [deviceSyncing, setDeviceSyncing] = useState(false)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  function applyDeviceActivities(activities: StravaActivity[]) {
    setDeviceActivities(activities)
    setDeviceStats(activities.length > 0 ? computeStravaStats(activities) : null)
    setDeviceConnected(true)
  }

  async function syncFitbitData(accessToken: string) {
    const [activities, today] = await Promise.all([
      fetchFitbitActivities(accessToken),
      fetchFitbitDailySummary(accessToken),
    ])
    applyDeviceActivities(activities)
    if (today) setFitbitToday(today)
  }

  // Handle Fitbit OAuth callback (?code=...&state=fitbit)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (!code || state !== 'fitbit') return

    setDeviceSyncing(true)
    exchangeFitbitToken(code)
      .then(tokens => {
        if (!tokens) throw new Error('Token exchange failed')
        sessionStorage.setItem('fitbit_access_token', tokens.access_token)
        return syncFitbitData(tokens.access_token)
      })
      .catch(() => {
        setDeviceError('Fitbit connection failed. Please try connecting again.')
      })
      .finally(() => {
        setDeviceSyncing(false)
        window.history.replaceState({}, '', window.location.pathname)
      })
  }, [])

  const handleDeviceSync = () => {
    const savedToken = sessionStorage.getItem('fitbit_access_token')
    setDeviceSyncing(true)
    setDeviceError(null)
    if (savedToken) {
      syncFitbitData(savedToken)
        .catch(() => {
          setDeviceError('Fitbit sync failed. Please try again.')
        })
        .finally(() => setDeviceSyncing(false))
    } else {
      if (FITBIT_CLIENT_ID) {
        setDeviceSyncing(false)
        connectFitbit()
      } else {
        setDeviceError('Fitbit is not configured. Set VITE_FITBIT_CLIENT_ID in your .env file.')
        setDeviceSyncing(false)
      }
    }
  }

  const profileUrl = typeof window !== 'undefined' ? window.location.href : ''
  const { cardRef: highlightCardRef } = useHighlightShare()
  const waterfallRef = useRef<HTMLDivElement>(null)
  const journeyModalRef = useRef<HTMLDivElement>(null)
  const copyProfileLink = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(profileUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }, [profileUrl])

  const reputationScore =
    ACHIEVEMENTS.length === 0
      ? 0
      : Math.round(
          (ACHIEVEMENTS.reduce(
            (sum, a) => sum + (a.trustLayers ?? []).filter(l => l.verified).length,
            0
          ) /
            (ACHIEVEMENTS.length * 6)) *
            100
        )

  const [achievementIndex, setAchievementIndex] = useState(0)
  const currentAchievement = ACHIEVEMENTS[achievementIndex] ?? ACHIEVEMENTS[0]

  const goAchievement = (dir: 'prev' | 'next') => {
    if (ACHIEVEMENTS.length === 0) return
    setAchievementIndex(i => {
      if (dir === 'next') return i >= ACHIEVEMENTS.length - 1 ? 0 : i + 1
      return i <= 0 ? ACHIEVEMENTS.length - 1 : i - 1
    })
  }

  const totalTrainingSessions =
    deviceActivities.length + ACHIEVEMENTS.reduce((s, a) => s + a.activityCount, 0)
  const totalDistanceKm = deviceStats?.totalDistanceKm ?? 0
  const totalTrainingHours = deviceStats?.totalHours ?? 0

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const handleAIQuery = (q: AIQuery) => {
    if (aiQuery === q && aiResponse && !aiThinking) return
    setAiQuery(q)
    setAiThinking(true)
    setAiResponse(null)
    setTimeout(() => {
      setAiThinking(false)
      setAiResponse(AI_RESPONSES[q])
    }, 1700)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] text-black dark:text-white transition-colors duration-300">
      {/* ── DESKTOP: Slim nav sidebar (sticky left rail) ──────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-20 flex-col items-center py-4 border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-sm">
        <button
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-4"
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <span className="font-black text-sm tracking-tight text-center px-1 mb-6">Flinki</span>
        <nav className="flex flex-col gap-1 flex-1">
          <motion.button
            className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-[#210366] dark:text-[#00FFFF] bg-[#210366]/10 dark:bg-[#00FFFF]/10 font-bold text-[10px]"
            whileTap={{ scale: 0.93 }}
            aria-label="Home"
          >
            <Home size={22} />
            <span>Home</span>
          </motion.button>
          <motion.button
            className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-[10px] transition-colors"
            whileTap={{ scale: 0.93 }}
            aria-label="Analytics"
          >
            <BarChart2 size={22} />
            <span>Stats</span>
          </motion.button>
          <motion.button
            className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-[10px] transition-colors"
            whileTap={{ scale: 0.93 }}
            aria-label="Messages"
          >
            <MessageCircle size={22} />
            <span>Chat</span>
          </motion.button>
        </nav>
        <div className="flex flex-col gap-1 pt-4 border-t border-slate-200 dark:border-slate-800">
          <motion.button
            onClick={() => setIsDark(d => !d)}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            whileTap={{ scale: 0.9 }}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
          <button
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </aside>

      {/* ── TOP HEADER (mobile only; desktop nav is in sidebar) ────────────────── */}
      <header className="glass-nav fixed top-0 left-0 right-0 z-50 lg:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <span className="font-black text-lg tracking-tight">Flinki</span>
          </div>
          <div className="flex items-center gap-1">
            <motion.button
              onClick={() => setIsDark(d => !d)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              whileTap={{ scale: 0.9 }}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </motion.button>
            <button
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="More"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN: full-bleed hero + 12-col grid (lg: offset by nav rail) ─────── */}
      <div className={cn('overflow-x-hidden pb-28 lg:pb-10', 'lg:pl-20')}>
        {/* ── LONG HEADER (Facebook style): w-full, absolute banner + avatar, action row ─── */}
        <div className="pt-14 lg:pt-4 relative">
          <div
            className="w-full h-48 lg:h-[280px] bg-cover bg-center"
            style={{ backgroundImage: `url('${BANNER}')` }}
          />
          <div className="max-w-[1440px] mx-auto px-4 lg:px-8 relative -mt-10 lg:-mt-12 z-10 pb-5 border-b border-slate-200 dark:border-slate-800">
            {/*
              Mobile layout:  [Avatar]  [Follow] [Share]   ← same row, buttons right-aligned
                              [Alex Rivera ...]             ← full-width row below
              Desktop layout: [Avatar] [Name/badges …]     [Follow] [Share]
            */}
            <div className="flex flex-wrap items-start gap-x-3 gap-y-2 lg:flex-nowrap lg:items-end lg:gap-6">
              {/* Avatar — order 1 on mobile & desktop */}
              <div className="relative flex-shrink-0 order-1">
                <div
                  className="w-28 h-28 lg:w-36 lg:h-36 rounded-full border-4 overflow-hidden bg-slate-200 shadow-xl"
                  style={{ borderColor: isDark ? '#0F172A' : 'white' }}
                >
                  <img src={AVATAR} alt="Alex Rivera" className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-1 right-1 bg-[#210366] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] rounded-full p-1.5 border-2 shadow border-white dark:border-[#0F172A]">
                  <BadgeCheck size={14} />
                </div>
              </div>

              {/* Action buttons — order 2 on mobile (right of avatar, bottom-aligned), last on desktop */}
              <div className="order-2 lg:order-3 ml-auto lg:ml-0 flex items-center gap-2 flex-wrap self-end lg:pb-1 flex-shrink-0">
                <motion.button
                  onClick={() => setIsFollowing(f => !f)}
                  className={cn(
                    'px-5 py-2 rounded-full font-bold text-sm shadow-lg transition-all',
                    isFollowing
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-none'
                      : 'bg-[#210366] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] shadow-[#210366]/30 dark:shadow-[#00FFFF]/30'
                  )}
                  whileTap={{ scale: 0.94 }}
                >
                  {isFollowing ? 'Following ✓' : 'Follow'}
                </motion.button>
                <button
                  type="button"
                  onClick={() => setShowShareMenu(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Share2 size={13} />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>

              {/* Name / title / badges — wraps to its own full-width row on mobile, sits beside avatar on desktop */}
              <div className="w-full order-3 lg:order-2 lg:w-auto lg:flex-1 lg:min-w-0 pb-1">
                <h1 className="text-2xl lg:text-4xl font-black tracking-tight leading-tight">
                  Alex Rivera
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm mt-0.5">
                  Elite Triathlete · CS Student
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <BadgeCheck size={12} className="text-[#210366] dark:text-[#00FFFF]" />
                  <span className="text-[11px] font-black text-[#210366] dark:text-[#00FFFF]">
                    {ACHIEVEMENTS.filter(a => a.status === 'Completed').length} Race Records
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 text-[11px]">·</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#210366]/30 dark:border-[#00FFFF]/30 bg-[#210366]/8 dark:bg-[#00FFFF]/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#210366] dark:bg-[#00FFFF] shadow-[0_0_4px_rgba(33,3,102,0.5)] dark:shadow-[0_0_4px_rgba(0,255,255,0.5)]" />
                    <span className="text-[11px] font-black tabular-nums text-[#210366] dark:text-[#00FFFF]">
                      {reputationScore}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Rep</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Bio — below identity row */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3 max-w-2xl">
                Elite Endurance Athlete and CS Student. Optimizing VO2 Max for the 2026 Ironman
                while building scalable web architectures.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {SKILLS.slice(0, 8).map(skill => (
                  <span
                    key={skill}
                    className="bg-[#210366]/10 dark:bg-[#00FFFF]/10 text-[#210366] dark:text-[#00FFFF] px-2 py-0.5 rounded-md text-[10px] font-bold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">📍 Sausalito, CA</span>
                <span className="flex items-center gap-1.5">🎓 UC Berkeley</span>
                <span className="flex items-center gap-1.5">🏆 24 Achievements</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── PROFILE TAB NAV ──────────────────────────────────────────────────── */}
        <div className="sticky top-14 lg:top-0 z-30 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
            <div className="flex overflow-x-auto hide-scrollbar">
              {(
                [
                  ['Activities', 'activities'],
                  ['Gear', 'gear'],
                  ['Photos', 'photos'],
                  ['Achievements', 'achievements'],
                ] as [string, ProfileTab][]
              ).map(([label, key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProfileTab(key)}
                  className={cn(
                    'flex-shrink-0 px-4 py-3 text-[12px] font-black uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap',
                    profileTab === key
                      ? 'border-[#210366] dark:border-[#00FFFF] text-[#210366] dark:text-[#00FFFF]'
                      : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-black dark:hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── ACHIEVEMENTS: Single-item carousel → Global Verified Passport ─────── */}
        {profileTab !== 'achievements' && (
          <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
            {/* Section header — Global Verified Passport */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div className="min-w-0">
                <h2 className="text-[1.125rem] font-black uppercase tracking-wider text-black dark:text-white">
                  Achievement Ledger
                </h2>
                <p className="text-[13px] text-black/70 dark:text-white/70 font-medium mt-0.5">
                  Global Verified Passport ·{' '}
                  {ACHIEVEMENTS.filter(a => a.status === 'Completed').length} awarded ·{' '}
                  {ACHIEVEMENTS.filter(a => a.status === 'In Progress').length} in progress
                  <span className="hidden sm:inline"> · Tap card to expand</span>
                </p>
                {/* Stats — wrapping chips so they never overflow on small screens */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5" aria-live="polite">
                  {[
                    `${totalTrainingSessions} sessions`,
                    `${totalDistanceKm.toLocaleString()} km`,
                    `${totalTrainingHours} hrs`,
                  ].map(stat => (
                    <span
                      key={stat}
                      className="text-[11px] font-bold text-[#210366] dark:text-[#00FFFF] tabular-nums"
                    >
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setProfileTab('achievements')}
                  className="text-[11px] font-black text-[#5B32B0] dark:text-[#00FFFF] hover:underline"
                >
                  See All
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowSnapshot(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#5B32B0] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] text-[11px] font-black shadow hover:bg-[#6d4cc2] dark:hover:bg-[#00FFFF]/90 transition-colors"
                >
                  <Download size={11} />
                  <span className="hidden sm:inline">Portfolio CV</span>
                  <span className="sm:hidden">CV</span>
                </motion.button>
              </div>
            </div>

            {/* Ledger: paddles locked outside card column via CSS grid — never shift when waterfall opens */}
            <div role="region" aria-label="Achievement spotlight">
              {ACHIEVEMENTS.length === 0 ? (
                /* ── Clean Slate: no achievements yet ── */
                <div className="rounded-2xl border border-dashed border-[#210366]/20 dark:border-[#00FFFF]/20 bg-[#210366]/3 dark:bg-[#00FFFF]/3 px-6 py-14 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#210366]/8 dark:bg-[#00FFFF]/10 flex items-center justify-center">
                    <Shield
                      size={28}
                      className="text-[#210366] dark:text-[#00FFFF]"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <p className="font-black text-[17px] text-black dark:text-white">
                      Your Verified Passport is empty.
                    </p>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
                      Connect a{' '}
                      <span className="font-black text-[#210366] dark:text-[#00FFFF]">
                        Root of Trust
                      </span>{' '}
                      to begin — verify a race via RunSignUp, or log a new goal below.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      { icon: '🏅', label: 'Log Past Race', sub: 'RunSignUp · Layer 6' },
                      { icon: '🎯', label: 'Set a New Goal', sub: 'Feature · Layer 1' },
                      { icon: '⌚', label: 'Connect Fitbit', sub: 'Fitbit · Layer 3' },
                    ].map(item => (
                      <div
                        key={item.label}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-sm"
                      >
                        <span className="text-base">{item.icon}</span>
                        <div className="text-left">
                          <p className="text-[11px] font-black text-black dark:text-white">
                            {item.label}
                          </p>
                          <p className="text-[9px] text-slate-400">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-[56px_1fr_56px] lg:grid-cols-[64px_1fr_64px] gap-3 sm:gap-4 lg:gap-6 items-start">
                    {/* Prev paddle — sticky top keeps it fixed to card face during waterfall expansion */}
                    <button
                      type="button"
                      onClick={() => {
                        goAchievement('prev')
                        setSelectedAchievementId(null)
                      }}
                      className={cn(
                        'hidden sm:flex flex-shrink-0 w-14 h-14 lg:w-16 lg:h-16 sticky top-[calc(4rem+72px)] self-start mt-[72px] lg:mt-[68px] rounded-full items-center justify-center',
                        'border-2 transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-95',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8FAFC] dark:focus-visible:ring-offset-[#0F172A]',
                        'bg-white border-[#210366] text-[#210366] hover:bg-[#210366] hover:text-white focus-visible:ring-[#210366]',
                        'dark:bg-[#323C4C] dark:border-[#00FFFF]/60 dark:text-[#00FFFF] dark:hover:bg-[#323C4C] dark:focus-visible:ring-[#00FFFF]',
                        'shadow-[0_4px_20px_rgba(33,3,102,0.25)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                      )}
                      aria-label="Previous achievement"
                    >
                      <ChevronLeft size={28} strokeWidth={2.5} className="lg:w-8 lg:h-8" />
                    </button>

                    {/* Center column: card + waterfall stacked flush, zero gap */}
                    <div className="min-w-0">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentAchievement?.id ?? 'empty'}
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -24 }}
                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        >
                          <AchievementCard
                            achievement={currentAchievement!}
                            selected={selectedAchievementId === currentAchievement?.id}
                            waterfallAttached={selectedAchievementId === currentAchievement?.id}
                            onSelect={() =>
                              setSelectedAchievementId(id =>
                                id === currentAchievement?.id
                                  ? null
                                  : currentAchievement?.id ?? null
                              )
                            }
                          />
                        </motion.div>
                      </AnimatePresence>
                      <AnimatePresence>
                        {selectedAchievementId &&
                          (() => {
                            const ach = ACHIEVEMENTS.find(a => a.id === selectedAchievementId)
                            if (!ach) return null
                            return (
                              <motion.div
                                key={selectedAchievementId}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                className="overflow-hidden"
                              >
                                <AchievementWaterfallPanel
                                  achievement={ach}
                                  attachedToCard
                                  onClose={() => setSelectedAchievementId(null)}
                                  onJourneyClick={() => setSelectedAchievement(ach)}
                                  deviceStats={deviceStats}
                                  deviceError={deviceError}
                                  shareRef={waterfallRef}
                                />
                              </motion.div>
                            )
                          })()}
                      </AnimatePresence>
                    </div>

                    {/* Next paddle */}
                    <button
                      type="button"
                      onClick={() => {
                        goAchievement('next')
                        setSelectedAchievementId(null)
                      }}
                      className={cn(
                        'hidden sm:flex flex-shrink-0 w-14 h-14 lg:w-16 lg:h-16 sticky top-[calc(4rem+72px)] self-start mt-[72px] lg:mt-[68px] rounded-full items-center justify-center',
                        'border-2 transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-95',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8FAFC] dark:focus-visible:ring-offset-[#0F172A]',
                        'bg-white border-[#210366] text-[#210366] hover:bg-[#210366] hover:text-white focus-visible:ring-[#210366]',
                        'dark:bg-[#323C4C] dark:border-[#00FFFF]/60 dark:text-[#00FFFF] dark:hover:bg-[#323C4C] dark:focus-visible:ring-[#00FFFF]',
                        'shadow-[0_4px_20px_rgba(33,3,102,0.25)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                      )}
                      aria-label="Next achievement"
                    >
                      <ChevronRight size={28} strokeWidth={2.5} className="lg:w-8 lg:h-8" />
                    </button>
                  </div>

                  {/* Count + mobile paddles + Share — below waterfall so grid never reflows */}
                  <div className="mt-3 flex items-center justify-center sm:justify-start gap-4">
                    <p
                      className="text-[13px] font-bold text-black/70 dark:text-white/70 tabular-nums"
                      aria-live="polite"
                    >
                      {achievementIndex + 1} / {ACHIEVEMENTS.length}
                    </p>
                    {currentAchievement && (
                      <button
                        type="button"
                        onClick={() => setSelectedAchievement(currentAchievement)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border-2 border-[#210366] text-[#210366] dark:border-[#00FFFF]/60 dark:text-[#00FFFF] hover:bg-[#210366]/10 dark:hover:bg-[#323C4C] transition-colors"
                        aria-label="Share achievement"
                      >
                        <svg
                          width={13}
                          height={13}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                        </svg>
                        Share
                      </button>
                    )}
                    <div className="flex sm:hidden gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          goAchievement('prev')
                          setSelectedAchievementId(null)
                        }}
                        className="p-2 rounded-full border-2 border-[#210366] text-[#210366] dark:border-[#00FFFF]/60 dark:text-[#00FFFF] hover:bg-[#210366]/10 dark:hover:bg-[#323C4C]"
                        aria-label="Previous achievement"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          goAchievement('next')
                          setSelectedAchievementId(null)
                        }}
                        className="p-2 rounded-full border-2 border-[#210366] text-[#210366] dark:border-[#00FFFF]/60 dark:text-[#00FFFF] hover:bg-[#210366]/10 dark:hover:bg-[#323C4C]"
                        aria-label="Next achievement"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </>
              )}{' '}
              {/* end ACHIEVEMENTS.length > 0 conditional */}
            </div>
          </div>
        )}

        {/* ── CONTENT: two-column layout — inner padding matches achievement card column ── */}
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6">
          <div className="sm:px-[72px] lg:px-[88px]">
            <div
              className={cn(
                'grid grid-cols-1 gap-5 items-start',
                profileTab === 'activities' && 'md:grid-cols-[280px_1fr]'
              )}
            >
              {/* ── Sidebar (activities tab only) ── */}
              <aside
                className={cn(
                  'flex-col gap-3.5',
                  profileTab === 'activities' ? 'hidden md:flex' : 'hidden'
                )}
              >
                {/* Level & XP card */}
                <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-[0.5px] border-slate-200 dark:border-slate-700/60 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                    Level & XP
                  </p>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[20px] font-black text-[#210366] dark:text-[#00FFFF]">
                      Lvl 12
                    </span>
                    <span className="text-[12px] text-slate-400 font-medium">Iron Challenger</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>2,840 XP</span>
                    <span>4,200 XP</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1D9E75] dark:bg-[#1D9E75]"
                      style={{ width: `${Math.round((2840 / 4200) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats card */}
                <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-[0.5px] border-slate-200 dark:border-slate-700/60 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                    Stats
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Sessions', value: totalTrainingSessions },
                      { label: 'km total', value: totalDistanceKm.toLocaleString() },
                      { label: 'Hours', value: totalTrainingHours },
                      { label: 'Rep', value: reputationScore },
                    ].map(s => (
                      <div
                        key={s.label}
                        className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center"
                      >
                        <p className="text-[18px] font-bold text-black dark:text-white tabular-nums">
                          {s.value}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Training Streak card */}
                <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-[0.5px] border-slate-200 dark:border-slate-700/60 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                    Training Streak
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Flame size={22} className="text-amber-500" />
                    <span className="text-[22px] font-black text-amber-500 tabular-nums">14</span>
                    <span className="text-[12px] text-slate-400 font-medium">day streak</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {(['M', 'T', 'W', 'T', 'F', 'S', 'S'] as string[]).map((day, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-[4px] flex items-center justify-center text-[10px] font-bold',
                            i < 4
                              ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                              : i === 4
                                ? 'bg-amber-500 text-white border border-amber-500'
                                : 'bg-slate-100 dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 text-slate-400'
                          )}
                        >
                          {i < 5 ? <Check size={12} strokeWidth={3} /> : null}
                        </div>
                        <span className="text-[9px] text-slate-400">{day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Badge Collection card */}
                <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-[0.5px] border-slate-200 dark:border-slate-700/60 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                    Badges
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { Icon: Waves, name: 'Open Water', earned: true },
                        { Icon: Bike, name: 'Century Ride', earned: true },
                        { Icon: Activity, name: 'Marathon', earned: true },
                        { Icon: Trophy, name: '70.3 Finisher', earned: true },
                        { Icon: Zap, name: 'Sprint King', earned: true },
                        { Icon: Mountain, name: 'Trail Blazer', earned: true },
                        { Icon: Medal, name: 'Podium', earned: false },
                        { Icon: Globe, name: 'World Champ', earned: false },
                      ] as { Icon: React.ElementType; name: string; earned: boolean }[]
                    ).map(badge => (
                      <div
                        key={badge.name}
                        title={badge.name}
                        className={cn(
                          'w-11 h-11 rounded-full flex items-center justify-center cursor-default',
                          badge.earned
                            ? 'bg-[#EEEDFE] dark:bg-[#210366]/30 border-[1.5px] border-[#AFA9EC] dark:border-[#210366]'
                            : 'bg-slate-100 dark:bg-slate-700 border-[1.5px] border-dashed border-slate-300 dark:border-slate-600 opacity-50'
                        )}
                      >
                        <badge.Icon
                          size={18}
                          className={
                            badge.earned ? 'text-[#210366] dark:text-[#00FFFF]' : 'text-slate-400'
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

              {/* ── Feed column ── */}
              <div className="min-w-0">
                {/* Activities tab */}
                {profileTab === 'activities' && (
                  <div className="space-y-6">
                    {/* AI Pulse — full width */}
                    <section>
                      <div
                        className={cn(
                          'rounded-2xl p-5 border-2',
                          'bg-white dark:bg-[#1E293B] border-[#210366] dark:border-[#00FFFF]/60',
                          'text-black dark:text-white'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="rounded-full p-1 bg-[#210366]/10 dark:bg-[#00FFFF]/15 border border-[#210366]/30 dark:border-[#00FFFF]/40">
                            <Sparkles size={12} className="text-[#210366] dark:text-[#00FFFF]" />
                          </div>
                          <span className="font-black text-black dark:text-white uppercase tracking-widest text-[10px]">
                            AI Pulse Summary
                          </span>
                        </div>
                        <p className="text-[13px] font-medium leading-relaxed text-black dark:text-white">
                          Alex is a high-endurance triathlete peaking for 2026 Ironman.{' '}
                          <span className="font-black text-[#210366] dark:text-[#00FFFF]">
                            15% pace increase
                          </span>{' '}
                          over 6 months.
                        </p>
                        <div className="flex gap-1.5 mt-3 flex-wrap">
                          {AI_BUTTONS.map(btn => (
                            <motion.button
                              key={btn.key}
                              onClick={() => handleAIQuery(btn.key)}
                              className={cn(
                                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors border',
                                aiQuery === btn.key
                                  ? 'bg-[#210366] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] border-[#210366] dark:border-[#00FFFF]'
                                  : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                              )}
                              whileTap={{ scale: 0.93 }}
                            >
                              <span>{btn.icon}</span>
                              {btn.label}
                            </motion.button>
                          ))}
                        </div>
                        <AnimatePresence>
                          {(aiThinking || aiResponse) && (
                            <motion.div
                              className={cn(
                                'mt-3 rounded-lg p-2.5 overflow-hidden border',
                                'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-600'
                              )}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              {aiThinking ? (
                                <div className="flex items-center gap-2">
                                  <motion.div
                                    className="flex gap-1"
                                    animate={{ opacity: [1, 0.4, 1] }}
                                    transition={{ duration: 1.1, repeat: Infinity }}
                                  >
                                    {[0, 1, 2].map(i => (
                                      <motion.span
                                        key={i}
                                        className="w-1 h-1 rounded-full block bg-[#210366] dark:bg-[#00FFFF]"
                                        animate={{ y: [0, -3, 0] }}
                                        transition={{
                                          duration: 0.6,
                                          repeat: Infinity,
                                          delay: i * 0.15,
                                        }}
                                      />
                                    ))}
                                  </motion.div>
                                  <span className="text-black/70 dark:text-white/70 text-[10px] font-medium">
                                    Thinking...
                                  </span>
                                </div>
                              ) : (
                                <motion.p
                                  className="text-xs leading-relaxed text-black dark:text-white"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                >
                                  {aiResponse}
                                </motion.p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </section>

                    {/* Highlights — full-width horizontal scroll */}
                    <section>
                      <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                        Highlights
                      </h3>
                      <div className="flex overflow-x-auto hide-scrollbar gap-5 pb-1 snap-x snap-mandatory">
                        {HIGHLIGHT_ITEMS.map(highlight => (
                          <motion.button
                            key={highlight.id}
                            type="button"
                            onClick={() => setViewingHighlight(highlight)}
                            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer snap-start"
                            whileTap={{ scale: 0.97 }}
                            whileHover={{ scale: 1.04 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          >
                            <div className="w-[72px] h-[72px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#210366] to-[#210366] dark:from-[#00FFFF] dark:to-[#00FFFF]">
                              <div className="w-full h-full rounded-full border-[3px] border-white dark:border-[#0F172A] overflow-hidden bg-slate-200 dark:bg-slate-700">
                                <img
                                  src={highlight.imageUrl}
                                  alt={highlight.label}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                              {highlight.label}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </section>

                    {/* Activity Feed — full width */}
                    <section>
                      <h3 className="text-xl font-black mb-5 text-black dark:text-white">
                        Activity Feed
                      </h3>
                      <div className="space-y-4">
                        <PostComposer
                          deviceActivities={deviceActivities}
                          deviceConnected={deviceConnected}
                        />

                        {/* ── Dynamic feed from Strava activities ── */}
                        {deviceActivities.length > 0 ? (
                          deviceActivities.slice(0, 6).map(act => {
                            const sport = act.sport_type ?? act.type ?? 'Activity'
                            const sportLower = sport.toLowerCase()
                            const emoji = sportLower.includes('ride')
                              ? '🚴'
                              : sportLower.includes('swim')
                                ? '🏊'
                                : '🏃'
                            const distKm = (act.distance / 1000).toFixed(1)
                            const duration = fmtMovingTime(act.moving_time)
                            const pace =
                              act.distance > 0 && !sportLower.includes('ride')
                                ? fmtPaceMinPerKm(act.moving_time, act.distance / 1000)
                                : null
                            const speedKmh =
                              sportLower.includes('ride') && act.moving_time > 0
                                ? (act.distance / 1000 / (act.moving_time / 3600)).toFixed(1)
                                : null
                            const dateLabel = new Date(act.start_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                            return (
                              <div
                                key={act.id}
                                className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm"
                              >
                                <div className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                                      <img
                                        src={AVATAR}
                                        alt="Alex Rivera"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div>
                                      <p className="font-black text-sm text-black dark:text-white">
                                        Alex Rivera{' '}
                                        <span className="font-normal text-slate-400">
                                          logged a {sport.toLowerCase()}
                                        </span>
                                      </p>
                                      <p className="text-slate-400 dark:text-slate-500 text-xs flex items-center gap-1.5">
                                        {dateLabel}
                                        {act.map?.summary_polyline ? (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
                                            <Shield size={8} /> Layer 3
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold text-slate-400">
                                            No GPS
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-xl">{emoji}</span>
                                </div>
                                <div className="px-4 pb-3 grid grid-cols-3 gap-2">
                                  {[
                                    { label: 'Distance', value: distKm, unit: 'km' },
                                    { label: 'Duration', value: duration, unit: null },
                                    pace
                                      ? { label: 'Avg Pace', value: pace, unit: '/km' }
                                      : speedKmh
                                        ? { label: 'Avg Speed', value: speedKmh, unit: 'km/h' }
                                        : {
                                            label: 'Elevation',
                                            value: `${Math.round(act.total_elevation_gain)}`,
                                            unit: 'm',
                                          },
                                  ].map(stat => (
                                    <div
                                      key={stat.label}
                                      className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5"
                                    >
                                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                        {stat.label}
                                      </p>
                                      <div className="flex items-baseline gap-1">
                                        <span className="text-base font-black text-black dark:text-white">
                                          {stat.value}
                                        </span>
                                        {stat.unit && (
                                          <span className="text-[10px] text-slate-400">
                                            {stat.unit}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="px-4 pb-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
                                  <motion.button
                                    className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-full"
                                    whileTap={{ scale: 0.93 }}
                                  >
                                    <Heart size={13} className="text-rose-500" />
                                    <span className="text-xs font-bold text-rose-500">
                                      {Math.floor(Math.random() * 80) + 10}
                                    </span>
                                  </motion.button>
                                  <motion.button
                                    className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 px-3 py-1.5 rounded-full"
                                    whileTap={{ scale: 0.93 }}
                                  >
                                    <MessageCircle
                                      size={13}
                                      className="text-slate-500 dark:text-slate-400"
                                    />
                                  </motion.button>
                                  <motion.button
                                    className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 px-3 py-1.5 rounded-full"
                                    whileTap={{ scale: 0.93 }}
                                  >
                                    <Share2
                                      size={13}
                                      className="text-slate-500 dark:text-slate-400"
                                    />
                                  </motion.button>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          /* ── Empty state — no verified device activities yet ── */
                          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 px-6 py-10 flex flex-col items-center text-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                              <svg
                                viewBox="0 0 24 24"
                                width="28"
                                height="28"
                                fill="none"
                                stroke="#F59E0B"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                              </svg>
                            </div>
                            <p className="font-black text-[15px] text-black dark:text-white">
                              Connect Fitbit to build your Biometric Evidence Journey
                            </p>
                            <p className="text-[12px] text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
                              Heart rate, steps, and distance — all verified as{' '}
                              <span className="font-black text-amber-500">Layer 3</span> biometric
                              signals in your passport.
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              Go to{' '}
                              <span className="font-black text-black dark:text-white">
                                Gear → Connected Services
                              </span>{' '}
                              to link Fitbit.
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {/* Photos tab */}
                {profileTab === 'photos' && (
                  <section>
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                      Photos
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1">
                      {GALLERY_ITEMS.map(item => (
                        <motion.div
                          key={item.id}
                          className="aspect-square bg-cover bg-center cursor-pointer rounded-sm"
                          style={{ backgroundImage: `url('${item.src}')` }}
                          onClick={() => setPreviewImage(item.src)}
                          whileHover={{ opacity: 0.88 }}
                          transition={{ duration: 0.15 }}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Achievements tab */}
                {profileTab === 'achievements' && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          All Achievements
                        </h3>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {ACHIEVEMENTS.filter(a => a.status === 'Completed').length} completed ·{' '}
                          {ACHIEVEMENTS.filter(a => a.status === 'In Progress').length} in progress
                        </p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setShowSnapshot(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#5B32B0] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] text-[11px] font-black shadow"
                      >
                        <Download size={11} />
                        Export CV
                      </motion.button>
                    </div>

                    {ACHIEVEMENTS.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 px-6 py-14 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-[#210366]/8 dark:bg-[#00FFFF]/10 flex items-center justify-center">
                          <Trophy
                            size={32}
                            className="text-[#210366] dark:text-[#00FFFF]"
                            strokeWidth={1.5}
                          />
                        </div>
                        <div>
                          <p className="font-black text-[16px] text-black dark:text-white">
                            Your Verified Passport is Empty
                          </p>
                          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs leading-relaxed">
                            Use{' '}
                            <span className="font-black text-black dark:text-white">Log Past</span>{' '}
                            to verify a race via RunSignUp, or{' '}
                            <span className="font-black text-black dark:text-white">
                              Add to Passport
                            </span>{' '}
                            to start a new journey.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1.5 rounded-full border border-dashed border-slate-200 dark:border-slate-700">
                            Layer 1 → 6
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1.5 rounded-full border border-dashed border-slate-200 dark:border-slate-700">
                            RunSignUp Verified
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1.5 rounded-full border border-dashed border-slate-200 dark:border-slate-700">
                            Strava · Layer 3
                          </span>
                        </div>
                      </div>
                    )}
                    {ACHIEVEMENTS.map(a => {
                      const verifiedCount = (a.trustLayers ?? []).filter(l => l.verified).length
                      const statusColor =
                        a.status === 'Completed'
                          ? 'bg-emerald-500'
                          : a.status === 'In Progress'
                            ? 'bg-amber-400'
                            : 'bg-slate-400'
                      const statusText =
                        a.status === 'Completed'
                          ? '✓ Completed'
                          : a.status === 'In Progress'
                            ? '⚡ In Progress'
                            : '○ Planned'
                      return (
                        <motion.div
                          key={a.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedAchievement(a)}
                          onKeyDown={e => e.key === 'Enter' && setSelectedAchievement(a)}
                          className="group cursor-pointer bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm hover:shadow-md hover:border-[#210366]/40 dark:hover:border-[#00FFFF]/30 transition-all"
                          whileHover={{ y: -2 }}
                          transition={{ duration: 0.15 }}
                        >
                          {/* Thumbnail strip */}
                          {a.thumbnail && (
                            <div
                              className="w-full h-28 bg-cover bg-center relative"
                              style={{ backgroundImage: `url('${a.thumbnail}')` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                              {/* Status badge overlay */}
                              <span
                                className={cn(
                                  'absolute top-3 left-3 flex items-center gap-1 text-[10px] font-black text-white px-2 py-0.5 rounded-full',
                                  statusColor
                                )}
                              >
                                {statusText}
                              </span>
                              {/* Trust dots overlay */}
                              <div className="absolute bottom-3 right-3 flex gap-1">
                                {(a.trustLayers ?? []).map(l => (
                                  <div
                                    key={l.id}
                                    title={l.label}
                                    className={cn(
                                      'w-2 h-2 rounded-full border border-white/60',
                                      l.verified ? 'bg-[#00FFFF]' : 'bg-white/30'
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="px-4 pt-3 pb-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <h4 className="font-black text-[14px] text-black dark:text-white leading-tight">
                                  {a.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                  {a.eventName}
                                </p>
                              </div>
                              {!a.thumbnail && (
                                <span
                                  className={cn(
                                    'flex-shrink-0 text-[10px] font-black text-white px-2 py-0.5 rounded-full',
                                    statusColor
                                  )}
                                >
                                  {statusText}
                                </span>
                              )}
                            </div>

                            {/* Progress bar */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-slate-400">
                                  Progress
                                </span>
                                <span className="text-[10px] font-black text-[#210366] dark:text-[#00FFFF] tabular-nums">
                                  {a.progress}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-[#210366] to-[#5B32B0] dark:from-[#00FFFF] dark:to-[#00FFFF]/60 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${a.progress}%` }}
                                  transition={{ duration: 0.6, ease: 'easeOut' }}
                                />
                              </div>
                            </div>

                            {/* Footer row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Activity size={10} />
                                  {a.activityCount} sessions
                                </span>
                                <span className="text-[11px] text-[#210366] dark:text-[#00FFFF] font-bold">
                                  {verifiedCount}/6 verified
                                </span>
                              </div>
                              <span className="text-[11px] font-black text-[#5B32B0] dark:text-[#00FFFF] group-hover:underline">
                                View Journey →
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </section>
                )}

                {/* Gear tab */}
                {profileTab === 'gear' && (
                  <section className="space-y-3">
                    {/* ── Connected Services ───────────────────────────────── */}
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                      Connected Services
                    </h3>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden shadow-sm mb-4">
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Fitbit heart icon */}
                        <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                          <svg
                            viewBox="0 0 24 24"
                            width="22"
                            height="22"
                            fill="none"
                            stroke="#F59E0B"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-[13px] text-black dark:text-white leading-tight">
                            Fitbit
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {deviceConnected
                              ? [
                                  fitbitToday
                                    ? `${fitbitToday.steps.toLocaleString()} steps today`
                                    : null,
                                  `${deviceActivities.length} activities`,
                                  'Layer 3',
                                ]
                                  .filter(Boolean)
                                  .join(' · ')
                              : 'Heart Rate · Steps · Distance · Layer 3'}
                          </p>
                        </div>
                        {deviceConnected ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              disabled={deviceSyncing}
                              onClick={handleDeviceSync}
                              className="text-[10px] font-black px-3 py-1.5 rounded-lg border border-[#210366]/30 dark:border-[#00FFFF]/30 text-[#210366] dark:text-[#00FFFF] hover:bg-[#210366]/5 dark:hover:bg-[#00FFFF]/5 transition-colors disabled:opacity-50"
                            >
                              {deviceSyncing ? (
                                <span className="flex items-center gap-1">
                                  <svg
                                    className="animate-spin"
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                  >
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                  </svg>
                                  Syncing…
                                </span>
                              ) : (
                                'Sync Now'
                              )}
                            </button>
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                              <CheckCircle2 size={8} /> Connected
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={deviceSyncing}
                            onClick={handleDeviceSync}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black bg-[#F59E0B] text-white hover:bg-[#d97706] active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                          >
                            {deviceSyncing ? (
                              <svg
                                className="animate-spin"
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                              </svg>
                            )}
                            Connect Fitbit
                          </button>
                        )}
                      </div>

                      {/* Today's Fitbit stats — steps, calories, distance, active mins */}
                      {deviceConnected && fitbitToday && (
                        <div className="border-t border-slate-200 dark:border-slate-700/60">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-4 pt-2.5 pb-1">
                            Today
                          </p>
                          <div className="grid grid-cols-4 divide-x divide-slate-200 dark:divide-slate-700/60">
                            {[
                              { label: 'Steps', value: fitbitToday.steps.toLocaleString() },
                              {
                                label: 'Calories',
                                value: fitbitToday.caloriesOut.toLocaleString(),
                              },
                              { label: 'Distance', value: `${fitbitToday.distanceKm} km` },
                              { label: 'Active Min', value: `${fitbitToday.activeMinutes}` },
                            ].map(s => (
                              <div key={s.label} className="px-2 py-2.5 text-center">
                                <p className="text-[13px] font-black text-black dark:text-white tabular-nums leading-tight">
                                  {s.value}
                                </p>
                                <p className="text-[9px] text-slate-400 mt-0.5">{s.label}</p>
                              </div>
                            ))}
                          </div>
                          {fitbitToday.restingHeartRate && (
                            <div className="flex items-center gap-1.5 px-4 py-2 border-t border-slate-200 dark:border-slate-700/60">
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="text-[#F59E0B] dark:text-[#00FFFF] flex-shrink-0"
                              >
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                              </svg>
                              <span className="text-[10px] font-black text-[#F59E0B] dark:text-[#00FFFF] tabular-nums">
                                {fitbitToday.restingHeartRate} bpm
                              </span>
                              <span className="text-[9px] text-slate-400">Resting Heart Rate</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* GPS error nudge */}
                      {deviceError && (
                        <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 flex items-start gap-2">
                          <Zap size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-snug">
                            {deviceError}
                          </p>
                        </div>
                      )}

                      {/* Recent activities sparkline list */}
                      {deviceConnected && deviceActivities.length > 0 && (
                        <div className="border-t border-slate-200 dark:border-slate-700/60 px-4 py-2 space-y-1.5">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                            Recent Activities
                          </p>
                          {deviceActivities.slice(0, 4).map(act => {
                            const distKm = (act.distance / 1000).toFixed(1)
                            const mins = Math.floor(act.moving_time / 60)
                            const hasGps = !!act.map?.summary_polyline
                            return (
                              <div key={act.id} className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-[#210366]/8 dark:bg-[#00FFFF]/10 flex items-center justify-center flex-shrink-0">
                                  <Activity
                                    size={11}
                                    className="text-[#210366] dark:text-[#00FFFF]"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-black text-black dark:text-white leading-tight truncate">
                                    {act.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400">
                                    {distKm} km · {mins} min
                                  </p>
                                </div>
                                {/* Inline sparkline — 6-bar pulse using elevation data proxy */}
                                <div className="flex items-end gap-px h-5 flex-shrink-0">
                                  {[0.4, 0.7, 0.55, 0.9, 0.65, 1.0].map((h, i) => (
                                    <div
                                      key={i}
                                      className="w-1 rounded-sm bg-[#210366] dark:bg-[#00FFFF]"
                                      style={{ height: `${h * 100}%`, opacity: 0.55 + h * 0.4 }}
                                    />
                                  ))}
                                </div>
                                {!hasGps && (
                                  <span className="text-[8px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    No GPS
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                      Gear
                    </h3>
                    {/* ── Empty state — gear is added via user profile ── */}
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 px-6 py-10 flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#210366]/8 dark:bg-[#00FFFF]/10 flex items-center justify-center">
                        <Bike size={22} className="text-[#210366] dark:text-[#00FFFF]" />
                      </div>
                      <p className="font-black text-[14px] text-black dark:text-white">
                        No Gear Listed Yet
                      </p>
                      <p className="text-[12px] text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
                        Add your training gear to your profile. Gear linked to a verified Strava
                        device achieves <span className="font-black text-amber-500">Layer 3</span>{' '}
                        status automatically.
                      </p>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE BOTTOM BAR (hidden on lg+) ───────────────────────────────── */}
        <div className="fixed bottom-5 left-4 right-4 z-50 pointer-events-none lg:hidden">
          <div
            className="pointer-events-auto rounded-full px-5 py-3.5 flex items-center justify-between shadow-2xl border border-white/10"
            style={{ background: 'rgba(16,25,34,0.96)', backdropFilter: 'blur(16px)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border-2 border-[#210366] dark:border-[#00FFFF] overflow-hidden flex-shrink-0">
                <img src={AVATAR} alt="Alex Rivera" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-white font-black text-sm leading-tight">Alex Rivera</p>
                <p className="text-[#210366] dark:text-[#00FFFF] text-[11px] font-bold flex items-center gap-1">
                  <Award size={11} />
                  24 Medals
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <motion.button
                className="text-[#210366] dark:text-[#00FFFF]"
                whileTap={{ scale: 0.85 }}
              >
                <Home size={22} />
              </motion.button>
              <motion.button
                className="text-white/50 hover:text-white transition-colors"
                whileTap={{ scale: 0.85 }}
              >
                <BarChart2 size={22} />
              </motion.button>
              <motion.button
                className="text-white/50 hover:text-white transition-colors"
                whileTap={{ scale: 0.85 }}
              >
                <MessageCircle size={22} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ── MODALS ───────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showShareMenu && (
            <motion.div
              key="share-modal"
              className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareMenu(false)}
              style={{ backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.55)' }}
            >
              <motion.div
                className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <Share2 size={15} className="text-[#210366] dark:text-[#00FFFF]" />
                    <h3 className="text-[15px] font-black text-black dark:text-white">
                      Share Profile
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowShareMenu(false)}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                    aria-label="Close"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Options */}
                <div className="p-3 space-y-1.5">
                  {/* QR Code */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowQrModal(true)
                      setShowShareMenu(false)
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#210366]/8 dark:bg-[#00FFFF]/8 flex items-center justify-center flex-shrink-0">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[#210366] dark:text-[#00FFFF]"
                      >
                        <rect width="5" height="5" x="3" y="3" rx="1" />
                        <rect width="5" height="5" x="16" y="3" rx="1" />
                        <rect width="5" height="5" x="3" y="16" rx="1" />
                        <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                        <path d="M21 21v.01" />
                        <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                        <path d="M3 12h.01" />
                        <path d="M12 3h.01" />
                        <path d="M12 16v.01" />
                        <path d="M16 12h1" />
                        <path d="M21 12v.01" />
                        <path d="M12 21v-1" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-black dark:text-white">QR Code</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Scan to view this profile</p>
                    </div>
                  </button>

                  {/* Download CV */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowSnapshot(true)
                      setShowShareMenu(false)
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#210366]/8 dark:bg-[#00FFFF]/8 flex items-center justify-center flex-shrink-0">
                      <Download size={18} className="text-[#210366] dark:text-[#00FFFF]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-black dark:text-white">
                        Download CV
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Export as PDF portfolio</p>
                    </div>
                  </button>

                  {/* Copy Link */}
                  <button
                    type="button"
                    onClick={() => {
                      copyProfileLink()
                      setShowShareMenu(false)
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#210366]/8 dark:bg-[#00FFFF]/8 flex items-center justify-center flex-shrink-0">
                      <Link2 size={18} className="text-[#210366] dark:text-[#00FFFF]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-black dark:text-white">
                        {linkCopied ? 'Link copied!' : 'Copy Link'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Share profile URL</p>
                    </div>
                  </button>

                  {/* Export Portfolio */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowSnapshot(true)
                      setShowShareMenu(false)
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#210366]/8 dark:bg-[#00FFFF]/8 flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-[#210366] dark:text-[#00FFFF]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-black dark:text-white">
                        Export Portfolio
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Verified achievement snapshot
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
          {showSnapshot && (
            <FlinkiSnapshotModal
              achievements={ACHIEVEMENTS}
              onClose={() => setShowSnapshot(false)}
            />
          )}
          {showQrModal && (
            <motion.div
              className="fixed inset-0 z-[150] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQrModal(false)}
              style={{ backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.65)' }}
            >
              <motion.div
                className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-700"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-black dark:text-white">Share profile</h3>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(false)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                  Scan for instant in-person networking at races or events.
                </p>
                <div className="flex justify-center bg-white dark:bg-white p-4 rounded-xl mb-4">
                  <QRCodeSVG value={profileUrl} size={180} level="M" marginSize={2} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Shareable link
                </p>
                <div className="flex gap-2">
                  <code
                    className="flex-1 min-w-0 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg truncate"
                    title={profileUrl}
                  >
                    {profileUrl}
                  </code>
                  <Button
                    size="sm"
                    className="flex-shrink-0 bg-[#210366] dark:bg-[#00FFFF] text-white dark:text-[#0F172A] hover:bg-[#6d4cc2] dark:hover:bg-[#00FFFF]/90"
                    onClick={copyProfileLink}
                  >
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
          {selectedAchievement && (
            <AchievementJourneyModal
              achievement={selectedAchievement}
              onClose={() => setSelectedAchievement(null)}
              shareRef={journeyModalRef}
            />
          )}
          {viewingHighlight && (
            <StoryOverlay highlight={viewingHighlight} onClose={() => setViewingHighlight(null)} />
          )}
          {previewImage && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.82)' }}
            >
              <motion.img
                src={previewImage}
                className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                onClick={e => e.stopPropagation()}
              />
              <button
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                onClick={() => setPreviewImage(null)}
                aria-label="Close preview"
              >
                <X size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Off-screen HighlightCard — captured by html-to-image on share */}
        {currentAchievement &&
          (() => {
            const layers = currentAchievement.trustLayers ?? []
            const hl: HighlightAchievement = {
              id: currentAchievement.id,
              title: currentAchievement.title,
              eventName: currentAchievement.eventName,
              status: currentAchievement.status,
              rootOfTrust: currentAchievement.rootOfTrust,
              pillar: currentAchievement.pillar,
              verifiedCount: layers.filter(l => l.verified).length,
              summaryTime: currentAchievement.summaryStats?.stat1?.value,
              summaryDistance: currentAchievement.summaryStats?.stat2?.value,
              isSimulator: currentAchievement.verificationData?.provider === 'flinki-legacy',
            }
            return (
              <HighlightCardCanvas
                ref={highlightCardRef}
                achievement={hl}
                isDark={isDark}
                profileUrl={profileUrl}
              />
            )
          })()}
      </div>
    </div>
  )
}

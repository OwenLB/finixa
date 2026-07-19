// ─── HSL helpers ────────────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  const sl = s / 100
  const ll = l / 100
  const a  = sl * Math.min(ll, 1 - ll)
  const f  = (n: number) => {
    const k     = (n + h / 30) % 12
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

// ─── Dégradé progressif ──────────────────────────────────────────────────────
//
// Génère N couleurs dérivées de la couleur parente.
// Dark  : part d'un ton clair/vif, descend vers un ton sombre
// Light : part d'un ton vif/medium, monte vers un ton pastel

export function deriveSubColors(baseHex: string, count: number, isDark: boolean): string[] {
  if (count === 0) return []
  const [h, s, l] = hexToHsl(baseHex)

  let lStart: number, lEnd: number, sStart: number, sEnd: number

  if (isDark) {
    lStart = clamp(l + 14, 52, 74)
    lEnd   = clamp(l - 24, 20, 46)
    sStart = clamp(s + 5,  72, 100)
    sEnd   = clamp(s - 22, 42, 78)
  } else {
    lStart = clamp(l - 6,  38, 58)
    lEnd   = clamp(l + 30, 70, 88)
    sStart = clamp(s,      62, 100)
    sEnd   = clamp(s - 38, 26, 64)
  }

  return Array.from({ length: count }, (_, i) => {
    const t  = count === 1 ? 0 : i / (count - 1)
    const lv = Math.round(lStart + (lEnd - lStart) * t)
    const sv = Math.round(sStart + (sEnd - sStart) * t)
    return hslToHex(h, sv, lv)
  })
}

// ─── Darken ──────────────────────────────────────────────────────────────────

export function darkenHex(hex: string, amount = 20): string {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, s, Math.max(0, l - amount))
}

// ─── Validation hex ──────────────────────────────────────────────────────────

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
}

// ─── Palettes groupées ───────────────────────────────────────────────────────
//
// Dark  : couleurs vives/saturées qui ressortent sur fond sombre
// Light : mêmes teintes mais plus sombres/denses pour contraster sur fond clair
//
// 4 groupes × 8 couleurs = 32 couleurs prédéfinies par thème

export interface ColorGroup {
  label:  string
  colors: string[]
}

export const PALETTE_GROUPS_DARK: ColorGroup[] = [
  {
    label:  'Rouges & oranges',
    colors: [
      '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c',
      '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c',
      '#fde68a', '#fbbf24', '#f59e0b', '#d97706',
    ],
  },
  {
    label:  'Verts & teals',
    colors: [
      '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f',
      '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d',
      '#6ee7b7', '#34d399', '#10b981', '#059669',
      '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488',
    ],
  },
  {
    label:  'Bleus & indigos',
    colors: [
      '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490',
      '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1',
      '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8',
      '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca',
    ],
  },
  {
    label:  'Violets & roses',
    colors: [
      '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9',
      '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce',
      '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf',
      '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d',
    ],
  },
  {
    label:  'Neutres',
    colors: [
      '#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155',
      '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151',
      '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040',
    ],
  },
]

export const PALETTE_GROUPS_LIGHT: ColorGroup[] = [
  {
    label:  'Rouges & oranges',
    colors: [
      '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',
      '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12',
      '#f59e0b', '#d97706', '#b45309', '#92400e',
    ],
  },
  {
    label:  'Verts & teals',
    colors: [
      '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314',
      '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
      '#10b981', '#059669', '#047857', '#065f46',
      '#14b8a6', '#0d9488', '#0f766e', '#115e59',
    ],
  },
  {
    label:  'Bleus & indigos',
    colors: [
      '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63',
      '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e',
      '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
      '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81',
    ],
  },
  {
    label:  'Violets & roses',
    colors: [
      '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95',
      '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87',
      '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75',
      '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843',
    ],
  },
  {
    label:  'Neutres',
    colors: [
      '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1',
      '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db',
      '#404040', '#525252', '#737373', '#a3a3a3', '#d4d4d4',
    ],
  },
]

// Palettes plates (rétrocompatibilité)
export const PALETTE_DARK:  string[] = PALETTE_GROUPS_DARK.flatMap(g => g.colors)
export const PALETTE_LIGHT: string[] = PALETTE_GROUPS_LIGHT.flatMap(g => g.colors)

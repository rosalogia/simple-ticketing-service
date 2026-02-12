export const colors = {
  // Core palette (matches web's stone-based theme)
  ink: '#1a1816',
  inkLight: '#2d2a27',
  inkMuted: '#6b6560',
  paper: '#faf9f7',
  paperWarm: '#f5f3f0',
  paperDeep: '#eae7e3',
  white: '#ffffff',

  // Stone scale
  stone50: '#faf9f7',
  stone100: '#f0eeeb',
  stone200: '#e2dfda',
  stone300: '#ccc8c1',
  stone400: '#a8a29e',
  stone500: '#78716c',
  stone600: '#57534e',
  stone700: '#44403c',
  stone800: '#292524',
  stone900: '#1a1816',

  // Accent
  accent: '#7c3aed',
  accentLight: '#ede9fe',

  // Severity
  sev1: '#dc2626',
  sev1Bg: '#fef2f2',
  sev1Border: '#fecaca',
  sev2: '#ea580c',
  sev2Bg: '#fff7ed',
  sev2Border: '#fed7aa',
  sev3: '#2563eb',
  sev3Bg: '#eff6ff',
  sev3Border: '#bfdbfe',
  sev4: '#6b7280',
  sev4Bg: '#f3f4f6',
  sev4Border: '#d1d5db',

  // Status
  statusOpen: '#2563eb',
  statusOpenBg: '#eff6ff',
  statusProgress: '#d97706',
  statusProgressBg: '#fffbeb',
  statusBlocked: '#dc2626',
  statusBlockedBg: '#fef2f2',
  statusDone: '#16a34a',
  statusDoneBg: '#f0fdf4',
  statusCancel: '#6b7280',
  statusCancelBg: '#f3f4f6',

  // Discord
  discord: '#5865F2',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const priorityColors: Record<string, {text: string; bg: string; border: string}> = {
  SEV1: {text: colors.sev1, bg: colors.sev1Bg, border: colors.sev1Border},
  SEV2: {text: colors.sev2, bg: colors.sev2Bg, border: colors.sev2Border},
  SEV3: {text: colors.sev3, bg: colors.sev3Bg, border: colors.sev3Border},
  SEV4: {text: colors.sev4, bg: colors.sev4Bg, border: colors.sev4Border},
};

export const statusColors: Record<string, {text: string; bg: string}> = {
  OPEN: {text: colors.statusOpen, bg: colors.statusOpenBg},
  IN_PROGRESS: {text: colors.statusProgress, bg: colors.statusProgressBg},
  BLOCKED: {text: colors.statusBlocked, bg: colors.statusBlockedBg},
  COMPLETED: {text: colors.statusDone, bg: colors.statusDoneBg},
  CANCELLED: {text: colors.statusCancel, bg: colors.statusCancelBg},
};

export const statusLabels: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const priorityLabels: Record<string, string> = {
  SEV1: 'SEV-1',
  SEV2: 'SEV-2',
  SEV3: 'SEV-3',
  SEV4: 'SEV-4',
};

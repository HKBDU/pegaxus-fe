const progressFormatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 1,
});

// The backend supplies percentage points, not a fraction. Only round the displayed text.
export function formatDossierProgress(value: number) {
  return `${progressFormatter.format(value)}%`;
}

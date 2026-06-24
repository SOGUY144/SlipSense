import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Trigger device haptic feedback (vibration)
 * @param type 'success' (double tap) | 'light' (single light tap) | 'error' (heavy tap)
 */
export function triggerHaptic(type: 'success' | 'light' | 'error' = 'light') {
  if (typeof window === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'success':
        // Short, gap, short (feels like a success confirmation)
        navigator.vibrate([30, 60, 30]);
        break;
      case 'light':
        // Single very short tap
        navigator.vibrate(20);
        break;
      case 'error':
        // Longer heavy vibration
        navigator.vibrate(100);
        break;
    }
  } catch (error) {
    // Ignore errors on devices that don't support it
    console.warn('Haptic feedback not supported', error);
  }
}

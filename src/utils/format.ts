export function getTaiwanDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getTaiwanTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function formatMoney(amount: number, isPrivacy = false): string {
  if (isPrivacy) return '****';
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) return '$0';
  const rounded = Math.round(amount);
  const absFormatted = Math.abs(rounded).toLocaleString();
  return rounded < 0 ? `-$${absFormatted}` : `$${absFormatted}`;
}

export function formatNumber(num: number, digits = 2): string {
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) return '0.00';
  return num.toLocaleString('zh-TW', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function escapeHtml(unsafe: string): string {
  return String(unsafe || '').replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}

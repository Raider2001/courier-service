export const STATUS_LABELS = {
  requested: 'Pending',
  scheduled: 'Assigned',
  in_progress: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const money = (value) =>
  `£${Number(value || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const miles = (value) => `${Number(value || 0).toLocaleString('en-GB')} mi`;

export function dateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function dateOnly(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "12 Waterside, Leeds LS11 5RD" from an address-shaped object. */
export function addressLine(parts) {
  return [parts.line1, parts.line2, parts.city, parts.postcode].filter(Boolean).join(', ');
}

/** For <input type="datetime-local">, which wants local time without a zone. */
export function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

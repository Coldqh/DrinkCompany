export function compareVersions(left: string, right: string): number {
  const a = normalize(left);
  const b = normalize(right);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  return 0;
}

export function isRemoteVersionNewer(remote: string, current: string): boolean {
  return compareVersions(remote, current) > 0;
}

function normalize(value: string): number[] {
  return value.replace(/^v/i, '').split('.').map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}

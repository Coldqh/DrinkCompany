import { describe, expect, it } from 'vitest';
import { compareVersions, isRemoteVersionNewer } from './version';

describe('version control', () => {
  it('обнаруживает более новую опубликованную версию', () => {
    expect(isRemoteVersionNewer('0.5.0', '0.4.0')).toBe(true);
    expect(isRemoteVersionNewer('1.0.0', '0.9.9')).toBe(true);
  });

  it('не блокирует новый клиент из-за временно старого version.json', () => {
    expect(isRemoteVersionNewer('0.4.0', '0.5.0')).toBe(false);
    expect(compareVersions('0.5', '0.5.0')).toBe(0);
  });
});

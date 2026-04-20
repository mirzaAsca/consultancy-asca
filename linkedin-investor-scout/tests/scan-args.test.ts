import { describe, expect, it } from 'vitest';
import { DEFAULT_SCAN_ARGS } from '@/content/scan';

describe('scan executeScript args', () => {
  it('are JSON-serializable for chrome.scripting.executeScript', () => {
    const serialized = JSON.parse(JSON.stringify(DEFAULT_SCAN_ARGS));
    expect(serialized.safetyUrlPatterns.captcha.source).toBeTruthy();
    expect(serialized.safetyUrlPatterns.rateLimit.source).toBeTruthy();
    expect(serialized.safetyUrlPatterns.authWall.source).toBeTruthy();
  });
});

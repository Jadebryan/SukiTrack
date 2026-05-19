/**
 * Shared layout for custom PIN numpad screens (`LoginScreen`, `SetupPinScreen`).
 * Short viewports (common on budget Android) need smaller keys and vertical rhythm
 * so the dial stays on-screen without scrolling.
 *
 * @param {number} windowHeight from `useWindowDimensions().height`
 * @param {number} windowWidth from `useWindowDimensions().width`
 */
export function getAuthPinNumpadMetrics(windowHeight, windowWidth) {
  const h =
    typeof windowHeight === 'number' && windowHeight > 0 ? windowHeight : 800;
  const w =
    typeof windowWidth === 'number' && windowWidth > 0 ? windowWidth : 360;

  let tier = 'comfortable';
  if (h < 740) tier = 'compact';
  if (h < 660) tier = 'tight';

  const specs = {
    comfortable: {
      keyGap: 10,
      cardPad: 28,
      keyMax: 80,
      keyRowMb: 10,
      heroPadBottom: 44,
      heroTopBump: 20,
      loginLogo: 64,
      loginLogoMb: 12,
      loginBrand: 32,
      loginTaglineMt: 6,
      loginAccountMb: 22,
      loginPinDotsMb: 20,
      loginPinFooterMb: 20,
      loginGreetingMb: 4,
      setupTipMb: 18,
      setupTipPv: 12,
      setupNumpadMt: 18,
      setupNumpadMb: 18,
      setupBetweenFieldsMt: 18,
      setupHeroTitleSize: 26,
      setupHeroTitleLh: 32,
      setupHeroTitleMb: 8,
      setupCardPadTop: 24,
      setupCtaPv: 16,
      keySubSpacer: 14,
    },
    compact: {
      keyGap: 8,
      cardPad: 25,
      keyMax: 66,
      keyRowMb: 8,
      heroPadBottom: 30,
      heroTopBump: 12,
      loginLogo: 54,
      loginLogoMb: 8,
      loginBrand: 28,
      loginTaglineMt: 4,
      loginAccountMb: 14,
      loginPinDotsMb: 14,
      loginPinFooterMb: 12,
      loginGreetingMb: 2,
      setupTipMb: 12,
      setupTipPv: 10,
      setupNumpadMt: 12,
      setupNumpadMb: 12,
      setupBetweenFieldsMt: 12,
      setupHeroTitleSize: 24,
      setupHeroTitleLh: 30,
      setupHeroTitleMb: 6,
      setupCardPadTop: 18,
      setupCtaPv: 14,
      keySubSpacer: 12,
    },
    tight: {
      keyGap: 6,
      cardPad: 22,
      keyMax: 54,
      keyRowMb: 6,
      heroPadBottom: 18,
      heroTopBump: 6,
      loginLogo: 46,
      loginLogoMb: 6,
      loginBrand: 24,
      loginTaglineMt: 2,
      loginAccountMb: 10,
      loginPinDotsMb: 10,
      loginPinFooterMb: 8,
      loginGreetingMb: 2,
      setupTipMb: 8,
      setupTipPv: 8,
      setupNumpadMt: 8,
      setupNumpadMb: 8,
      setupBetweenFieldsMt: 8,
      setupHeroTitleSize: 22,
      setupHeroTitleLh: 28,
      setupHeroTitleMb: 4,
      setupCardPadTop: 14,
      setupCtaPv: 12,
      keySubSpacer: 10,
    },
  };

  const s = specs[tier];
  const keySize = Math.min(
    s.keyMax,
    (w - s.cardPad * 2 - s.keyGap * 2) / 3
  );

  return { tier, keySize, ...s };
}

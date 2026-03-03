// ═══════════════════════════════════════════════════════
// public/js/card-rarity-patch.js
// Auto-patches buildCardV4 to apply rarity scaling
// Load AFTER card-v4.js
// ═══════════════════════════════════════════════════════

(function() {
  // Wait for buildCardV4 to exist, then wrap it
  function patchBuildCard() {
    if (typeof window.buildCardV4 !== 'function') {
      // card-v4.js hasn't loaded yet, retry
      setTimeout(patchBuildCard, 50);
      return;
    }

    // Already patched?
    if (window._buildCardV4Patched) return;

    const originalBuild = window.buildCardV4;

    window.buildCardV4 = function(cardData, options) {
      // Scale stats by rarity before rendering
      if (cardData && typeof window.scaleCardStats === 'function') {
        window.scaleCardStats(cardData);
      }
      return originalBuild(cardData, options);
    };

    window._buildCardV4Patched = true;
    console.log('✅ Card renderer patched — rarity scaling active');
  }

  // Start patching
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchBuildCard);
  } else {
    patchBuildCard();
  }
})();
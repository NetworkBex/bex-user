'use client';

import { useEffect } from 'react';
import Script from 'next/script';

/**
 * Google Translate website widget — gives every page a language selector with
 * all major languages, no per-string translation work. The Google banner is
 * suppressed via CSS in globals.css; we just render the mount point + a small
 * floating frame and load the loader script.
 */
export function LanguageTranslate() {
  useEffect(() => {
    // Define the init callback Google's loader calls.
    (window as any).googleTranslateElementInit = function () {
      const g = (window as any).google;
      if (g?.translate?.TranslateElement) {
        new g.translate.TranslateElement(
          { pageLanguage: 'en', autoDisplay: false },
          'google_translate_element',
        );
      }
    };
  }, []);

  return (
    <>
      <div
        className="gt-floating fixed bottom-4 left-4 z-[900] rounded-lg border border-border bg-surface shadow-[var(--shadow-md)] px-2 py-1"
        aria-label="Translate this page"
      >
        <div id="google_translate_element" />
      </div>
      <Script
        id="google-translate"
        strategy="afterInteractive"
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      />
    </>
  );
}

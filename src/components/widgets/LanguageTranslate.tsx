'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { LANGUAGES } from './LanguagePicker';

/**
 * Hidden Google Translate initializer. We never show Google's own widget —
 * the visible UI is our own <LanguagePicker>, which sets the `googtrans`
 * cookie and reloads; this hidden element boots the Google runtime so that
 * cookie is applied on load. No Google branding is ever rendered.
 */
export function LanguageTranslate() {
  useEffect(() => {
    (window as any).googleTranslateElementInit = function () {
      const g = (window as any).google;
      if (g?.translate?.TranslateElement) {
        new g.translate.TranslateElement(
          {
            pageLanguage: 'en',
            autoDisplay: false,
            includedLanguages: LANGUAGES.map((l) => l.code).join(','),
          },
          'google_translate_element',
        );
      }
    };
  }, []);

  return (
    <>
      <div id="google_translate_element" className="gt-hidden" aria-hidden />
      <Script
        id="google-translate"
        strategy="afterInteractive"
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      />
    </>
  );
}

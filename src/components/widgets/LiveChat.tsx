'use client';

import Script from 'next/script';

/** Smartsupp live chat. Loads after the page is interactive so it never
 *  blocks first paint. */
export function LiveChat() {
  return (
    <Script id="smartsupp" strategy="afterInteractive">
      {`
        var _smartsupp = _smartsupp || {};
        _smartsupp.key = '1fcc5922fe2e5165fcc2e0afb18b5f4d8128744c';
        window.smartsupp||(function(d) {
          var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
          s=d.getElementsByTagName('script')[0];c=d.createElement('script');
          c.type='text/javascript';c.charset='utf-8';c.async=true;
          c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
        })(document);
      `}
    </Script>
  );
}

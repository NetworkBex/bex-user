// Smartsupp live chat. Rendered as a raw inline <script> so it lands directly
// in the server HTML and executes on first load (same reliable pattern as the
// theme-init script) — next/script's inline+afterInteractive variant was being
// injected client-side and not booting the widget.

const SMARTSUPP = `
var _smartsupp = _smartsupp || {};
_smartsupp.key = '1fcc5922fe2e5165fcc2e0afb18b5f4d8128744c';
window.smartsupp||(function(d) {
  var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
  s=d.getElementsByTagName('script')[0];c=d.createElement('script');
  c.type='text/javascript';c.charset='utf-8';c.async=true;
  c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
})(document);
`;

export function LiveChat() {
  return <script id="smartsupp-script" dangerouslySetInnerHTML={{ __html: SMARTSUPP }} />;
}

// Safe serializer for inline <script type="application/ld+json"> blocks.
//
// JSON.stringify does NOT escape `</script>` or the U+2028 / U+2029 line
// separators, so a user-controlled field (bio, display_name, role, city, …)
// containing `</script><script>…` breaks out of the JSON-LD script element and
// executes arbitrary JS on every visitor — stored XSS by a card owner against
// viewers. Escaping `<` (plus the two line separators, which are legal in JSON
// strings but break inline scripts) keeps the output valid JSON/JSON-LD while
// making breakout impossible. The U+2028/U+2029 patterns are built from char
// codes so this source file stays pure ASCII.
const LS = new RegExp(String.fromCharCode(0x2028), 'g')
const PS = new RegExp(String.fromCharCode(0x2029), 'g')

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(LS, '\\u2028')
    .replace(PS, '\\u2029')
}

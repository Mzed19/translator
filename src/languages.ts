/** Códigos ISO 639-1 expostos na API (extensão). */
export type ApiLang = 'en' | 'pt' | 'ja'

/** ISO 639-3 usados pelo pacote `franc`. */
const FRANC_CODES: Record<ApiLang, string> = {
  en: 'eng',
  pt: 'por',
  ja: 'jpn',
}

const FRANC_TO_API = new Map<string, ApiLang>(
  (Object.keys(FRANC_CODES) as ApiLang[]).map((api) => [FRANC_CODES[api], api]),
)

export const SUPPORTED_LANGS: ApiLang[] = ['en', 'pt', 'ja']

export function isApiLang(x: string): x is ApiLang {
  return SUPPORTED_LANGS.includes(x as ApiLang)
}

export function francCodeFor(api: ApiLang): string {
  return FRANC_CODES[api]
}

/** Converte código ISO 639-3 do franc para código da API. */
export function apiLangFromFranc(franc3: string): ApiLang | null {
  return FRANC_TO_API.get(franc3) ?? null
}

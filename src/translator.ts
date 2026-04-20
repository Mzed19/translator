import { pipeline } from '@xenova/transformers'
import { franc } from 'franc'
import { type ApiLang, apiLangFromFranc, nllbCodeFor } from './languages.js'

const MODEL_ID = 'Xenova/nllb-200-distilled-600M'

const FRANC_ONLY = ['eng', 'por', 'rus', 'deu', 'spa', 'fra'] as const

type NllbTranslator = (
  text: string,
  opts: { src_lang: string; tgt_lang: string },
) => Promise<{ translation_text: string }[]>

let translatorPromise: Promise<NllbTranslator> | null = null

async function getTranslator(): Promise<NllbTranslator> {
  if (!translatorPromise) {
    translatorPromise = pipeline('translation', MODEL_ID).then(
      (p) => p as unknown as NllbTranslator,
    )
  }
  return translatorPromise
}

export function detectSourceLang(text: string): ApiLang | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const code3 = franc(trimmed, {
    only: [...FRANC_ONLY],
    minLength: 1,
  })
  if (code3 === 'und') return null
  return apiLangFromFranc(code3)
}

export async function translateText(
  text: string,
  target: ApiLang,
): Promise<{ translated: string; detected: ApiLang | null }> {
  const trimmed = text.trim()
  if (!trimmed) {
    return { translated: '', detected: null }
  }

  const detected = detectSourceLang(trimmed)
  if (detected === null) {
    return { translated: '', detected: null }
  }

  const tgt = nllbCodeFor(target)

  if (detected === target) {
    return { translated: trimmed, detected }
  }

  const srcNllb = nllbCodeFor(detected)
  const translator = await getTranslator()

  const out = await translator(trimmed, {
    src_lang: srcNllb,
    tgt_lang: tgt,
  })

  const first = Array.isArray(out) ? out[0] : out
  const translated =
    first && typeof first === 'object' && 'translation_text' in first
      ? String((first as { translation_text: string }).translation_text)
      : trimmed

  return { translated, detected }
}

/** Só para testes / warm-up: carrega o modelo. */
export async function preloadModel(): Promise<void> {
  await getTranslator()
}

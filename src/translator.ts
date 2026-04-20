import { pipeline } from '@xenova/transformers'
import { franc } from 'franc'
import { type ApiLang, apiLangFromFranc, m2m100LangCode } from './languages.js'

/** M2M100 418M (ONNX): bem mais leve que NLLB 600M; cobre en, pt, ja entre outros. */
const MODEL_ID = 'Xenova/m2m100_418M'

const FRANC_ONLY = ['eng', 'por', 'jpn'] as const

type M2mTranslator = (
  text: string,
  opts: { src_lang: string; tgt_lang: string },
) => Promise<{ translation_text: string }[]>

let translatorPromise: Promise<M2mTranslator> | null = null

async function getTranslator(): Promise<M2mTranslator> {
  if (!translatorPromise) {
    translatorPromise = pipeline('translation', MODEL_ID).then(
      (p) => p as unknown as M2mTranslator,
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

  const tgt = m2m100LangCode(target)

  if (detected === target) {
    return { translated: trimmed, detected }
  }

  const src = m2m100LangCode(detected)
  const translator = await getTranslator()

  const out = await translator(trimmed, {
    src_lang: src,
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

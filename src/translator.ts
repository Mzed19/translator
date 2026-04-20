import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { franc } from 'franc'
import { type ApiLang, apiLangFromFranc } from './languages.js'

const FRANC_ONLY = ['eng', 'por', 'jpn'] as const

function argosPython(): string {
  const e = process.env.ARGOS_PYTHON?.trim()
  if (e) return e
  return process.platform === 'win32' ? 'python' : 'python3'
}

function argosScriptPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return path.join(here, '..', 'scripts', 'argos_translate.py')
}

type ArgosOut = { translated?: string; error?: string }

async function runArgosTranslate(
  text: string,
  from: ApiLang,
  to: ApiLang,
): Promise<string> {
  const py = argosPython()
  const script = argosScriptPath()
  const payload = JSON.stringify({ text, from, to })

  return new Promise((resolve, reject) => {
    const child = spawn(py, [script], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let out = ''
    let err = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (c: string) => {
      out += c
    })
    child.stderr.on('data', (c: string) => {
      err += c
    })
    child.on('error', (e) => {
      reject(
        new Error(
          `Não foi possível executar Python (${py}). Defina ARGOS_PYTHON ou instale Python 3. Detalhe: ${e instanceof Error ? e.message : String(e)}`,
        ),
      )
    })
    child.on('close', (code) => {
      let data: ArgosOut
      try {
        data = JSON.parse(out.trim() || '{}') as ArgosOut
      } catch {
        reject(
          new Error(
            err.trim() ||
              out.trim() ||
              `Argos: resposta inválida (código ${code ?? '?'})`,
          ),
        )
        return
      }
      if (typeof data.error === 'string' && data.error) {
        reject(new Error(data.error))
        return
      }
      if (typeof data.translated === 'string') {
        resolve(data.translated)
        return
      }
      reject(
        new Error(
          err.trim() || `Argos terminou com código ${code} e sem tradução.`,
        ),
      )
    })
    child.stdin.write(payload, 'utf8')
    child.stdin.end()
  })
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

  if (detected === target) {
    return { translated: trimmed, detected }
  }

  const translated = await runArgosTranslate(trimmed, detected, target)
  return { translated, detected }
}

/** Verifica se Python e argostranslate estão importáveis. */
export async function preloadModel(): Promise<void> {
  const py = argosPython()
  await new Promise<void>((resolve, reject) => {
    const c = spawn(py, ['-c', 'import argostranslate.translate'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let err = ''
    c.stderr.setEncoding('utf8')
    c.stderr.on('data', (d: string) => {
      err += d
    })
    c.on('error', (e) => {
      reject(
        new Error(
          `Python (${py}) não encontrado ou erro ao executar. Defina ARGOS_PYTHON. ${e instanceof Error ? e.message : String(e)}`,
        ),
      )
    })
    c.on('close', (code) => {
      if (code === 0) resolve()
      else
        reject(
          new Error(
            err.trim() ||
              'Pacote argostranslate não encontrado. Rode: pip install -r requirements-argos.txt',
          ),
        )
    })
  })
}

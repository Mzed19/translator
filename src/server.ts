import express from 'express'
import cors from 'cors'
import { isApiLang, SUPPORTED_LANGS } from './languages.js'
import { translateText } from './translator.js'

const PORT = Number(process.env.PORT) || 8787

const app = express()
app.use(express.json({ limit: '512kb' }))

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }
      if (origin.startsWith('chrome-extension://')) {
        callback(null, origin)
        return
      }
      if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) {
        callback(null, origin)
        return
      }
      if (/^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)) {
        callback(null, origin)
        return
      }
      callback(null, false)
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    maxAge: 86400,
  }),
)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/', (_req, res) => {
  res.json({
    name: 'translator-api',
    version: '1',
    endpoints: {
      'POST /translate': {
        body: {
          text: 'string (obrigatório)',
          target: `um de: ${SUPPORTED_LANGS.join(', ')}`,
        },
        response: {
          translated: 'string',
          detected: 'en | pt | ja | null',
          target: 'string',
        },
      },
      'GET /health': {},
    },
    config: {
      ARGOS_PYTHON:
        'Comando Python (default: python3 em Unix, python em Windows).',
      setup:
        'Instale Argos: pip install -r requirements-argos.txt; depois argospm install translate-en_pt translate-pt_en translate-en_ja translate-ja_en (e outros pares se precisar).',
    },
    note:
      'Tradução offline via Argos Translate (Python, subprocesso — sem API HTTP). Deteção: franc (en, pt, ja).',
  })
})

app.post('/translate', async (req, res) => {
  try {
    const { text, target } = req.body as { text?: unknown; target?: unknown }

    if (typeof text !== 'string') {
      res.status(400).json({ error: 'Campo "text" deve ser uma string.' })
      return
    }
    if (typeof target !== 'string' || !isApiLang(target)) {
      res.status(400).json({
        error: `Campo "target" inválido. Use um de: ${SUPPORTED_LANGS.join(', ')}.`,
      })
      return
    }

    if (!text.trim()) {
      res.status(400).json({ error: 'Texto vazio.' })
      return
    }

    const { translated, detected } = await translateText(text, target)

    if (detected === null) {
      res.status(422).json({
        error:
          'Não foi possível detectar o idioma entre os suportados. Tente uma frase um pouco mais longa.',
        translated: null,
        detected: null,
        target,
      })
      return
    }

    res.json({
      translated,
      detected,
      target,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({
      error: 'Falha na tradução.',
      detail: e instanceof Error ? e.message : String(e),
    })
  }
})

app.listen(PORT, () => {
  console.log(`API em http://localhost:${PORT}`)
  console.log('POST /translate  { "text": "...", "target": "pt" }')
})

const API = 'http://localhost:8787'

document.getElementById('go').addEventListener('click', async () => {
  const text = document.getElementById('text').value
  const target = document.getElementById('target').value
  const out = document.getElementById('out')
  out.textContent = 'A carregar…'
  out.className = ''
  try {
    const res = await fetch(`${API}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ text, target }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      out.className = 'err'
      out.textContent = data.error || res.statusText
      return
    }
    out.textContent = `Detectado: ${data.detected}\n\n${data.translated}`
  } catch (e) {
    out.className = 'err'
    out.textContent =
      e instanceof Error
        ? e.message
        : 'Falha na rede. Confirme que a API está a correr (npm run dev).'
  }
})

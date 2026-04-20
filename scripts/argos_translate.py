#!/usr/bin/env python3
"""
Lê de stdin um JSON: {"text": "...", "from": "en", "to": "pt"}
Escreve em stdout: {"translated": "..."} ou {"error": "..."} (exit 1 se erro).

Requer: pip install argostranslate
Pacotes (instale os que faltarem para os pares que usar):
  argospm update
  argospm install translate-en_pt translate-pt_en translate-en_ja translate-ja_en
  # Opcional (pt<->ja direto, se existir no índice):
  # argospm install translate-pt_ja translate-ja_pt
"""
from __future__ import annotations

import json
import sys


def _installed_codes(tr) -> str:
    langs = tr.get_installed_languages()
    return ", ".join(sorted({lang.code for lang in langs}))


def _translate_with_pivot_en(tr, text: str, src: str, tgt: str) -> str:
    """Traduz src->tgt passando por inglês (dois saltos)."""
    mid = tr.translate(text, src, "en")
    return tr.translate(mid, "en", tgt)


def _translate_best(tr, text: str, src: str, tgt: str) -> str:
    if src == tgt:
        return text

    if tr.get_language_from_code(src) is None:
        raise ValueError(
            f"Argos: língua origem '{src}' sem pacote. Instaladas: {_installed_codes(tr)}. "
            f"Ex.: argospm install translate-{src}_en ou translate-en_{src}"
        )
    if tr.get_language_from_code(tgt) is None:
        raise ValueError(
            f"Argos: língua destino '{tgt}' sem pacote. Instaladas: {_installed_codes(tr)}. "
            f"Ex.: argospm install translate-en_{tgt} ou translate-{tgt}_en"
        )

    try:
        return tr.translate(text, src, tgt)
    except Exception as e:  # noqa: BLE001
        err = str(e)
        pivotable = src != "en" and tgt != "en" and (
            "get_translation" in err or "NoneType" in err
        )
        if not pivotable:
            raise ValueError(
                f"Argos ({src}->{tgt}): {err}. Instaladas: {_installed_codes(tr)}."
            ) from e

    try:
        return _translate_with_pivot_en(tr, text, src, tgt)
    except Exception as e2:  # noqa: BLE001
        raise ValueError(
            f"Argos: sem tradução direta {src}->{tgt} e o pivot via inglês falhou. "
            f"Instale translate-{src}_en (ou en_{src}) e translate-en_{tgt} (ou {tgt}_en). "
            f"Instaladas: {_installed_codes(tr)}. Detalhe: {e2}"
        ) from e2


def main() -> None:
    try:
        data = json.load(sys.stdin)
        text = data["text"]
        from_code = data["from"]
        to_code = data["to"]
    except Exception as e:  # noqa: BLE001
        _emit({"error": f"Entrada inválida: {e}"}, 1)
        return

    if not isinstance(text, str):
        _emit({"error": 'Campo "text" deve ser string.'}, 1)
        return

    try:
        import argostranslate.translate as tr  # noqa: PLC0415

        result = _translate_best(tr, text, from_code, to_code)
    except Exception as e:  # noqa: BLE001
        _emit({"error": str(e)}, 1)
        return

    _emit({"translated": result}, 0)


def _emit(obj: dict, code: int) -> None:
    print(json.dumps(obj, ensure_ascii=False), flush=True)
    sys.exit(code)


if __name__ == "__main__":
    main()

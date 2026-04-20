#!/usr/bin/env python3
"""
Lê de stdin um JSON: {"text": "...", "from": "en", "to": "pt"}
Escreve em stdout: {"translated": "..."} ou {"error": "..."} (exit 1 se erro).

Requer: pip install argostranslate
Pacotes de idioma (exemplo): argospm update && argospm install translate-en_pt translate-pt_en translate-en_ja translate-ja_en
"""
from __future__ import annotations

import json
import sys


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

        result = tr.translate(text, from_code, to_code)
    except Exception as e:  # noqa: BLE001
        _emit({"error": str(e)}, 1)
        return

    _emit({"translated": result}, 0)


def _emit(obj: dict, code: int) -> None:
    print(json.dumps(obj, ensure_ascii=False), flush=True)
    sys.exit(code)


if __name__ == "__main__":
    main()

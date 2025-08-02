![Screenshot rozšíření](https://github.com/Misadcz/timeforcode/timeforcode.png?raw=true)

# ⏱️ TimeForCode – VS Code Extension

**TimeForCode** je jednoduché rozšíření pro Visual Studio Code, které sleduje, kolik času strávíš v jednotlivých souborech při práci. Umožňuje vývojářům mít přehled o svém pracovním čase přímo v rámci VSCode – bez nutnosti externích nástrojů.

---

## ✨ Funkce

- ⏳ Měření času stráveného v každém souboru
- 🧠 Zobrazení denního a celkového přehledu
- 📁 Ukládání dat do JSON souboru (`code-time-data.json`)
- 🔄 Automatická aktualizace při změně aktivního souboru

---

## 🚀 Instalace

1. Otevři VS Code
2. Přejdi do `Extensions` (`Ctrl+Shift+X`)
3. Hledej `TimeForCode` (až bude publikováno) **nebo**
4. Nainstaluj ručně:
    ```bash
    git clone https://github.com/Misadcz/timeforcode
    cd timeforcode
    npm install
    npm run compile
    code .
    ```
5. Stiskni `F5` pro spuštění rozšíření v Dev módu

---

## ⚙️ Použití

- Sleduj stav v **status baru**
- Kliknutím můžeš otevřít WebView s přehledem
- Data najdeš v `code-time-data.json` ve složce projektu

---

# Turbo Brain Boost

doradi mi projekt napravi sve ovo Što ostaje odraditi (plan, spremno za sljedeći put):

U askAi pokrenuti OMNI i konsenzus paralelno (Promise.all umjesto dva await u nizu) — to samo po sebi približno prepolovi čekanje kad su oba aktivna.

Dodati „Turbo“ način u postavke mozga (tm.brain.prefs.turbo): 1 prolaz po modelu, ansambl ograničen na 3 člana, maxTokens niži — svi moduli i dalje u promptu, samo manje ponavljanja poziva.

Blaga zaštita od zastoja: ako pomoćni motor ne vrati rezultat na vrijeme, odgovor ide dalje bez tog briefinga (kao i sada kod greške), da korisnik ne čeka najsporiji model.

Prekidač „Brzi odgovori (Turbo)“ u src/routes/postavke.tsx uz postojeće „Ansambl konsenzus“.

Ponovno zapakirati public/andromeda-ai.zip s tim izmjenama i provjeriti da se servira (HTTP 200, application/zip).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://speedy-brain-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/670e1d1c-ab68-40d2-a80e-31d584355bc2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

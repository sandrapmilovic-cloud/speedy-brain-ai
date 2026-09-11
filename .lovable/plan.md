# Precizniji i prijateljskiji AI chat

## Cilj
Povećati pouzdanost predikcija za sve podržane tipove, zadržati prirodan prijateljski hrvatski ton i spriječiti da nedostajući ili kontradiktorni podaci proizvedu lažno samouvjeren odgovor.

## Promjene
- Obnoviti glavni tok chata tako da prije završnog odgovora prepozna traženo tržište i paralelno koristi dostupni konsenzus te specijalizirani gol-motor kada je primjenjiv.
- U završni odgovor uključiti matematičke rezultate kao autoritativne brojke, uz provjeru slaganja, tržišnih kvota, rizika i sigurnije alternative.
- Dodati stroga pravila kvalitete za sve tipove: ne izmišljati formu, xG, izostanke ili kvote; jasno označiti nedostatne podatke; preporučiti preskakanje kada pragovi nisu zadovoljeni.
- Slati cijelu razumnu povijest razgovora umjesto samo zadnja tri odgovora kako bi Luna zadržala kontekst utakmice i prethodno unesene podatke.
- Zadržati topao i prijateljski hrvatski stil, ali bez pretjerane sigurnosti i bez izraza koji umanjuju profesionalnost analize.
- Poboljšati poruku greške tako da pokaže koji su dostupni AI izvori zakazali, umjesto jedne neodređene poruke.

## Tehničke pojedinosti
- Uskladiti `askAi` s postojećim pozivom iz chat stranice, privicima i Turbo postavkom.
- Ponovno povezati postojeće module `consensus`, `omni`, `goalformula`, `htft` i sigurnosne filtre kroz njihove postojeće javne funkcije.
- Pomoćne izračune pokretati paralelno i ograničiti čekanje; kvar jednog pomoćnog izvora ne smije zaustaviti završni odgovor.
- Provjeriti TypeScript, glavne stranice i stvarni chat tok bez otkrivanja korisničkih ključeva.

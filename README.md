# Haastattelupolku – testiversio

Oppisopimustäyttäjän haastattelupolun klikattava testiversio. Vasemmalla on sovellus
(haastattelu ja siirto Wilmaan), oikealla Chrome-paneeli, jossa toimii **synteettinen Wilma**.
Kapeassa ikkunassa näkymät ovat välilehdillä Sovellus ja Wilma.

Siirrossa sovellus täyttää Wilman lomakkeen, sinä painat Wilman omaa Tallenna-painiketta, ja
sovellus lukee tallennetun tiedon takaisin ja vertaa sitä haastattelussa hyväksyttyyn. Sovellus ei
koskaan paina Tallenna-painiketta itse.

## Tärkeää

- **Kaikki tiedot ovat keksittyjä.** Henkilöt, opiskelijanumerot, yritykset, Y-tunnukset,
  ohjaajat ja lomakkeiden numerot on keksitty. Tämä ei ole oikea Wilma eikä ota yhteyttä
  mihinkään Wilmaan.
- **Tallennukset ovat vain selaimen muistissa.** Mitään ei lähetetä palvelimelle. Sivun
  uudelleenlataus tai ”Palauta alkutilaan” aloittaa alusta.
- Synteettinen Wilma on Python-ohjelma, joka ajetaan selaimessa Pyodidella
  (cdn.jsdelivr.net, Pyodide 0.26.4). Ensimmäinen lataus kestää hetken.

## Mikä toimii oikeasti, mikä on simuloitu

| Lomake | Synteettisessä Wilmassa |
|---|---|
| Opiskelijan sidonta | Haku opiskelijalistasta sukunimellä; samannimiset valitaan käsin |
| Henkilökohtaistaminen | Simuloitu (lomaketta ei ole) |
| Työpaikka | Rekisterihaku Y-tunnuksella; puuttuva lisätään lomakkeella |
| Työpaikkaohjaaja | Haku nimellä; puuttuva lisätään työpaikan alle |
| Oppisopimus | Lomake avataan ja haut tehdään, tallennus simuloitu |
| Tutkintokoulutuksen suunnittelu | Opintopolun lukuvuosi ja jakso |
| Urasuunnitelma | Uusi suunnitelma; olemassa olevaa ei luoda uudelleen |
| Näyttösuunnitelmat | Suunnitelmaosa tutkinnon osittain |

Opintopolku, oppisopimus ja näyttösuunnitelmat vaativat HOPS-puun, joka on vain demohenkilöllä
Virtanen Aino (1101). Muilla nämä kohdat ovat simuloituja.

## Kokeile

1. Valitse **Siirto Wilmaan** ja avaa *Aino Virtanen* (”Tarkista Wilmasta”).
2. Hae opiskelijana. Wilmassa on kaksi Virtanen Ainoa: valitse se, jonka tutkinto täsmää.
3. Etene lomake kerrallaan. Kun sovellus on täyttänyt lomakkeen, paina Wilman Tallenna.
   Voit myös muuttaa arvoa Wilmassa ennen tallennusta ja katsoa, miten ero näkyy.

## Klikattava prototyyppi

Pelkkä käyttöliittymä ilman synteettistä Wilmaa: [prototyyppi/](prototyyppi/).

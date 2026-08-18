# Korridor – Installationsanleitung

Dieses Spiel ist eine vollständig eigenständige Web-App: kein Tracking, keine Werbung,
keine Analytics, keine externen Aufrufe. Der komplette Code liegt in `index.html`
(plus `manifest.json`, `service-worker.js` und zwei Icons).

## Option A – Als App-Icon auf dem Homescreen (empfohlen, 5 Minuten)

Damit Android/Chrome eine Seite "installieren" kann, muss sie über `http(s)://`
erreichbar sein (nicht als lokale Datei). Kostenloses Hosting geht am schnellsten so:

1. Gehe auf **https://app.netlify.com/drop** (kein Account nötig).
2. Ziehe den ganzen `quoridor`-Ordner (alle 5 Dateien) in das Browserfenster.
3. Du bekommst eine Adresse wie `https://xyz123.netlify.app`.
4. Öffne diese Adresse auf deinem Android-Handy in **Chrome**.
5. Tippe oben rechts auf die drei Punkte → **„App installieren"** bzw.
   **„Zum Startbildschirm hinzufügen"**.
6. Fertig – das Spiel erscheint als eigenes Icon, startet im Vollbild ohne
   Browser-Leiste und funktioniert danach auch offline (dank Service Worker).

Alternativen zu Netlify Drop: GitHub Pages, Vercel, Cloudflare Pages – alle kostenlos,
alle ohne Werbung oder Datensammlung deinerseits, da du selbst Hoster bist.

## Option B – Eine echte, installierbare APK-Datei

Wenn du lieber eine `.apk`-Datei zum Sideload haben willst statt eines Homescreen-Icons:

1. Hoste die Dateien wie in Option A beschrieben (du brauchst eine URL).
2. Gehe auf **https://www.pwabuilder.com**, gib deine Netlify-URL ein.
3. Wähle **Android-Paket erstellen** → PWABuilder generiert eine signierte `.apk`
   direkt aus deiner App (nutzt Googles offizielles "Trusted Web Activity"-Verfahren,
   keine Fremdwerbung, keine SDKs von Drittanbietern).
4. Lade die APK herunter, übertrage sie aufs Handy und installiere sie
   (dafür einmalig „Installation aus unbekannten Quellen" erlauben).

## Option C – Ganz ohne Internet-Hosting

Falls du keine der Dateien irgendwo hochladen willst:

1. Installiere die kostenlose App **Termux** (F-Droid oder Play Store, ohne Werbung).
2. Kopiere den `quoridor`-Ordner aufs Handy.
3. Starte in Termux: `python -m http.server 8080` im Ordner.
4. Öffne in Chrome `http://localhost:8080`, installiere wie in Option A beschrieben.

## Spielregeln kurz

- Ziel: Erreiche als Erste·r die gegenüberliegende Feldreihe.
- Pro Zug: entweder eine Figur ein Feld ziehen (oder über die gegnerische Figur springen),
  oder eine Mauer setzen (max. 10 pro Spieler), um dem Gegner den Weg zu verlängern.
- Eine Mauer darf nie den letzten möglichen Weg eines Spielers komplett versperren –
  das App prüft das automatisch.

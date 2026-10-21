# Medicine Reminder - for Elders

A big-button medicine reminder designed for elderly people: loud voice alerts in Hindi or English, a taken/missed record, and one-tap emergency call buttons.

**Live app:** https://akash991833.github.io/elderly-medicine-reminder-app/

Free, no sign-up, no ads. Works in the browser, offline after the first visit, and can be installed on your phone. Everything is saved on the device only.

## Features

- Simple Today screen: next dose in large type, one big "Taken" button
- Medicines with dose, food instruction, multiple daily times, start/end dates
- Loud alarm with spoken voice alerts (Hindi or English), vibration and repeat every 30 seconds until answered, with a 10-minute snooze
- Missed-dose marking (after 2 hours) and a 7-day adherence record with a chart, printable for family
- Emergency: one-tap 112 / 108 call buttons, family and doctor contacts, medical info card (blood group, allergies, conditions)
- Text size setting (Normal / Large / Extra large), dark and light mode
- JSON backup and restore

## How to use

1. Open Medicines and add each medicine with its times.
2. Add family contacts on the Emergency tab and fill in the medical information.
3. In Settings, set the elder's name, text size and voice language, and allow notifications.
4. Keep the app open (ideally on charge with "Keep screen on") so the alarm can ring.

## Screenshots

<img src="screenshots/1-today.png" width="240" alt="Today">
<img src="screenshots/3-alert.png" width="240" alt="Medicine alarm">
<img src="screenshots/2-medicines.png" width="240" alt="Medicines">
<img src="screenshots/4-today-progress.png" width="240" alt="Weekly record">
<img src="screenshots/5-emergency.png" width="240" alt="Emergency">

![Desktop view](screenshots/6-desktop.png)

## Good to know (limits)

- A browser cannot ring the alarm while the app is fully closed. Keep the app open, or keep the phone charging with "Keep screen on" turned on. This is a browser limitation, not a setting.
- Hindi voice alerts need a Hindi text-to-speech voice installed on the phone (most Android phones have one).
- This app does not replace a doctor's advice. Take only the medicines your doctor has prescribed.

## Run it yourself

No build step. Clone the repo and open `index.html`, or serve the folder with any static server:

```bash
git clone https://github.com/AKASH991833/elderly-medicine-reminder-app.git
cd elderly-medicine-reminder-app
python3 -m http.server 8080
```

Plain HTML, CSS and JavaScript. No tracking, no external requests.

## Privacy

No account, no server, no analytics. Medicines, contacts and medical notes stay in the browser's local storage on the device.

## License

MIT

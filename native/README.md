# Widgets voor de native app (iPhone en Android)

De widgets halen hun gegevens uit `GET /api/widget?fmt=card&syms=BTC,ETH,SOL` (optioneel `&key=…` voor de oefenportefeuille;
de sleutel maak je in de app bij Instellingen → Widgets). Deze bestanden worden gebruikt zodra de Capacitor-app wordt gebouwd
(`npx cap add ios` / `npx cap add android`). Ze zijn nog niet op een toestel getest: dat kan pas met de store-accounts.

**iPhone:** in Xcode *File → New → Target → Widget Extension*, noem hem `CSAWidget` en vervang de code door `ios/CSAWidget/CSAWidget.swift`.
Zet een App Group `group.nl.rijnstadmarketing.csa` aan om de widgetsleutel te delen.

**Android:** kopieer de bestanden uit `android/` naar het Capacitor-project en voeg in `AndroidManifest.xml` toe:

```xml
<receiver android:name=".PriceWidget" android:exported="false">
  <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE"/></intent-filter>
  <meta-data android:name="android.appwidget.provider" android:resource="@xml/csa_widget_info"/>
</receiver>
```

**Windows 11:** werkt al zonder native app. Installeer CSA in Edge (menu → Apps → Installeren) en voeg de widget toe via het widgetbord.

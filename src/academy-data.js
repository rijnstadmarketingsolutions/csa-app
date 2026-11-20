/* =====================================================================
   Vantis Academy — leerpaden en lesinhoud
   Les: {id, t, min, s:[{h, p:[...], li:[...], tip, w}], q:[[vraag,[antwoorden],goed,uitleg]], go:[href,label]}
   w = interactief onderdeel (zie ACW in ui-v10.js)
   ===================================================================== */
const AC_PATHS=[
  {id:'start',t:'Starten met beleggen',lvl:'Beginner',d:'Wat je moet weten voordat je je eerste euro inlegt: hoe crypto en aandelen werken, hoe je veilig handelt en wat het kost.',L:['basis','aandelen','wallet','koers','kosten','belasting']},
  {id:'grafiek',t:'Grafieken lezen',lvl:'Beginner',d:'Trends, steun en weerstand, candles en indicatoren. Leer kijken naar een grafiek zoals een trader dat doet.',L:['trend','steun','indic','patronen','timeframe','volat']},
  {id:'handel',t:'Handelen in de praktijk',lvl:'Gevorderd',d:'Van idee naar order: een handelsplan, risico per trade, positiegrootte en het bijhouden van je resultaten.',L:['orders','plan','rr','positie','dca','dagboek']},
  {id:'risico',t:'Risico en psychologie',lvl:'Gevorderd',d:'Het verschil tussen winnen en verliezen zit vaak tussen je oren. Leer je risico beheersen en je eigen valkuilen herkennen.',L:['risico','verlies','fomo','biases','scams']},
  {id:'macro',t:'Nieuws, macro en sentiment',lvl:'Gevorderd',d:'Waarom markten bewegen op rente, inflatie en nieuws, en hoe je Vantis gebruikt om dat te volgen.',L:['macro','rente','cijfers','impactscore','sentiment2']},
  {id:'pro',t:'Voor gevorderden',lvl:'Expert',d:'Futures en funding, on-chain data, tokenomics, correlaties en het testen van strategieën.',L:['futures','onchain','tokenomics','correlatie','backtest']}
];

const AC_LESSONS={
/* ---------- Starten met beleggen ---------- */
aandelen:{t:'Wat is een aandeel en hoe werkt de beurs?',min:5,go:['#markten-aandelen','Bekijk aandelen'],s:[
  {h:'Een stukje van een bedrijf',p:["Met een aandeel word je mede-eigenaar van een bedrijf. Gaat het bedrijf beter verdienen, dan wordt het aandeel meestal meer waard. Sommige bedrijven keren een deel van de winst uit aan aandeelhouders: dat heet dividend.","Aandelen worden verhandeld op een beurs, zoals Euronext in Amsterdam of de NYSE en Nasdaq in New York. De koers ontstaat door vraag en aanbod: willen meer mensen kopen dan verkopen, dan stijgt de prijs."]},
  {h:'Handelstijden',p:["Een beurs is niet altijd open. Euronext Amsterdam handelt op werkdagen van 09:00 tot 17:30. De Amerikaanse beurzen zijn open van 15:30 tot 22:00 Nederlandse tijd. Crypto wordt daarentegen 24 uur per dag, 7 dagen per week verhandeld."],tip:'Nieuws dat buiten de handelstijden uitkomt, zie je vaak terug als een koerssprong bij de opening.'},
  {h:'Indexen en ETF\'s',p:["Een index volgt een mandje aandelen, zoals de AEX (25 grote Nederlandse bedrijven) of de S&P 500 (500 grote Amerikaanse bedrijven). Een ETF is een fonds dat je als één aandeel koopt en dat zo’n index volgt. Daarmee spreid je in één keer over veel bedrijven."]},
  {h:'Kernpunten',li:['Een aandeel is een deel van een bedrijf; de koers volgt vraag en aanbod.','Beurzen hebben vaste handelstijden; crypto handelt altijd.','Met een ETF koop je in één keer een hele index.']}],
 q:[['Wat is dividend?',['Een vergoeding voor de beurs','Een uitkering van winst aan aandeelhouders','Een soort transactiekosten'],1,'Dividend is het deel van de winst dat een bedrijf uitkeert aan zijn aandeelhouders.'],
  ['Wanneer zijn de Amerikaanse beurzen open, in Nederlandse tijd?',['09:00–17:30','15:30–22:00','24 uur per dag'],1,'De NYSE en Nasdaq openen om 9:30 lokale tijd, dat is 15:30 bij ons, en sluiten om 22:00 Nederlandse tijd.'],
  ['Wat doet een ETF die de S&P 500 volgt?',['Hij belegt in één Amerikaans bedrijf','Hij volgt de 500 grote Amerikaanse bedrijven uit de index','Hij belegt alleen in crypto'],1,'Een index-ETF koopt de bedrijven uit de index, zodat jij met één aankoop over al die bedrijven spreidt.']]},

wallet:{t:'Exchanges, wallets en veiligheid',min:6,go:['#instellingen','Naar je beveiliging'],s:[
  {h:'Exchange of eigen wallet',p:["Bij een exchange (handelsplatform) bewaart het platform je crypto voor jou. Dat is makkelijk, maar je vertrouwt erop dat het platform veilig en solvabel is. Met een eigen wallet bewaar je de sleutels zelf.","Een eigen wallet geeft je een herstelzin (seed phrase) van 12 of 24 woorden. Wie die woorden heeft, heeft je crypto. Schrijf ze op papier, bewaar ze veilig en deel ze nooit, met niemand."],tip:'Geen enkele echte helpdesk vraagt ooit om je herstelzin. Wie dat wel doet, is een oplichter.'},
  {h:'Je account beveiligen',li:['Gebruik een uniek, lang wachtwoord per platform.','Zet tweestapsverificatie aan met een authenticator-app, niet via sms.','Controleer altijd het webadres voordat je inlogt; nepsites lijken vaak sprekend op het origineel.','Klik niet op links in onverwachte mails of berichten over je account.']},
  {h:'Hardware wallet',p:["Een hardware wallet is een klein apparaat dat je sleutels offline bewaart. Het is de veiligste manier voor bedragen die je lang wilt aanhouden. Voor actief handelen houden de meeste mensen een deel op een betrouwbare exchange."]},
  {h:'Kernpunten',li:['Op een exchange bewaart het platform je crypto; in een eigen wallet doe je dat zelf.','Je herstelzin is je crypto: deel hem nooit.','Tweestapsverificatie met een app is een minimale beveiliging.']}],
 q:[['Iemand van de “support” vraagt om je herstelzin om je account te herstellen. Wat doe je?',['Ik geef hem, het is de helpdesk','Ik geef hem nooit: dit is oplichting','Ik geef alleen de eerste zes woorden'],1,'Met je herstelzin kan iemand al je crypto overmaken. Echte supportmedewerkers vragen er nooit om.'],
  ['Welke tweestapsverificatie is het veiligst?',['Via sms','Via een authenticator-app','Geen, een sterk wachtwoord is genoeg'],1,'Sms kan worden onderschept met een simkaartfraude. Een authenticator-app is veel lastiger te misbruiken.'],
  ['Waarvoor is een hardware wallet het meest geschikt?',['Voor bedragen die je lang wilt aanhouden','Voor snel en vaak handelen','Om belasting te besparen'],0,'Een hardware wallet bewaart je sleutels offline. Dat is ideaal voor langdurig bewaren, maar minder handig voor dagelijks handelen.']]},

kosten:{t:'Kosten, spread en slippage',min:5,w:'fees',go:['#handel','Bekijk een orderticket'],s:[
  {h:'Transactiekosten',p:["Bijna elk platform rekent een vergoeding per transactie, vaak een percentage van het bedrag, zoals 0,15% tot 0,25%. Bij een aankoop van € 1.000 betaal je dan € 1,50 tot € 2,50. Bij verkoop betaal je opnieuw."]},
  {h:'Spread en slippage',p:["De spread is het verschil tussen de hoogste biedprijs en de laagste laatprijs. Koop je direct (een marktorder), dan betaal je de laatprijs. Bij munten met weinig handel kan de spread groot zijn.","Slippage ontstaat als je order groter is dan wat er tegen de beste prijs beschikbaar is. Een deel wordt dan tegen een slechtere prijs uitgevoerd. Een limietorder voorkomt dat: je bepaalt zelf de maximale prijs."]},
  {h:'Kosten tellen op',p:["Wie vaak handelt, betaalt vaak. Twee trades per dag met 0,25% kosten per transactie kosten je over een jaar al snel meer dan je hele inleg. Reken het hieronder zelf uit."]},
  {h:'Kernpunten',li:['Kosten worden bij aan- én verkoop gerekend.','Spread en slippage zijn verborgen kosten; met limietorders beperk je ze.','Hoe vaker je handelt, hoe zwaarder kosten wegen.']}],
 q:[['Wat is de spread?',['De transactiekosten van het platform','Het verschil tussen bied- en laatprijs','De koersstijging van vandaag'],1,'De spread is het verschil tussen wat kopers bieden en wat verkopers vragen.'],
  ['Hoe beperk je slippage?',['Met een marktorder','Met een limietorder','Door vaker te handelen'],1,'Met een limietorder stel je zelf de prijs in waarop je maximaal koopt of minimaal verkoopt.'],
  ['Je koopt voor € 1.000 en verkoopt meteen weer, met 0,25% kosten per transactie. Wat ben je ongeveer kwijt?',['€ 0,25','€ 2,50','€ 5'],2,'Je betaalt twee keer 0,25% van ongeveer € 1.000: samen zo’n € 5.']]},

belasting:{t:'Belasting op beleggingen in Nederland',min:4,go:['#portefeuille','Naar je portefeuille'],s:[
  {h:'Box 3',p:["Particuliere beleggers in Nederland betalen meestal geen belasting per transactie. Aandelen, ETF’s en crypto vallen in box 3: sparen en beleggen. De Belastingdienst kijkt naar de waarde van je bezittingen op 1 januari, de peildatum.","Over je vermogen boven het heffingsvrije bedrag betaal je belasting op een (veronderstelde of werkelijke) opbrengst. De regels en bedragen veranderen de laatste jaren regelmatig."],tip:'Noteer elk jaar de waarde van je bezit op 1 januari. Dat heb je nodig voor je aangifte.'},
  {h:'Uitzonderingen',p:["Handel je zo veel en zo professioneel dat het lijkt op werk, dan kan de Belastingdienst je resultaten zien als inkomen uit overige werkzaamheden (box 1). Dat is uitzonderlijk, maar goed om te weten."]},
  {h:'Kernpunten',li:['Beleggingen en crypto vallen meestal in box 3.','De waarde op 1 januari is bepalend.','Kijk voor de actuele regels op belastingdienst.nl of vraag een belastingadviseur.']}],
 q:[['Welke datum is bepalend voor box 3?',['1 januari','31 december','De dag dat je verkoopt'],0,'Box 3 kijkt naar de waarde van je bezittingen op 1 januari van het belastingjaar.'],
  ['Betaal je als particulier belasting bij elke verkoop met winst?',['Ja, altijd','Meestal niet: je vermogen valt in box 3','Alleen bij crypto'],1,'In Nederland wordt bij gewone beleggers geen belasting per transactie geheven; het vermogen valt in box 3.'],
  ['Waar vind je de actuele regels?',['Op social media','Bij de Belastingdienst of een adviseur','In de koersgrafiek'],1,'De regels veranderen regelmatig. De Belastingdienst en een belastingadviseur hebben de actuele informatie.']]},

/* ---------- Grafieken lezen ---------- */
trend:{t:'Trends herkennen',min:5,w:'trend',go:['#asset-btc','Bekijk de trend van Bitcoin'],s:[
  {h:'Hogere toppen, hogere bodems',p:["Een stijgende trend herken je aan hogere toppen en hogere bodems: elke terugval stopt hoger dan de vorige. Bij een dalende trend is het omgekeerd: lagere toppen en lagere bodems. Daartussen zit een zijwaartse markt zonder duidelijke richting."]},
  {h:'Voortschrijdende gemiddelden',p:["Een voortschrijdend gemiddelde (SMA) middelt de slotkoersen van de laatste dagen. Ligt de koers boven het 20- en 50-daags gemiddelde, en ligt het 20-daags gemiddelde boven het 50-daags, dan is de trend op korte termijn omhoog.","Kruist een korter gemiddelde een langer gemiddelde naar boven, dan spreken traders van een golden cross; naar beneden heet het een death cross. Het zijn signalen achteraf, geen voorspellingen."]},
  {h:'Met de trend mee',p:["Veel traders handelen liever met de trend mee dan ertegenin. Een trend kan lang aanhouden, maar ook plotseling breken. Daarom combineer je een trend altijd met een plan voor als het tegenvalt."],tip:'Kijk hieronder naar de echte grafiek: ligt de koers boven of onder de gemiddelden?'},
  {h:'Kernpunten',li:['Stijgende trend: hogere toppen en hogere bodems.','Gemiddelden maken de richting zichtbaar.','Een trend is geen garantie: houd altijd rekening met een omslag.']}],
 q:[['Wat kenmerkt een dalende trend?',['Hogere toppen en hogere bodems','Lagere toppen en lagere bodems','Een vlakke lijn'],1,'In een dalende trend stopt elke opleving lager dan de vorige.'],
  ['Wat is een golden cross?',['Een korter gemiddelde kruist een langer gemiddelde naar boven','De koers raakt een rond getal','Een dag met extreem veel volume'],0,'Bij een golden cross stijgt het kortere gemiddelde boven het langere, een teken dat de trend omhoog is gedraaid.'],
  ['Zijn voortschrijdende gemiddelden voorspellend?',['Ja, ze voorspellen de toekomst','Nee, ze vatten het verleden samen','Alleen bij aandelen'],1,'Gemiddelden zijn gebaseerd op koersen uit het verleden. Ze helpen de richting te zien, maar voorspellen niets.']]},

steun:{t:'Steun en weerstand',min:5,w:'sr',go:['#asset-btc','Bekijk de niveaus bij Bitcoin'],s:[
  {h:'Zones waar kopers en verkopers reageren',p:["Steun is een prijsgebied waar een daling eerder stopte, omdat kopers daar instapten. Weerstand is een gebied waar een stijging eerder stopte, omdat verkopers daar winst namen. Zie ze als zones, niet als exacte prijzen."]},
  {h:'Rollen die omdraaien',p:["Breekt de koers door een weerstand, dan wordt die oude weerstand vaak de nieuwe steun. Hetzelfde geldt andersom. Een uitbraak met hoog volume is overtuigender dan een uitbraak met weinig handel.","Ronde getallen, zoals € 50.000 of € 100.000, werken vaak als psychologische steun of weerstand."]},
  {h:'Hoe Vantis helpt',p:["Op elke assetpagina tekent Vantis automatisch de belangrijkste niveaus van de laatste 30 dagen in de grafiek, en de scanner meldt uitbraken boven het 30-daags hoogste punt."]},
  {h:'Kernpunten',li:['Steun: waar kopers eerder instapten. Weerstand: waar verkopers eerder verkochten.','Een gebroken weerstand wordt vaak steun.','Uitbraken met volume zijn sterker.']}],
 q:[['Wat gebeurt er vaak met een weerstand nadat de koers erdoorheen breekt?',['Hij verdwijnt','Hij wordt steun','Hij wordt sterker als weerstand'],1,'Wie eerder bij die prijs verkocht, koopt vaak terug op hetzelfde niveau. Zo wordt oude weerstand nieuwe steun.'],
  ['Welke uitbraak is het meest overtuigend?',['Met weinig volume','Met hoog volume','In het weekend'],1,'Hoog volume betekent dat veel handelaren de nieuwe prijs accepteren.'],
  ['Waarom werken ronde getallen vaak als niveau?',['Omdat veel mensen daar orders plaatsen','Omdat de beurs daar sluit','Dat is toeval'],0,'Veel handelaren zetten koop- en verkooporders rond ronde getallen. Daardoor reageert de koers er vaak op.']]},

patronen:{t:'Candlestickpatronen',min:6,w:'candle',go:['#asset-btc','Bekijk de candles van Bitcoin'],s:[
  {h:'Eén candle vertelt een verhaal',p:["Een candle laat de opening, het hoogste punt, het laagste punt en de slotkoers zien. Het lijfje (de body) loopt van opening naar slot; de lonten (wicks) tonen de uitersten. Een lange onderste lont betekent dat verkopers de koers omlaag duwden, maar kopers hem weer omhoog kregen."]},
  {h:'Bekende patronen',li:['Doji: opening en slot liggen bijna gelijk. Kopers en verkopers houden elkaar in evenwicht.','Hamer: kleine body met een lange onderste lont, na een daling. Kopers grepen in.','Engulfing: een candle die de body van de vorige volledig omsluit, in de tegenovergestelde kleur. Teken van een mogelijke omslag.']},
  {h:'Context is alles',p:["Een patroon zegt weinig als het los staat. Een hamer op een sterke steun na een lange daling betekent meer dan een hamer midden in een zijwaartse markt. Wacht op bevestiging: de volgende candle moet de richting ondersteunen."],tip:'Zie candlepatronen als een aanwijzing, nooit als een zeker signaal.'},
  {h:'Kernpunten',li:['De body loopt van opening naar slot; lonten tonen de uitersten.','Doji, hamer en engulfing zijn bekende omslagpatronen.','Kijk altijd naar de plek in de grafiek en wacht op bevestiging.']}],
 q:[['Wat betekent een lange onderste lont?',['Kopers duwden de koers terug omhoog','De beurs was gesloten','Er was geen handel'],0,'De koers zakte tijdelijk diep, maar kopers stapten in en de slotkoers kwam veel hoger uit.'],
  ['Wat kenmerkt een doji?',['Een heel grote groene body','Opening en slot liggen bijna gelijk','Een gat tussen twee candles'],1,'Bij een doji eindigt de periode ongeveer waar hij begon: evenwicht tussen kopers en verkopers.'],
  ['Wanneer zegt een hamer het meest?',['Midden in een zijwaartse markt','Na een daling, op een steunniveau','Op elk moment evenveel'],1,'Een hamer is een mogelijk omslagsignaal; dat is vooral betekenisvol na een daling op een belangrijke steun.']]},

timeframe:{t:'Tijdsframes: van uur tot week',min:4,go:['#asset-btc','Wissel tussen 24 uur en 30 dagen'],s:[
  {h:'Elke tijdschaal een ander verhaal',p:["Op een uurgrafiek kan Bitcoin dalen, terwijl de weekgrafiek een stijgende trend toont. Beide zijn waar. Het tijdsframe dat je kiest moet passen bij hoe lang je een positie wilt aanhouden."]},
  {h:'Van groot naar klein',p:["Veel traders analyseren van boven naar beneden: eerst de week- of daggrafiek voor de grote trend, dan een kleiner tijdsframe om een moment te kiezen. Signalen op een hoger tijdsframe wegen zwaarder dan signalen op een lager tijdsframe."]},
  {h:'Ruis',p:["Hoe kleiner het tijdsframe, hoe meer toevallige bewegingen (ruis). Wie op minutengrafieken handelt, krijgt veel signalen die niets betekenen en betaalt veel transactiekosten."]},
  {h:'Kernpunten',li:['Kies een tijdsframe dat past bij je beleggingsduur.','Bepaal de trend op een hoger tijdsframe.','Kleine tijdsframes bevatten veel ruis.']}],
 q:[['Je wilt een positie enkele weken aanhouden. Welk tijdsframe is het belangrijkst?',['De minutengrafiek','De dag- en weekgrafiek','Het tijdsframe maakt niet uit'],1,'Voor posities van weken is de dag- en weekgrafiek leidend; minutenbewegingen zijn dan vooral ruis.'],
  ['Wat betekent top-down analyseren?',['Eerst het grote tijdsframe, dan het kleine','Alleen naar de hoogste koers kijken','Van de duurste naar de goedkoopste munt'],0,'Je bepaalt eerst de grote richting en zoekt daarna op een kleiner tijdsframe een goed moment.'],
  ['Wat is het nadeel van handelen op heel kleine tijdsframes?',['Te weinig signalen','Veel ruis en hoge kosten','Je ziet geen candles'],1,'Kleine tijdsframes geven veel toevallige signalen, en vaak handelen kost veel.']]},

volat:{t:'Volatiliteit meten',min:5,w:'atr',go:['#marktdata','Naar Marktdata'],s:[
  {h:'Hoe wild beweegt een koers?',p:["Volatiliteit meet hoe sterk een koers schommelt. Vantis berekent die als de gemiddelde dagelijkse beweging over 30 dagen. Bitcoin beweegt vaak 2 tot 3% per dag, kleine munten soms meer dan 8%."]},
  {h:'ATR en Bollinger Bands',p:["De Average True Range (ATR) is de gemiddelde afstand tussen het hoogste en laagste punt per dag, inclusief gaten tussen dagen. Bollinger Bands liggen twee standaarddeviaties boven en onder het 20-daags gemiddelde: als de banden smal worden, volgt vaak een grotere beweging."]},
  {h:'Volatiliteit en je stop-loss',p:["Een stop-loss die dichter bij de koers staat dan de normale dagbeweging, wordt vaak geraakt door gewone schommelingen. Veel traders zetten hun stop daarom op 1,5 tot 2 keer de ATR. Hoe groter de volatiliteit, hoe kleiner je positie moet zijn om hetzelfde risico te lopen."],tip:'Gebruik de rekenhulp hieronder om te zien hoe ver je stop zou moeten staan.'},
  {h:'Kernpunten',li:['Volatiliteit is de gemiddelde schommeling van een koers.','ATR helpt je stop-loss buiten de normale ruis te zetten.','Meer volatiliteit betekent een kleinere positie bij gelijk risico.']}],
 q:[['Wat betekent een hoge volatiliteit?',['De koers schommelt sterk','De koers stijgt zeker','Er is weinig handel'],0,'Volatiliteit zegt iets over de grootte van de bewegingen, niet over de richting.'],
  ['Waarom zet je een stop-loss niet te dicht bij de koers?',['Omdat gewone schommelingen hem dan raken','Omdat dat niet mag','Omdat de kosten dan hoger zijn'],0,'Staat je stop binnen de normale dagbeweging, dan word je vaak uitgestopt door ruis.'],
  ['Wat gebeurt er vaak na smalle Bollinger Bands?',['Een grotere beweging','De beurs sluit','Niets'],0,'Smalle banden wijzen op een rustige periode; daarna volgt vaak een uitbraak, de richting is onbekend.']]},

/* ---------- Handelen in de praktijk ---------- */
plan:{t:'Een handelsplan maken',min:5,go:['#handel','Naar Handelen'],s:[
  {h:'Beslis vóór je instapt',p:["Een handelsplan schrijf je voordat je een order plaatst, als je nog rustig kunt nadenken. Na het instappen nemen emoties het vaak over. Het plan beantwoordt een paar vaste vragen."]},
  {h:'De vijf vragen',li:['Waarom stap ik in? (de reden of setup)','Waar stap ik in? (instapprijs)','Wanneer heb ik ongelijk? (stop-loss: de prijs waarop het idee niet meer klopt)','Waar neem ik winst? (koersdoel)','Hoe groot is mijn positie? (op basis van het risico dat ik accepteer)']},
  {h:'Als-dan',p:["Formuleer je plan als als-dan-regels: “Als de koers sluit boven € 60.000 met hoog volume, dan koop ik. Als hij daarna onder € 57.000 sluit, dan verkoop ik.” Zo weet je precies wat je doet, ook als het spannend wordt."],tip:'In Vantis zet je stop-loss en winstdoel direct bij je order, en schrijf je je reden in de notitie.'},
  {h:'Kernpunten',li:['Maak je plan vóór je instapt.','Bepaal altijd vooraf waar je ongelijk hebt.','Schrijf je plan op in als-dan-regels.']}],
 q:[['Wanneer maak je een handelsplan?',['Nadat de koers is gedaald','Voordat je een order plaatst','Aan het eind van het jaar'],1,'Vooraf denk je rationeel na; tijdens een trade nemen emoties het makkelijk over.'],
  ['Wat bepaal je met de stop-loss in je plan?',['Waar je winst neemt','Waar je idee niet meer klopt','Hoeveel kosten je betaalt'],1,'De stop-loss is de prijs waarop je toegeeft dat je ongelijk had, voordat het verlies groter wordt.'],
  ['Wat is een voorbeeld van een als-dan-regel?',['“Ik denk dat het stijgt”','“Als de koers boven € 60.000 sluit, dan koop ik”','“Ik zie wel”'],1,'Een als-dan-regel beschrijft precies welke situatie tot welke actie leidt.']]},

rr:{t:'Risico, rendement en je winkans',min:6,w:'rr',go:['#handel','Zet een winstdoel en stop-loss'],s:[
  {h:'Risico tegenover beloning',p:["Stel: je koopt op € 100, je stop-loss staat op € 95 en je koersdoel op € 110. Je riskeert € 5 om € 10 te verdienen: een verhouding van 1 op 2. Traders noemen het risico per trade ook wel 1R; deze trade levert dan 2R op als het doel wordt geraakt."]},
  {h:'Hoe vaak moet je gelijk hebben?',p:["Bij een verhouding van 1 op 2 hoef je maar iets meer dan één op de drie trades te winnen om quitte te spelen (zonder kosten). De formule: benodigde winkans = 1 ÷ (1 + verhouding). Bij 1 op 1 is dat 50%, bij 1 op 3 is dat 25%."]},
  {h:'Verwachte waarde',p:["De verwachte waarde per trade is: winkans × gemiddelde winst − verlieskans × gemiddeld verlies. Is die positief, dan verdien je op de lange termijn, ook al verlies je veel losse trades. Professionele traders verliezen vaak meer dan de helft van hun trades, maar houden verliezen klein en laten winsten lopen."],tip:'Probeer de rekenhulp hieronder met je eigen instap, stop en doel.'},
  {h:'Kernpunten',li:['Vergelijk altijd wat je riskeert met wat je kunt verdienen.','Met een goede verhouding hoef je niet vaak gelijk te hebben.','Een positieve verwachte waarde telt, niet het aantal winnende trades.']}],
 q:[['Instap € 50, stop € 48, doel € 56. Wat is de verhouding?',['1 op 2','1 op 3','1 op 6'],1,'Je riskeert € 2 om € 6 te verdienen: 6 ÷ 2 = 3, dus 1 op 3.'],
  ['Welke winkans heb je minimaal nodig bij een verhouding van 1 op 2?',['Ongeveer 33%','50%','67%'],0,'1 ÷ (1 + 2) = 0,33. Je moet dus ongeveer één op de drie trades winnen om quitte te spelen.'],
  ['Kun je winstgevend zijn als je de helft van je trades verliest?',['Nee, nooit','Ja, als je winsten groter zijn dan je verliezen','Alleen met crypto'],1,'Als je gemiddelde winst groter is dan je gemiddelde verlies, kan je verwachte waarde positief zijn.']]},

positie:{t:'Hoe groot moet je positie zijn?',min:6,w:'pos',go:['#handel','Naar Handelen'],s:[
  {h:'Begin bij het risico, niet bij het bedrag',p:["De vraag is niet “hoeveel koop ik?”, maar “hoeveel wil ik maximaal verliezen als ik ongelijk heb?”. Veel ervaren traders riskeren per trade 1 tot 2% van hun totale kapitaal."]},
  {h:'De berekening',p:["Positiegrootte = (kapitaal × risicopercentage) ÷ (instapprijs − stop-loss).","Voorbeeld: je hebt € 10.000 en riskeert 1%, dus € 100. Je koopt op € 50 met een stop op € 45: € 5 risico per stuk. Je koopt dan 100 ÷ 5 = 20 stuks, samen € 1.000. Wordt je stop geraakt, dan verlies je € 100 plus kosten."]},
  {h:'Waarom dit werkt',p:["Met 1% risico per trade kun je tien keer op rij ongelijk hebben en heb je nog steeds ongeveer 90% van je kapitaal. Wie per trade de helft inzet, is na twee pechtrades het grootste deel kwijt."],tip:'Let op: bij een koersgat (bijvoorbeeld na slecht nieuws) kan je stop-loss lager worden uitgevoerd dan ingesteld.'},
  {h:'Kernpunten',li:['Bepaal eerst je maximale verlies per trade, bijvoorbeeld 1% van je kapitaal.','Positie = risicobedrag ÷ afstand tot je stop.','Kleine risico’s per trade houden je in het spel.']}],
 q:[['Kapitaal € 5.000, risico 2%, instap € 20, stop € 18. Hoeveel stuks koop je?',['25','50','100'],1,'2% van € 5.000 is € 100. Het risico per stuk is € 2. 100 ÷ 2 = 50 stuks.'],
  ['Waarom kiezen veel traders 1–2% risico per trade?',['Zo overleef je een reeks verliezen','Omdat het verplicht is','Omdat de kosten dan lager zijn'],0,'Met een klein risico per trade blijft je kapitaal grotendeels intact, ook na meerdere verliezen achter elkaar.'],
  ['Kan een stop-loss lager worden uitgevoerd dan ingesteld?',['Nee, nooit','Ja, bij een koersgat of snelle markt','Alleen bij aandelen'],1,'Een stop-loss wordt een marktorder zodra de prijs is bereikt. Springt de koers voorbij die prijs, dan word je lager uitgevoerd.']]},

dagboek:{t:'Een handelsdagboek bijhouden',min:4,go:['#handel','Schrijf een notitie bij je order'],s:[
  {h:'Leren van je eigen trades',p:["Een handelsdagboek is de snelste manier om beter te worden. Schrijf bij elke trade op waarom je instapte, wat je plan was en hoe je je voelde. Na afloop noteer je wat er gebeurde en of je je aan je plan hield."]},
  {h:'Wat je noteert',li:['Reden en setup (bijvoorbeeld: uitbraak boven weerstand met hoog volume).','Instap, stop-loss en doel.','Je gevoel: rustig, haastig, angstig, hebberig.','Resultaat en wat je de volgende keer anders doet.']},
  {h:'Evalueer elke maand',p:["Kijk één keer per maand terug. Welke setups werkten? Waar week je af van je plan? Vaak zie je patronen: misschien verlies je vooral op trades die je impulsief nam, of verkoop je winnaars te vroeg."]},
  {h:'Kernpunten',li:['Noteer bij elke trade je reden, plan en gevoel.','Evalueer maandelijks en zoek patronen.','Pas je regels aan op basis van wat je ziet.']}],
 q:[['Wat is het belangrijkste doel van een dagboek?',['Je trades kunnen laten zien','Leren van je eigen beslissingen','Belasting besparen'],1,'Een dagboek laat zien welke beslissingen werken en welke niet, zodat je je aanpak verbetert.'],
  ['Waarom noteer je ook je gevoel?',['Omdat emoties je beslissingen beïnvloeden','Dat is niet nodig','Voor de grafiek'],0,'Veel slechte trades komen voort uit haast, angst of hebzucht. Door dat te noteren, herken je het patroon.'],
  ['Hoe vaak evalueer je je dagboek?',['Nooit','Regelmatig, bijvoorbeeld maandelijks','Alleen na een grote winst'],1,'Regelmatig terugkijken maakt patronen zichtbaar die je per trade niet ziet.']]},

/* ---------- Risico en psychologie ---------- */
verlies:{t:'De wiskunde van verlies',min:4,w:'recovery',go:['#portefeuille','Naar je portefeuille'],s:[
  {h:'Herstellen is zwaarder dan verliezen',p:["Daalt je inleg 50%, dan moet hij daarna 100% stijgen om weer op het beginpunt te komen. Van € 1.000 naar € 500 is −50%; van € 500 terug naar € 1.000 is +100%."]},
  {h:'Hoe het oploopt',li:['−10% vraagt +11% om te herstellen.','−25% vraagt +33%.','−50% vraagt +100%.','−75% vraagt +300%.']},
  {h:'Wat dit betekent',p:["Grote verliezen zijn veel moeilijker in te halen dan kleine. Daarom is het beperken van verliezen belangrijker dan het najagen van grote winsten. Een stop-loss en een verstandige positiegrootte zijn je belangrijkste gereedschap."],tip:'Schuif met de regelaar hieronder en zie hoeveel stijging je nodig hebt na een verlies.'},
  {h:'Kernpunten',li:['Benodigde stijging = 1 ÷ (1 − verlies) − 1.','Hoe groter het verlies, hoe onevenredig zwaarder het herstel.','Verliezen beperken is de basis van overleven als trader.']}],
 q:[['Je portefeuille daalt 50%. Hoeveel moet hij stijgen om terug te komen?',['50%','75%','100%'],2,'Van € 500 naar € 1.000 is een verdubbeling: +100%.'],
  ['Hoeveel stijging heb je nodig na −20%?',['20%','25%','40%'],1,'1 ÷ 0,8 − 1 = 0,25, dus +25%.'],
  ['Wat is de belangrijkste les?',['Grote winsten najagen','Verliezen klein houden','Nooit verkopen'],1,'Omdat herstel onevenredig zwaar is, loont het om verliezen vroeg te begrenzen.']]},

fomo:{t:'FOMO, FUD en hebzucht',min:5,go:['#nieuws','Naar het nieuws'],s:[
  {h:'FOMO',p:["Fear of missing out: de angst om iets mis te lopen. Een munt stijgt 40% op een dag, iedereen praat erover en je wilt erbij zijn. Precies dan is de kans groot dat je koopt nadat de beste stijging al voorbij is."]},
  {h:'FUD',p:["Fear, uncertainty and doubt: angst, onzekerheid en twijfel, vaak aangewakkerd door negatief nieuws of geruchten. FUD kan leiden tot paniekverkopen op het laagste punt. Controleer of het nieuws klopt en hoe betrouwbaar de bron is."],tip:'Vantis laat bij elk nieuwsbericht de bron en het label zien: feit, verwachting, gerucht of speculatie.'},
  {h:'Hebzucht en angst',p:["Hebzucht laat je winsten te lang vasthouden of je positie te groot maken. Angst laat je te vroeg verkopen. Een plan dat je vooraf maakt, met vaste stop en doel, haalt de emotie uit je beslissingen."]},
  {h:'Kernpunten',li:['FOMO laat je te laat kopen, FUD laat je te vroeg verkopen.','Controleer nieuws en bronnen voordat je handelt.','Een vooraf gemaakt plan beschermt je tegen je emoties.']}],
 q:[['Een munt stijgt 50% in een dag en iedereen praat erover. Wat is het risico?',['Geen, het stijgt toch','Je koopt laat, vaak dicht bij een top','De munt kan niet meer dalen'],1,'Na een grote stijging kopen veel late instappers, juist als vroege kopers winst nemen.'],
  ['Wat betekent FUD?',['Angst, onzekerheid en twijfel','Een soort order','Een munt'],0,'FUD staat voor fear, uncertainty and doubt: negatieve stemming die tot paniek kan leiden.'],
  ['Wat helpt het best tegen emotionele beslissingen?',['Vaker op de koers kijken','Een vooraf gemaakt plan met stop en doel','Grotere posities'],1,'Met een plan neem je beslissingen als je nog rustig bent, niet midden in de spanning.']]},

biases:{t:'Denkfouten van beleggers',min:5,go:['#handel','Bekijk je logboek'],s:[
  {h:'Je brein speelt spelletjes',p:["Mensen zijn niet gemaakt voor de beurs. Onderzoekers als Daniel Kahneman en Amos Tversky lieten zien dat we voorspelbare denkfouten maken. Wie ze kent, kan ze herkennen."]},
  {h:'De bekendste',li:['Bevestigingsdrang: je zoekt vooral nieuws dat je eigen idee bevestigt.','Verliesaversie: een verlies voelt ongeveer twee keer zo zwaar als een even grote winst. Daardoor houden mensen verliezers te lang vast.','Overmoed: na een paar winsten denk je dat je het snapt en neem je te veel risico.','Ankeren: je blijft hangen aan een eerdere prijs, zoals je aankoopprijs.','Recentheid: wat net gebeurde, lijkt belangrijker dan het is.']},
  {h:'Wat je eraan doet',p:["Zoek bewust naar argumenten tegen je idee. Bepaal je stop-loss vooraf en verplaats hem niet omlaag. Kijk in je dagboek of je patronen herkent."]},
  {h:'Kernpunten',li:['Iedereen maakt denkfouten; het gaat erom ze te herkennen.','Verliesaversie maakt dat we verliezers te lang houden.','Zoek actief naar tegenargumenten.']}],
 q:[['Je koopt op € 100, de koers staat op € 70 en je wacht tot hij “terug” is op € 100. Welke denkfout is dit?',['Ankeren aan je aankoopprijs','Recentheid','Diversificatie'],0,'De markt weet niet wat jij betaalde. Je aankoopprijs zegt niets over waar de koers heen gaat.'],
  ['Wat is verliesaversie?',['Een verlies voelt zwaarder dan een even grote winst','Je verliest nooit','Je verkoopt winnaars te laat'],0,'Uit onderzoek blijkt dat verlies ongeveer twee keer zo zwaar voelt als winst. Daardoor nemen mensen te weinig snel verlies.'],
  ['Hoe ga je bevestigingsdrang tegen?',['Alleen positieve analisten volgen','Bewust zoeken naar argumenten tegen je idee','Minder lezen'],1,'Door actief tegenargumenten te zoeken, zie je risico’s die je anders mist.']]},

scams:{t:'Oplichting herkennen',min:5,go:['#nieuws','Naar het nieuws'],s:[
  {h:'Te mooi om waar te zijn',p:["Gegarandeerd rendement bestaat niet bij beleggen. Wie dat belooft, is vrijwel zeker een oplichter. Hetzelfde geldt voor “vriend van een vriend” die een geheim systeem heeft of een bekende persoon die op social media gratis crypto weggeeft."]},
  {h:'Bekende vormen',li:['Pump & dump: een groep jaagt de koers van een kleine munt op en verkoopt aan de late instappers.','Rug pull: makers van een nieuw project halen het geld eruit en verdwijnen.','Nep-airdrops en -sites: je moet je wallet koppelen of je herstelzin invullen om iets “gratis” te krijgen.','Beleggingsfraude via datingsites of WhatsApp-groepen.']},
  {h:'Hoe je jezelf beschermt',p:["Controleer of een partij een vergunning heeft en kijk op de waarschuwingslijst van de AFM. Deel nooit je herstelzin, koppel je wallet niet aan onbekende sites en wees extra wantrouwig bij haast: “alleen vandaag”."],tip:'Twijfel je? Stop, wacht een dag en vraag iemand om mee te kijken.'},
  {h:'Kernpunten',li:['Gegarandeerd rendement bestaat niet.','Pump & dumps en rug pulls treffen vooral kleine, nieuwe munten.','Controleer vergunningen en de AFM-waarschuwingslijst.']}],
 q:[['Iemand belooft 5% rendement per week, gegarandeerd. Wat is het?',['Een goede kans','Vrijwel zeker oplichting','Een normale belegging'],1,'Geen enkele echte belegging garandeert rendement, laat staan zulke hoge percentages.'],
  ['Wat is een rug pull?',['Een korte koersdaling','Makers halen het geld uit een project en verdwijnen','Een soort order'],1,'Bij een rug pull verdwijnen de makers met het geld van de investeerders.'],
  ['Waar controleer je of een partij bekendstaat als ongeoorloofd?',['Op de waarschuwingslijst van de AFM','In de koersgrafiek','Op social media'],0,'De AFM publiceert waarschuwingen over partijen die zonder vergunning beleggingsdiensten aanbieden.']]},

/* ---------- Nieuws, macro en sentiment ---------- */
rente:{t:'Rente, inflatie en centrale banken',min:6,go:['#radar','Naar de Event Radar'],s:[
  {h:'De prijs van geld',p:["Rente is de prijs van geld. Centrale banken, zoals de Federal Reserve (Fed) in de VS en de Europese Centrale Bank (ECB), stellen de beleidsrente vast. Daarmee sturen ze de economie en de inflatie, die ze rond 2% willen houden."]},
  {h:'Waarom beleggers kijken',p:["Bij een hoge rente levert sparen en lenen aan de overheid meer op, en is geld lenen duurder. Risicovolle beleggingen zoals groeiaandelen en crypto worden dan relatief minder aantrekkelijk. Daalt de rente, dan werkt het vaak andersom."]},
  {h:'Verwachtingen',p:["Markten prijzen verwachte renteveranderingen vaak al in. Een renteverlaging die iedereen verwacht, beweegt de koers weinig. Een verrassing, of een andere toon over de toekomst, beweegt meer."],tip:'In de Event Radar zie je de rentebesluiten met aftelklok en een Impact Score.'},
  {h:'Kernpunten',li:['De Fed en de ECB bepalen de beleidsrente.','Hogere rente drukt vaak op risicovolle beleggingen.','Verrassingen bewegen de markt, niet het verwachte besluit.']}],
 q:[['Welk inflatiedoel hanteren de Fed en de ECB?',['Rond 0%','Rond 2%','Rond 10%'],1,'Beide centrale banken streven naar een inflatie van ongeveer 2% op middellange termijn.'],
  ['Wat gebeurt er vaak met crypto bij een onverwachte renteverhoging?',['Het stijgt','Het daalt','Er gebeurt niets'],1,'Een hogere rente maakt risicovolle beleggingen relatief minder aantrekkelijk. De reactie is vaak negatief.'],
  ['Waarom beweegt een verwacht besluit de koers weinig?',['Het zat al in de prijs','De beurs is dan dicht','Omdat niemand kijkt'],0,'Markten anticiperen. Wat verwacht wordt, is al verwerkt in de koers.']]},

cijfers:{t:'Economische cijfers lezen',min:5,go:['#radar','Bekijk de kalender'],s:[
  {h:'Verwachting tegenover uitkomst',p:["Bij elk cijfer, zoals inflatie (CPI) of het Amerikaanse banenrapport, bestaat een verwachting van economen (de consensus). De markt reageert op het verschil tussen verwachting en uitkomst, niet op het cijfer zelf."]},
  {h:'Buy the rumour, sell the news',p:["Soms stijgt een koers in aanloop naar goed nieuws en daalt hij juist als het nieuws uitkomt. Wie het verwachtte, was al ingestapt en neemt winst. Dit verklaart waarom goed nieuws soms tot een daling leidt."]},
  {h:'Rond de publicatie',p:["Op het moment van publicatie is de beweeglijkheid groot en kan de spread oplopen. Veel traders openen vlak voor belangrijke cijfers geen nieuwe positie, of maken die kleiner."]},
  {h:'Kernpunten',li:['De markt reageert op de verrassing, niet op het cijfer.','Goed nieuws kan tot een daling leiden als het al verwacht was.','Rond publicaties is de markt extra beweeglijk.']}],
 q:[['Inflatie komt uit op 3,0%, verwacht was 3,2%. Hoe reageren aandelen meestal?',['Negatief, inflatie is hoog','Vaak positief, het is lager dan verwacht','Er gebeurt niets'],1,'Lager dan verwacht betekent meer ruimte voor renteverlagingen, wat vaak positief wordt ontvangen.'],
  ['Wat betekent “buy the rumour, sell the news”?',['Kopen op geruchten, verkopen als het nieuws uitkomt','Altijd nieuws volgen','Nooit op nieuws handelen'],0,'Wie vooraf kocht, neemt winst zodra het verwachte nieuws bekend is.'],
  ['Waarom zijn veel traders voorzichtig vlak voor een belangrijk cijfer?',['De markt is dan extra beweeglijk','De beurs is gesloten','Er is geen koers'],0,'Rond publicaties kunnen koersen fel bewegen en spreads oplopen.']]},

impactscore:{t:'Werken met de Impact Score',min:4,go:['#impact','Naar Impact & alerts'],s:[
  {h:'Wat de score meet',p:["Vantis geeft elke gebeurtenis een Impact Score van 0 tot 100. De score zegt hoe groot de invloed op de markt kan zijn, niet in welke richting. Hij is opgebouwd uit vaste factoren, zoals de grootte van de beweging, het handelsvolume, de snelheid en het belang van het bezit."]},
  {h:'Waarom beweegt het?',p:["Bij een opvallende koersbeweging controleert Vantis acht mogelijke oorzaken: nieuws, macrocijfers, sentiment, volume, de hele markt, aandelenmarkten, liquidaties en technische niveaus. Elke oorzaak krijgt ja, nee of ‘geen data’. Kan Vantis de oorzaak niet aantonen, dan staat dat er ook."]},
  {h:'Zo gebruik je het',li:['Stel bij Instellingen in vanaf welke score je een melding wilt.','Lees bij een melding de uitleg en de zekerheid.','Combineer de score met je eigen plan: een hoge score is een reden om te kijken, geen koop- of verkoopsignaal.']},
  {h:'Kernpunten',li:['De Impact Score gaat over grootte, niet over richting.','“Waarom beweegt het?” toetst oorzaken aan data.','Gebruik het als startpunt voor je eigen beoordeling.']}],
 q:[['Een gebeurtenis heeft een Impact Score van 85. Wat betekent dat?',['De koers gaat zeker omhoog','De invloed kan groot zijn, de richting staat er los van','Je moet direct kopen'],1,'De score zegt iets over de mogelijke grootte van de invloed, niet over de richting.'],
  ['Wat doet Vantis als een oorzaak niet kan worden aangetoond?',['Het vult een gok in','Het zegt dat de oorzaak nog onbekend is','Het verbergt de beweging'],1,'Vantis meldt eerlijk dat de oorzaak nog onbekend is in plaats van te gokken.'],
  ['Hoe gebruik je een hoge Impact Score het best?',['Als automatisch koopsignaal','Als reden om de situatie te bekijken','Je negeert hem'],1,'Een hoge score betekent dat er iets belangrijks gebeurt. Wat je ermee doet, bepaal je met je eigen plan.']]},

sentiment2:{t:'Sentiment en contrair denken',min:4,go:['#overzicht','Bekijk het sentiment'],s:[
  {h:'De stemming meten',p:["De Fear & Greed Index meet de stemming in de cryptomarkt op een schaal van 0 (extreme angst) tot 100 (extreme hebzucht). Vantis berekent daarnaast een eigen sentiment uit koersbeweging, trend, volume en de toon van het nieuws."]},
  {h:'Contrair denken',p:["Warren Buffett zei het zo: wees hebzuchtig als anderen angstig zijn, en angstig als anderen hebzuchtig zijn. Bij extreme angst zijn veel verkopers al uitgestapt; bij extreme hebzucht zijn de meeste kopers al binnen."]},
  {h:'Maar pas op',p:["Extreme angst kan lang duren en nog extremer worden. Sentiment is een aanwijzing, geen timingtool. Combineer het met trend, steun en weerstand en je eigen risicoplan."]},
  {h:'Kernpunten',li:['Fear & Greed meet de stemming van 0 tot 100.','Extremen kunnen wijzen op een keerpunt.','Gebruik sentiment nooit als enige reden voor een trade.']}],
 q:[['Wat betekent een Fear & Greed-waarde van 10?',['Extreme hebzucht','Extreme angst','Neutraal'],1,'Een waarde dicht bij 0 betekent extreme angst in de markt.'],
  ['Wat is contrair denken?',['Doen wat iedereen doet','Juist voorzichtig zijn als iedereen enthousiast is','Nooit handelen'],1,'Contraire beleggers gaan tegen de heersende stemming in, omdat extremen vaak bij keerpunten horen.'],
  ['Is extreme angst een betrouwbaar koopmoment?',['Ja, altijd','Nee, het kan nog lang duren','Alleen bij aandelen'],1,'Angst kan aanhouden en verergeren. Sentiment helpt, maar is geen exact timingmiddel.']]},

/* ---------- Voor gevorderden ---------- */
onchain:{t:'On-chain data',min:5,go:['#marktdata','Bekijk het Bitcoin-netwerk'],s:[
  {h:'Alles staat op de blockchain',p:["Omdat de blockchain openbaar is, kun je zien wat er op het netwerk gebeurt. Die gegevens heten on-chain data. Ze geven een beeld van gebruik en gedrag dat bij aandelen niet bestaat."]},
  {h:'Belangrijke signalen',li:['Hashrate: de rekenkracht die het Bitcoin-netwerk beveiligt. Een stijgende hashrate betekent dat miners investeren.','Mempool en transactiekosten: hoe druk het netwerk is.','Instroom naar exchanges: veel munten die naar exchanges gaan, kan wijzen op verkoopplannen.','Grote transacties (walvissen): bewegingen van grote bezitters.']},
  {h:'Voorzichtig interpreteren',p:["On-chain data is waardevol, maar zelden eenduidig. Een grote transactie kan een verkoop zijn, maar ook een interne verplaatsing van een exchange. Combineer het altijd met andere informatie."]},
  {h:'Kernpunten',li:['On-chain data toont wat er op het netwerk gebeurt.','Hashrate, drukte en exchange-stromen zijn veelgebruikte signalen.','Interpreteer voorzichtig: één signaal zegt weinig.']}],
 q:[['Wat meet de hashrate?',['De koers van Bitcoin','De rekenkracht die het netwerk beveiligt','Het aantal gebruikers'],1,'De hashrate is de totale rekenkracht van de miners.'],
  ['Wat kan een grote instroom van munten naar exchanges betekenen?',['Mogelijk verkoopdruk','Zeker een stijging','Niets'],0,'Munten op een exchange kunnen snel worden verkocht. Een grote instroom kan op verkoopplannen wijzen.'],
  ['Waarom moet je voorzichtig zijn met één on-chain signaal?',['Het is vaak niet eenduidig','Het is altijd fout','Het is te duur'],0,'Een transactie kan meerdere verklaringen hebben. Pas in combinatie met andere data wordt het betekenisvol.']]},

tokenomics:{t:'Tokenomics en unlocks',min:5,go:['#marktdata','Bekijk de unlock-kalender'],s:[
  {h:'Vraag en aanbod van een munt',p:["Tokenomics beschrijft hoe een munt is opgebouwd: hoeveel er zijn, hoeveel erbij komen en wie ze bezit. Het aanbod is net zo belangrijk als de vraag."]},
  {h:'Belangrijke begrippen',li:['Circulerend aanbod: munten die nu verhandeld kunnen worden.','Maximaal aanbod: het aantal dat er ooit komt (bij Bitcoin 21 miljoen).','Marktwaarde tegenover volledig verwaterde waarde (FDV): als alle munten in omloop zouden zijn.','Inflatie of uitgifte: hoeveel nieuwe munten er per jaar bijkomen.']},
  {h:'Unlocks',p:["Bij veel nieuwe projecten zijn munten van het team en investeerders een tijd vastgezet. Op een unlock-datum komen ze vrij. Als die houders gaan verkopen, kan dat de koers drukken. Vantis toont komende unlocks in de Marktdata."],tip:'Een grote unlock ten opzichte van het circulerend aanbod is een reden om extra op te letten.'},
  {h:'Kernpunten',li:['Kijk naar aanbod en uitgifte, niet alleen naar de koers.','Een grote kloof tussen marktwaarde en FDV betekent veel toekomstig aanbod.','Grote unlocks kunnen verkoopdruk geven.']}],
 q:[['Wat is de FDV?',['De waarde als alle munten in omloop zouden zijn','De dagomzet','De koers van gisteren'],0,'Fully diluted value: de marktwaarde als het maximale aanbod al in omloop zou zijn.'],
  ['Waarom kan een unlock de koers drukken?',['Er komen veel munten vrij die verkocht kunnen worden','De munt wordt verwijderd','De beurs sluit'],0,'Vrijgekomen munten kunnen op de markt komen, wat het aanbod verhoogt.'],
  ['Hoeveel bitcoin komen er maximaal?',['21 miljoen','Onbeperkt','1 miljard'],0,'Het maximale aanbod van Bitcoin is vastgelegd op 21 miljoen.']]},

correlatie:{t:'Correlatie en spreiding',min:5,go:['#marktdata','Bekijk de correlaties'],s:[
  {h:'Bewegen ze samen?',p:["Correlatie meet hoe sterk twee koersen samen bewegen, van −1 (precies tegengesteld) via 0 (geen verband) tot +1 (precies gelijk). De meeste altcoins hebben een hoge correlatie met Bitcoin."]},
  {h:'Schijnspreiding',p:["Tien verschillende munten kopen voelt als spreiden, maar als ze allemaal met Bitcoin meebewegen, loop je in feite één groot risico. Echte spreiding zoek je over beleggingscategorieën: aandelen, obligaties, crypto en contant geld."]},
  {h:'In een crash',p:["In paniekmomenten stijgen correlaties vaak: bijna alles daalt tegelijk. Juist dan merk je hoeveel spreiding je echt had."]},
  {h:'Kernpunten',li:['Correlatie loopt van −1 tot +1.','De meeste crypto beweegt met Bitcoin mee.','Spreid over categorieën, niet alleen over munten.']}],
 q:[['Wat betekent een correlatie van +0,9 met Bitcoin?',['Beweegt bijna gelijk op met Bitcoin','Beweegt tegengesteld','Heeft geen verband'],0,'Een waarde dicht bij +1 betekent dat de koersen sterk samen bewegen.'],
  ['Je hebt tien altcoins. Ben je goed gespreid?',['Ja, tien is genoeg','Waarschijnlijk niet: ze bewegen vaak met Bitcoin mee','Alleen als ze goedkoop zijn'],1,'Als alle munten sterk met Bitcoin correleren, loop je in feite hetzelfde risico.'],
  ['Wat gebeurt er vaak met correlaties tijdens een crash?',['Ze dalen','Ze stijgen','Ze verdwijnen'],1,'In paniek verkopen beleggers bijna alles tegelijk, waardoor koersen meer samen bewegen.']]},

backtest:{t:'Strategieën testen',min:5,go:['#trackrecord','Bekijk de track record'],s:[
  {h:'Wat is een backtest?',p:["In een backtest pas je vaste regels toe op koersen uit het verleden, alsof je toen had gehandeld. Zo zie je hoe een strategie had gepresteerd voordat je er echt geld op zet."]},
  {h:'Valkuilen',li:['Overfitting: je stemt de regels zo af op het verleden dat ze alleen daar werken.','Vooruitkijken: je gebruikt per ongeluk informatie die je op dat moment nog niet had.','Overlevingsbias: je test alleen munten die nu nog bestaan, niet de munten die verdwenen.','Kosten vergeten: zonder transactiekosten en spread ziet bijna elke strategie er beter uit.']},
  {h:'Eerlijk testen',p:["Test op een periode die je niet gebruikte om de regels te maken (out-of-sample). Houd de regels eenvoudig. En onthoud: resultaten uit het verleden bieden geen garantie voor de toekomst. De track record van Vantis werkt volgens hetzelfde principe en laat zien wat een score wel en niet zegt."]},
  {h:'Kernpunten',li:['Een backtest laat zien hoe regels in het verleden werkten.','Pas op voor overfitting, vooruitkijken en vergeten kosten.','Test altijd op data die je niet gebruikte om de regels te bedenken.']}],
 q:[['Wat is overfitting?',['Regels die precies op het verleden passen en daarna niet werken','Te veel kosten','Een soort order'],0,'Hoe meer je regels afstemt op historische data, hoe groter de kans dat ze alleen daar werken.'],
  ['Waarom test je out-of-sample?',['Om te zien of de regels ook werken op data die je niet gebruikte','Omdat het sneller is','Om kosten te besparen'],0,'Data die je niet gebruikte om de regels te maken, is een eerlijker test.'],
  ['Wat gebeurt er als je kosten vergeet in een backtest?',['De resultaten lijken beter dan ze zijn','Niets','De resultaten lijken slechter'],0,'Kosten en spread drukken het rendement, vooral bij strategieën die vaak handelen.']]}
};

/* extra begrippen voor de begrippenlijst (naast GLOSS uit de app) */
const AC_TERMS=[
 ['Aandeel','Een deel van het eigendom van een bedrijf.'],['Altcoin','Elke cryptomunt behalve Bitcoin.'],['ATR','Average True Range: de gemiddelde afstand tussen het hoogste en laagste punt per periode.'],
 ['Bear market','Een langere periode van dalende koersen.'],['Bull market','Een langere periode van stijgende koersen.'],['Blockchain','Een openbaar grootboek waarin transacties in blokken worden vastgelegd.'],
 ['Bollinger Bands','Banden twee standaarddeviaties boven en onder het 20-daags gemiddelde.'],['Candle','Een kaars in de grafiek met opening, hoogste punt, laagste punt en slotkoers.'],
 ['Circulerend aanbod','Het aantal munten dat nu verhandeld kan worden.'],['DCA','Dollar-cost averaging: op vaste momenten een vast bedrag kopen.'],['Dividend','Uitkering van winst aan aandeelhouders.'],
 ['Doji','Een candle waarbij opening en slot bijna gelijk zijn.'],['ETF','Een fonds dat je als één aandeel koopt en dat vaak een index volgt.'],['Exchange','Een handelsplatform voor crypto of aandelen.'],
 ['FDV','Fully diluted value: de marktwaarde als alle munten in omloop zouden zijn.'],['FOMO','Fear of missing out: de angst om een stijging mis te lopen.'],['FUD','Fear, uncertainty and doubt: angst, onzekerheid en twijfel.'],
 ['Funding rate','De periodieke betaling tussen long- en shorthouders bij perpetual futures.'],['Halving','Het moment waarop de beloning voor Bitcoin-miners halveert, ongeveer elke vier jaar.'],['Hashrate','De rekenkracht die het Bitcoin-netwerk beveiligt.'],
 ['Hefboom','Handelen met geleend geld, waardoor winst én verlies groter worden.'],['Index','Een mandje aandelen dat samen een markt weergeeft, zoals de AEX.'],['Limietorder','Een order die alleen wordt uitgevoerd tegen jouw prijs of beter.'],
 ['Liquidatie','Het gedwongen sluiten van een positie met hefboom als het onderpand op is.'],['Liquiditeit','Hoe makkelijk je iets kunt kopen of verkopen zonder de prijs te bewegen.'],['Long','Een positie die winst maakt als de koers stijgt.'],
 ['Marktorder','Een order die direct wordt uitgevoerd tegen de beste beschikbare prijs.'],['Open interest','De totale waarde van openstaande futures-posities.'],['Peildatum','De datum waarop de waarde voor box 3 wordt bepaald: 1 januari.'],
 ['Positiegrootte','Hoeveel je van een asset koopt, bepaald vanuit je risico per trade.'],['R-multiple','Winst of verlies uitgedrukt in je oorspronkelijke risico (1R).'],['Rug pull','Oplichting waarbij makers het geld uit een project halen en verdwijnen.'],
 ['Seed phrase','De herstelzin van 12 of 24 woorden waarmee je een wallet herstelt.'],['Short','Een positie die winst maakt als de koers daalt.'],['Slippage','Het verschil tussen de verwachte en de werkelijke uitvoeringsprijs.'],
 ['Spread','Het verschil tussen de hoogste biedprijs en de laagste laatprijs.'],['Steun','Een prijsgebied waar een daling eerder stopte.'],['Stop-loss','Een order die verkoopt als de koers tot een bepaalde prijs daalt.'],
 ['Take profit','Een order die winst neemt bij een vooraf bepaald koersdoel.'],['Tijdsframe','De periode die één candle in de grafiek beslaat, zoals een uur of een dag.'],['Trailing stop','Een stop-loss die meeloopt met de koers als die stijgt.'],
 ['Trend','De overheersende richting van de koers.'],['Unlock','Het moment waarop vastgezette munten vrijkomen.'],['Volume','De hoeveelheid die in een periode is verhandeld.'],
 ['Wallet','Software of een apparaat waarmee je de sleutels van je crypto beheert.'],['Weerstand','Een prijsgebied waar een stijging eerder stopte.']
];

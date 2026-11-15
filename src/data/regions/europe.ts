import type { ProvinceLocation } from '../turkeyProvinces';

// Avrupa kıtasındaki tüm ülkelerin (Türkiye hariç 45 ülke) bölgeleri, şehirleri, ilçe/semt ve mahalleleri
export const EUROPE_COUNTRY_PROVINCES: Record<string, ProvinceLocation[]> = {
  // İtalya
  napoli: [
    {
      name: 'Napoli',
      center: { lat: 40.8518, lng: 14.2681 },
      districts: [
        'Centro Storico', 'Chiaia', 'Vomero', 'San Ferdinando', 'Posillipo',
        'Spaccanapoli', 'Quartieri Spagnoli', 'Mergellina', 'Fuorigrotta', 'Arenella',
      ],
    },
    {
      name: 'Roma',
      center: { lat: 41.9028, lng: 12.4964 },
      districts: [
        'Trastevere', 'Centro Storico', 'Prati', 'Monti', 'Testaccio',
        'San Lorenzo', 'Parioli', 'EUR', 'Garbatella', 'Borgo',
      ],
    },
    {
      name: 'Milano',
      center: { lat: 45.4642, lng: 9.19 },
      districts: [
        'Brera', 'Navigli', 'Porta Nuova', 'Isola', 'Quadrilatero',
        'Porta Romana', 'CityLife', 'Porta Venezia', 'Sempione', 'Lambrate',
      ],
    },
    {
      name: 'Floransa',
      center: { lat: 43.7696, lng: 11.2558 },
      districts: [
        'Duomo', 'Oltrarno', 'Santa Croce', 'San Lorenzo', 'Santo Spirito',
        'San Niccolò', 'Campo di Marte', 'Rifredi',
      ],
    },
    {
      name: 'Venedik',
      center: { lat: 45.4408, lng: 12.3155 },
      districts: [
        'San Marco', 'Cannaregio', 'Dorsoduro', 'Rialto', 'Castello',
        'San Polo', 'Santa Croce', 'Mestre', 'Lido di Venezia',
      ],
    },
    {
      name: 'Bologna',
      center: { lat: 44.4949, lng: 11.3426 },
      districts: ['Centro Storico', 'Santo Stefano', 'Saragozza', 'Bolognina', 'Navile', 'San Donato'],
    },
    {
      name: 'Torino',
      center: { lat: 45.0703, lng: 7.6869 },
      districts: ['Quadrilatero Romano', 'San Salvario', 'Crocetta', 'Vanchiglia', 'Lingotto'],
    },
    {
      name: 'Palermo',
      center: { lat: 38.1157, lng: 13.3615 },
      districts: ['Kalsa', 'Politeama', 'Ballarò', 'Vucciria', 'Mondello'],
    },
  ],

  // Fransa
  paris: [
    {
      name: 'Paris',
      center: { lat: 48.8566, lng: 2.3522 },
      districts: [
        'Le Marais', 'Saint-Germain', 'Saint-Germain-des-Prés', 'Montmartre',
        'Canal Saint-Martin', 'Bastille', 'Opéra', 'Quartier Latin',
        'Champs-Élysées', 'Belleville', 'Batignolles', 'Bercy', 'Pigalle',
      ],
    },
    {
      name: 'Lyon',
      center: { lat: 45.764, lng: 4.8357 },
      districts: ['Presqu’île', 'Vieux Lyon', 'Croix-Rousse', 'Part-Dieu', 'Confluence', 'Brotteaux'],
    },
    {
      name: 'Marsilya',
      center: { lat: 43.2965, lng: 5.3698 },
      districts: ['Vieux-Port', 'Le Panier', 'Castellane', 'Prado', 'Endoume', 'Joliette'],
    },
    {
      name: 'Nice',
      center: { lat: 43.7102, lng: 7.262 },
      districts: ['Vieux Nice', 'Promenade des Anglais', 'Cimiez', 'Port Lympia', 'Libération'],
    },
    {
      name: 'Bordeaux',
      center: { lat: 44.8378, lng: -0.5792 },
      districts: ['Saint-Pierre', 'Chartrons', 'Saint-Michel', 'Mériadeck', 'Bastide'],
    },
    {
      name: 'Toulouse',
      center: { lat: 43.6047, lng: 1.4442 },
      districts: ['Capitole', 'Saint-Cyprien', 'Carmes', 'Saint-Aubin', 'Compans-Caffarelli'],
    },
    {
      name: 'Strasbourg',
      center: { lat: 48.5734, lng: 7.7521 },
      districts: ['Grande Île', 'Petite France', 'Krutenau', 'Neudorf', 'Orangerie'],
    },
  ],

  // Almanya
  de: [
    {
      name: 'Berlin',
      center: { lat: 52.52, lng: 13.405 },
      districts: [
        'Mitte', 'Kreuzberg', 'Charlottenburg', 'Prenzlauer Berg', 'Neukölln',
        'Friedrichshain', 'Schöneberg', 'Wilmersdorf', 'Moabit', 'Wedding',
      ],
    },
    {
      name: 'Münih',
      center: { lat: 48.1351, lng: 11.582 },
      districts: [
        'Altstadt-Lehel', 'Schwabing', 'Maxvorstadt', 'Haidhausen', 'Bogenhausen',
        'Glockenbachviertel', 'Neuhausen', 'Sendling',
      ],
    },
    {
      name: 'Hamburg',
      center: { lat: 53.5511, lng: 9.9937 },
      districts: ['Altona', 'Eimsbüttel', 'St. Pauli', 'HafenCity', 'Winterhude', 'Eppendorf', 'Sternschanze'],
    },
    {
      name: 'Frankfurt',
      center: { lat: 50.1109, lng: 8.6821 },
      districts: ['Innenstadt', 'Sachsenhausen', 'Westend', 'Nordend', 'Bornheim', 'Bockenheim'],
    },
    {
      name: 'Köln',
      center: { lat: 50.9375, lng: 6.9603 },
      districts: ['Innenstadt', 'Ehrenfeld', 'Belgisches Viertel', 'Lindenthal', 'Nippes', 'Südstadt'],
    },
    {
      name: 'Stuttgart',
      center: { lat: 48.7758, lng: 9.1829 },
      districts: ['Mitte', 'Stuttgart-West', 'Stuttgart-Süd', 'Bad Cannstatt', 'Vaihingen'],
    },
    {
      name: 'Düsseldorf',
      center: { lat: 51.2277, lng: 6.7735 },
      districts: ['Altstadt', 'Carlstadt', 'Flingern', 'Pempelfort', 'Oberkassel'],
    },
  ],

  // Birleşik Krallık
  gb: [
    {
      name: 'Londra',
      center: { lat: 51.5074, lng: -0.1278 },
      districts: [
        'Soho', 'Shoreditch', 'Covent Garden', 'Kensington', 'Camden',
        'Mayfair', 'Greenwich', 'Notting Hill', 'Chelsea', 'Canary Wharf',
        'Brixton', 'Hampstead', 'Islington', 'Marylebone',
      ],
    },
    {
      name: 'Manchester',
      center: { lat: 53.4808, lng: -2.2426 },
      districts: ['Northern Quarter', 'Deansgate', 'Ancoats', 'Didsbury', 'Salford Quays', 'Chorlton'],
    },
    {
      name: 'Edinburgh',
      center: { lat: 55.9533, lng: -3.1883 },
      districts: ['Old Town', 'New Town', 'Stockbridge', 'Leith', 'Morningside', 'Bruntsfield'],
    },
    {
      name: 'Birmingham',
      center: { lat: 52.4862, lng: -1.8904 },
      districts: ['Jewellery Quarter', 'Digbeth', 'Edgbaston', 'Moseley', 'Brindleyplace'],
    },
    {
      name: 'Liverpool',
      center: { lat: 53.4084, lng: -2.9916 },
      districts: ['Baltic Triangle', 'Ropewalks', 'Albert Dock', 'Lark Lane', 'Georgian Quarter'],
    },
    {
      name: 'Glasgow',
      center: { lat: 55.8642, lng: -4.2518 },
      districts: ['West End', 'Merchant City', 'Finnieston', 'Shawlands', 'Ashton Lane'],
    },
    {
      name: 'Cardiff',
      center: { lat: 51.4816, lng: -3.1791 },
      districts: ['Cardiff Bay', 'Pontcanna', 'Roath', 'Cathays', 'Canton'],
    },
    {
      name: 'Belfast',
      center: { lat: 54.5973, lng: -5.9301 },
      districts: ['Cathedral Quarter', 'Queen’s Quarter', 'Titanic Quarter', 'Lisburn Road'],
    },
  ],

  // İspanya
  es: [
    {
      name: 'Madrid',
      center: { lat: 40.4168, lng: -3.7038 },
      districts: ['Sol', 'Salamanca', 'Malasaña', 'Chueca', 'Retiro', 'La Latina', 'Chamberí', 'Lavapiés'],
    },
    {
      name: 'Barselona',
      center: { lat: 41.3874, lng: 2.1686 },
      districts: ['Eixample', 'El Born', 'Barri Gòtic', 'Gràcia', 'Barceloneta', 'El Raval', 'Poblenou', 'Sarrià'],
    },
    {
      name: 'Sevilla',
      center: { lat: 37.3891, lng: -5.9845 },
      districts: ['Santa Cruz', 'Triana', 'Nervión', 'Alameda', 'Los Remedios', 'Macarena'],
    },
    {
      name: 'Valensiya',
      center: { lat: 39.4699, lng: -0.3763 },
      districts: ['Ciutat Vella', 'Ruzafa', 'El Carmen', 'Benimaclet', 'El Pla del Remei'],
    },
    {
      name: 'Bilbao',
      center: { lat: 43.263, lng: -2.935 },
      districts: ['Casco Viejo', 'Abando', 'Indautxu', 'Deusto', 'Ensanche'],
    },
    {
      name: 'Málaga',
      center: { lat: 36.7213, lng: -4.4214 },
      districts: ['Centro Histórico', 'Soho Málaga', 'La Malagueta', 'Pedregalejo', 'El Palo'],
    },
  ],

  // Hollanda
  nl: [
    {
      name: 'Amsterdam',
      center: { lat: 52.3676, lng: 4.9041 },
      districts: ['Centrum', 'Jordaan', 'De Pijp', 'Oud-West', 'Oud-Zuid', 'Amsterdam-Noord', 'Negen Straatjes'],
    },
    {
      name: 'Rotterdam',
      center: { lat: 51.9244, lng: 4.4777 },
      districts: ['Centrum', 'Kralingen', 'Kop van Zuid', 'Delfshaven', 'Noord'],
    },
    {
      name: 'Lahey',
      center: { lat: 52.0705, lng: 4.3007 },
      districts: ['Centrum', 'Scheveningen', 'Zeeheldenkwartier', 'Statenkwartier', 'Archipelbuurt'],
    },
    {
      name: 'Utrecht',
      center: { lat: 52.0907, lng: 5.1214 },
      districts: ['Binnenstad', 'Wittevrouwen', 'Lombok', 'Oudwijk'],
    },
    {
      name: 'Eindhoven',
      center: { lat: 51.4416, lng: 5.4697 },
      districts: ['Centrum', 'Strijp-S', 'Woensel', 'Stratum'],
    },
  ],

  // Belçika
  be: [
    {
      name: 'Brüksel',
      center: { lat: 50.8503, lng: 4.3517 },
      districts: ['Grand Place', 'Ixelles', 'Saint-Gilles', 'Sablon', 'Uccle', 'Etterbeek', 'Schaerbeek'],
    },
    {
      name: 'Anvers (Antwerp)',
      center: { lat: 51.2194, lng: 4.4025 },
      districts: ['Centrum', 'Zuid', 'Eilandje', 'Zurenborg', 'Borgerhout'],
    },
    {
      name: 'Gent',
      center: { lat: 51.0543, lng: 3.7174 },
      districts: ['Patershol', 'Korenmarkt', 'Sint-Pieters', 'Dampoort'],
    },
    {
      name: 'Brugge',
      center: { lat: 51.2093, lng: 3.2247 },
      districts: ['Binnenstad', 'Sint-Gillis', 'Sint-Anna', 'Sint-Andries'],
    },
    {
      name: 'Liège',
      center: { lat: 50.6326, lng: 5.5797 },
      districts: ['Outremeuse', 'Guillemins', 'Carré', 'Saint-Léonard'],
    },
  ],

  // İsviçre
  ch: [
    {
      name: 'Zürih',
      center: { lat: 47.3769, lng: 8.5417 },
      districts: ['Altstadt', 'Seefeld', 'Kreis 4', 'Enge', 'Zürich West', 'Niederdorf', 'Wiedikon'],
    },
    {
      name: 'Cenevre',
      center: { lat: 46.2044, lng: 6.1432 },
      districts: ['Vieille Ville', 'Eaux-Vives', 'Carouge', 'Pâquis', 'Plainpalais'],
    },
    {
      name: 'Basel',
      center: { lat: 47.5596, lng: 7.5886 },
      districts: ['Grossbasel', 'Kleinbasel', 'St. Alban', 'Gundeldingen', 'St. Johann'],
    },
    {
      name: 'Bern',
      center: { lat: 46.948, lng: 7.4474 },
      districts: ['Altstadt', 'Breitenrain', 'Lorraine', 'Länggasse', 'Mattenhof'],
    },
    {
      name: 'Lozan',
      center: { lat: 46.5197, lng: 6.6323 },
      districts: ['Flon', 'Ouchy', 'Sous-Gare', 'Cité'],
    },
  ],

  // Avusturya
  at: [
    {
      name: 'Viyana',
      center: { lat: 48.2082, lng: 16.3738 },
      districts: [
        'Innere Stadt', 'Neubau', 'Leopoldstadt', 'Mariahilf', 'Josefstadt',
        'Wieden', 'Margareten', 'Döbling', 'Landstraße',
      ],
    },
    {
      name: 'Salzburg',
      center: { lat: 47.8095, lng: 13.055 },
      districts: ['Altstadt', 'Neustadt', 'Mülln', 'Nonntal', 'Aigen'],
    },
    {
      name: 'Graz',
      center: { lat: 47.0707, lng: 15.4395 },
      districts: ['Innere Stadt', 'Lend', 'Gries', 'Geidorf', 'Jakomini'],
    },
    {
      name: 'Innsbruck',
      center: { lat: 47.2692, lng: 11.4041 },
      districts: ['Altstadt', 'Wilten', 'Saggen', 'Pradl', 'Mariahilf'],
    },
  ],

  // Portekiz
  pt: [
    {
      name: 'Lizbon',
      center: { lat: 38.7223, lng: -9.1393 },
      districts: [
        'Chiado', 'Alfama', 'Príncipe Real', 'Baixa', 'Bairro Alto',
        'Belém', 'Avenida da Liberdade', 'Parque das Nações', 'Alcântara',
      ],
    },
    {
      name: 'Porto',
      center: { lat: 41.1579, lng: -8.6291 },
      districts: ['Ribeira', 'Baixa', 'Cedofeita', 'Foz do Douro', 'Boavista', 'Bonfim'],
    },
    {
      name: 'Faro (Algarve)',
      center: { lat: 37.0194, lng: -7.9304 },
      districts: ['Cidade Velha', 'São Pedro', 'Sé', 'Montenegro'],
    },
    {
      name: 'Coimbra',
      center: { lat: 40.2033, lng: -8.4103 },
      districts: ['Alta de Coimbra', 'Baixa', 'Santa Clara', 'Solum'],
    },
    {
      name: 'Funchal (Madeira)',
      center: { lat: 32.6669, lng: -16.9241 },
      districts: ['Zona Velha', 'Sé', 'Lido', 'São Martinho'],
    },
  ],

  // Yunanistan
  gr: [
    {
      name: 'Atina',
      center: { lat: 37.9838, lng: 23.7275 },
      districts: [
        'Plaka', 'Kolonaki', 'Psiri', 'Monastiraki', 'Koukaki',
        'Exarcheia', 'Glyfada', 'Pagrati', 'Gazi',
      ],
    },
    {
      name: 'Selanik',
      center: { lat: 40.6401, lng: 22.9444 },
      districts: ['Ladadika', 'Ano Poli', 'Aristotelous', 'Kalamaria', 'Toumba'],
    },
    {
      name: 'Kandiye (Girit)',
      center: { lat: 35.3387, lng: 25.1442 },
      districts: ['Merkez', 'Lions Square', 'Koules', 'Nea Alikarnassos'],
    },
    {
      name: 'Rodos',
      center: { lat: 36.4349, lng: 28.2176 },
      districts: ['Eski Şehir', 'Mandraki', 'Ixia', 'Faliraki'],
    },
    {
      name: 'Patras',
      center: { lat: 38.2466, lng: 21.7346 },
      districts: ['Agios Nikolaos', 'Psila Alonia', 'Rio'],
    },
  ],

  // Polonya
  pl: [
    {
      name: 'Varşova',
      center: { lat: 52.2297, lng: 21.0122 },
      districts: ['Śródmieście', 'Mokotów', 'Praga', 'Stare Miasto', 'Żoliborz', 'Wola', 'Powiśle'],
    },
    {
      name: 'Kraków',
      center: { lat: 50.0647, lng: 19.945 },
      districts: ['Stare Miasto', 'Kazimierz', 'Podgórze', 'Kleparz', 'Krowodrza'],
    },
    {
      name: 'Gdańsk',
      center: { lat: 54.352, lng: 18.6466 },
      districts: ['Śródmieście', 'Wrzeszcz', 'Oliwa', 'Przymorze'],
    },
    {
      name: 'Wrocław',
      center: { lat: 51.1079, lng: 17.0385 },
      districts: ['Stare Miasto', 'Nadodrze', 'Krzyki', 'Ostrów Tumski'],
    },
    {
      name: 'Poznań',
      center: { lat: 52.4064, lng: 16.9252 },
      districts: ['Stare Miasto', 'Jeżyce', 'Wilda', 'Łazarz'],
    },
  ],

  // İsveç
  se: [
    {
      name: 'Stockholm',
      center: { lat: 59.3293, lng: 18.0686 },
      districts: ['Norrmalm', 'Södermalm', 'Östermalm', 'Gamla Stan', 'Vasastan', 'Kungsholmen'],
    },
    {
      name: 'Göteborg',
      center: { lat: 57.7089, lng: 11.9746 },
      districts: ['Haga', 'Linnéstaden', 'Vasastaden', 'Majorna', 'Avenyn'],
    },
    {
      name: 'Malmö',
      center: { lat: 55.605, lng: 13.0038 },
      districts: ['Gamla Staden', 'Västra Hamnen', 'Möllevången', 'Davidshall'],
    },
    {
      name: 'Uppsala',
      center: { lat: 59.8586, lng: 17.6389 },
      districts: ['Centrum', 'Fålhagen', 'Luthagen', 'Svartbäcken'],
    },
  ],

  // Norveç
  no: [
    {
      name: 'Oslo',
      center: { lat: 59.9139, lng: 10.7522 },
      districts: ['Sentrum', 'Grünerløkka', 'Frogner', 'Aker Brygge', 'Majorstuen', 'St. Hanshaugen'],
    },
    {
      name: 'Bergen',
      center: { lat: 60.3913, lng: 5.3221 },
      districts: ['Bryggen', 'Sentrum', 'Nordnes', 'Sandviken', 'Møhlenpris'],
    },
    {
      name: 'Trondheim',
      center: { lat: 63.4305, lng: 10.3951 },
      districts: ['Midtbyen', 'Bakklandet', 'Solsiden', 'Lademoen'],
    },
    {
      name: 'Stavanger',
      center: { lat: 58.97, lng: 5.7331 },
      districts: ['Gamle Stavanger', 'Sentrum', 'Fargegaten', 'Hinna'],
    },
  ],

  // Danimarka
  dk: [
    {
      name: 'Kopenhag',
      center: { lat: 55.6761, lng: 12.5683 },
      districts: ['Indre By', 'Vesterbro', 'Nørrebro', 'Østerbro', 'Frederiksberg', 'Christianshavn'],
    },
    {
      name: 'Aarhus',
      center: { lat: 56.1629, lng: 10.2039 },
      districts: ['Latinerkvarteret', 'Midtbyen', 'Frederiksbjerg', 'Trøjborg'],
    },
    {
      name: 'Odense',
      center: { lat: 55.4038, lng: 10.4024 },
      districts: ['Odense C', 'H.C. Andersen Kvarteret', 'Skibhuskvarteret'],
    },
    {
      name: 'Aalborg',
      center: { lat: 57.0488, lng: 9.9217 },
      districts: ['Midtbyen', 'Vestbyen', 'Vejgaard'],
    },
  ],

  // Finlandiya
  fi: [
    {
      name: 'Helsinki',
      center: { lat: 60.1699, lng: 24.9384 },
      districts: ['Kamppi', 'Kallio', 'Punavuori', 'Kluuvi', 'Ullanlinna', 'Töölö'],
    },
    {
      name: 'Tampere',
      center: { lat: 61.4978, lng: 23.761 },
      districts: ['Keskusta', 'Tampella', 'Tammela', 'Pispala'],
    },
    {
      name: 'Turku',
      center: { lat: 60.4518, lng: 22.2666 },
      districts: ['Keskusta', 'Portsa', 'Kakola', 'Kupittaa'],
    },
    {
      name: 'Oulu',
      center: { lat: 65.0121, lng: 25.4651 },
      districts: ['Pokkinen', 'Tuira', 'Pikisaari'],
    },
  ],

  // İrlanda
  ie: [
    {
      name: 'Dublin',
      center: { lat: 53.3498, lng: -6.2603 },
      districts: ['Temple Bar', 'Rathmines', 'Portobello', 'Grafton', 'Smithfield', 'Ranelagh', 'Ballsbridge'],
    },
    {
      name: 'Cork',
      center: { lat: 51.8985, lng: -8.4756 },
      districts: ['Victorian Quarter', 'Shandon', 'Douglas', 'Blackrock'],
    },
    {
      name: 'Galway',
      center: { lat: 53.2707, lng: -9.0568 },
      districts: ['Latin Quarter', 'Salthill', 'West End', 'Claddagh'],
    },
    {
      name: 'Limerick',
      center: { lat: 52.6638, lng: -8.6267 },
      districts: ['Georgian Quarter', 'King’s Island', 'Castletroy'],
    },
  ],

  // Çekya
  cz: [
    {
      name: 'Prag',
      center: { lat: 50.0755, lng: 14.4378 },
      districts: ['Staré Město', 'Vinohrady', 'Karlín', 'Malá Strana', 'Nové Město', 'Žižkov', 'Holešovice'],
    },
    {
      name: 'Brno',
      center: { lat: 49.1951, lng: 16.6068 },
      districts: ['Brno-střed', 'Žabovřesky', 'Královo Pole', 'Špilberk'],
    },
    {
      name: 'Ostrava',
      center: { lat: 49.8209, lng: 18.2625 },
      districts: ['Moravská Ostrava', 'Poruba', 'Vítkovice'],
    },
    {
      name: 'Plzeň',
      center: { lat: 49.7384, lng: 13.3736 },
      districts: ['Vnitřní Město', 'Slovany', 'Bory'],
    },
  ],

  // Macaristan
  hu: [
    {
      name: 'Budapeşte',
      center: { lat: 47.4979, lng: 19.0402 },
      districts: ['Belváros', 'Erzsébetváros', 'Buda', 'Terézváros', 'Újlipótváros', 'Ferencváros', 'Várkerület'],
    },
    {
      name: 'Debrecen',
      center: { lat: 47.5316, lng: 21.6273 },
      districts: ['Belváros', 'Nagyerdő', 'Tócóskert'],
    },
    {
      name: 'Szeged',
      center: { lat: 46.253, lng: 20.1414 },
      districts: ['Belváros', 'Újszeged', 'Alsóváros'],
    },
    {
      name: 'Pécs',
      center: { lat: 46.0727, lng: 18.2323 },
      districts: ['Belváros', 'Mecsekoldal', 'Uránváros'],
    },
  ],

  // Romanya
  ro: [
    {
      name: 'Bükreş',
      center: { lat: 44.4268, lng: 26.1025 },
      districts: ['Centrul Vechi', 'Floreasca', 'Cotroceni', 'Dorobanți', 'Herăstrău', 'Sector 1', 'Sector 3'],
    },
    {
      name: 'Kaloşvar (Cluj-Napoca)',
      center: { lat: 46.7712, lng: 23.6236 },
      districts: ['Centru', 'Mănăștur', 'Zorilor', 'Gheorgheni', 'Grigorescu'],
    },
    {
      name: 'Timișoara',
      center: { lat: 45.7489, lng: 21.2087 },
      districts: ['Cetate', 'Fabric', 'Iosefin', 'Elisabetin'],
    },
    {
      name: 'Yaş (Iași)',
      center: { lat: 47.1585, lng: 27.6014 },
      districts: ['Centru', 'Copou', 'Tudor Vladimirescu', 'Păcurari'],
    },
    {
      name: 'Köstence (Constanța)',
      center: { lat: 44.1598, lng: 28.6348 },
      districts: ['Peninsulă', 'Mamaia', 'Tomis Nord', 'Faleză Nord'],
    },
  ],

  // Bulgaristan
  bg: [
    {
      name: 'Sofya',
      center: { lat: 42.6977, lng: 23.3219 },
      districts: ['Sredets', 'Lozenets', 'Oborishte', 'Vitosha', 'Ivan Vazov', 'Studentski Grad'],
    },
    {
      name: 'Filibe (Plovdiv)',
      center: { lat: 42.1354, lng: 24.7453 },
      districts: ['Kapana', 'Eski Şehir', 'Kamenitsa', 'Trakia'],
    },
    {
      name: 'Varna',
      center: { lat: 43.2141, lng: 27.9147 },
      districts: ['Odessos', 'Deniz Bahçesi', 'Chayka', 'Primorski'],
    },
    {
      name: 'Burgaz',
      center: { lat: 42.5048, lng: 27.4626 },
      districts: ['Merkez', 'Lazur', 'Sarafovo'],
    },
  ],

  // Hırvatistan
  hr: [
    {
      name: 'Zagreb',
      center: { lat: 45.815, lng: 15.9819 },
      districts: ['Donji Grad', 'Gornji Grad', 'Maksimir', 'Trešnjevka', 'Tkalčićeva'],
    },
    {
      name: 'Split',
      center: { lat: 43.5081, lng: 16.4402 },
      districts: ['Diocletian Sarayı', 'Varoš', 'Bačvice', 'Meje', 'Marjan'],
    },
    {
      name: 'Dubrovnik',
      center: { lat: 42.6507, lng: 18.0944 },
      districts: ['Stari Grad', 'Lapad', 'Gruž', 'Ploče'],
    },
    {
      name: 'Rijeka',
      center: { lat: 45.3271, lng: 14.4422 },
      districts: ['Korzo', 'Trsat', 'Pećine'],
    },
  ],

  // Sırbistan
  rs: [
    {
      name: 'Belgrad',
      center: { lat: 44.7866, lng: 20.4489 },
      districts: ['Stari Grad', 'Vračar', 'Dorćol', 'Skadarlija', 'Novi Beograd', 'Zemun', 'Savski Venac'],
    },
    {
      name: 'Novi Sad',
      center: { lat: 45.2671, lng: 19.8335 },
      districts: ['Stari Grad', 'Petrovaradin', 'Liman', 'Grbavica'],
    },
    {
      name: 'Niş',
      center: { lat: 43.3209, lng: 21.8958 },
      districts: ['Medijana', 'Palilula', 'Tvrđava'],
    },
  ],

  // Ukrayna
  ua: [
    {
      name: 'Kiev',
      center: { lat: 50.4501, lng: 30.5234 },
      districts: ['Shevchenkivskyi', 'Pechersk', 'Podil', 'Obolon', 'Khreshchatyk', 'Solomianskyi'],
    },
    {
      name: 'Lviv',
      center: { lat: 49.8397, lng: 24.0297 },
      districts: ['Rynok Meydanı', 'Halytskyi', 'Lychakivskyi', 'Frankivskyi'],
    },
    {
      name: 'Odesa',
      center: { lat: 46.4825, lng: 30.7233 },
      districts: ['Prymorskyi', 'Arcadia', 'Moldavanka', 'Fontan'],
    },
    {
      name: 'Harkiv',
      center: { lat: 49.9935, lng: 36.2304 },
      districts: ['Shevchenkivskyi', 'Kyivskyi', 'Saltivka'],
    },
  ],

  // Rusya
  ru: [
    {
      name: 'Moskova',
      center: { lat: 55.7558, lng: 37.6173 },
      districts: ['Tverskoy', 'Arbat', 'Patriarch Ponds', 'Zamoskvorechye', 'Khamovniki', 'Kitay-Gorod', 'Basmanny'],
    },
    {
      name: 'Sankt-Peterburg',
      center: { lat: 59.9311, lng: 30.3609 },
      districts: ['Tsentralny', 'Petrogradsky', 'Vasileostrovsky', 'Admiralteysky', 'Nevsky'],
    },
    {
      name: 'Kazan',
      center: { lat: 55.7961, lng: 49.1064 },
      districts: ['Vakhitovsky', 'Novo-Savinovsky', 'Eski Tatar Mahallesi'],
    },
    {
      name: 'Soçi',
      center: { lat: 43.6028, lng: 39.7342 },
      districts: ['Tsentralny', 'Adler', 'Khosta', 'Krasnaya Polyana'],
    },
    {
      name: 'Yekaterinburg',
      center: { lat: 56.8389, lng: 60.6057 },
      districts: ['Leninsky', 'Oktyabrsky', 'Verkh-Isetsky'],
    },
  ],

  // İzlanda
  is: [
    {
      name: 'Reykjavik',
      center: { lat: 64.1466, lng: -21.9426 },
      districts: ['Miðborg', 'Vesturbær', 'Hlíðar', 'Laugardalur', 'Grandi'],
    },
    {
      name: 'Kópavogur',
      center: { lat: 64.1123, lng: -21.9129 },
      districts: ['Kársnes', 'Smárinn', 'Lindir'],
    },
    {
      name: 'Akureyri',
      center: { lat: 65.6885, lng: -18.1262 },
      districts: ['Miðbær', 'Innbær', 'Brekkan'],
    },
  ],

  // Lüksemburg
  lu: [
    {
      name: 'Lüksemburg Şehri',
      center: { lat: 49.6116, lng: 6.1319 },
      districts: ['Ville Haute', 'Kirchberg', 'Gare', 'Grund', 'Clausen', 'Belair'],
    },
    {
      name: 'Esch-sur-Alzette',
      center: { lat: 49.4958, lng: 5.9806 },
      districts: ['Belval', 'Centre', 'Lallange'],
    },
    {
      name: 'Differdange',
      center: { lat: 49.5242, lng: 5.8914 },
      districts: ['Differdange Centre', 'Oberkorn', 'Niederkorn'],
    },
  ],

  // Slovakya
  sk: [
    {
      name: 'Bratislava',
      center: { lat: 48.1486, lng: 17.1077 },
      districts: ['Staré Mesto', 'Ružinov', 'Petržalka', 'Nové Mesto', 'Karlova Ves'],
    },
    {
      name: 'Košice',
      center: { lat: 48.7164, lng: 21.2611 },
      districts: ['Staré Mesto', 'Sever', 'Juh', 'Západ'],
    },
    {
      name: 'Prešov',
      center: { lat: 48.9984, lng: 21.2391 },
      districts: ['Centrum', 'Sekčov', 'Solivar'],
    },
  ],

  // Slovenya
  si: [
    {
      name: 'Ljubljana',
      center: { lat: 46.0569, lng: 14.5058 },
      districts: ['Center', 'Šiška', 'Trnovo', 'Bežigrad', 'Rožna Dolina'],
    },
    {
      name: 'Maribor',
      center: { lat: 46.5547, lng: 15.6459 },
      districts: ['Lent', 'Center', 'Tabor'],
    },
    {
      name: 'Koper',
      center: { lat: 45.5481, lng: 13.7302 },
      districts: ['Staro Mestno Jedro', 'Semedela', 'Žusterna'],
    },
  ],

  // Estonya
  ee: [
    {
      name: 'Tallinn',
      center: { lat: 59.437, lng: 24.7536 },
      districts: ['Kesklinn', 'Kalamaja', 'Kadriorg', 'Vanalinn', 'Telliskivi', 'Pirita'],
    },
    {
      name: 'Tartu',
      center: { lat: 58.378, lng: 26.729 },
      districts: ['Kesklinn', 'Supilinn', 'Karlova', 'Annelinn'],
    },
    {
      name: 'Pärnu',
      center: { lat: 58.3859, lng: 24.4971 },
      districts: ['Kesklinn', 'Rannarajoon', 'Ülejõe'],
    },
  ],

  // Letonya
  lv: [
    {
      name: 'Riga',
      center: { lat: 56.9496, lng: 24.1052 },
      districts: ['Centrs', 'Vecrīga', 'Āgenskalns', 'Klusais Centrs', 'Teika'],
    },
    {
      name: 'Jūrmala',
      center: { lat: 56.968, lng: 23.7704 },
      districts: ['Majori', 'Dzintari', 'Bulduri'],
    },
    {
      name: 'Liepāja',
      center: { lat: 56.5047, lng: 21.0108 },
      districts: ['Vecliepāja', 'Jaunliepāja', 'Karosta'],
    },
  ],

  // Litvanya
  lt: [
    {
      name: 'Vilnius',
      center: { lat: 54.6872, lng: 25.2797 },
      districts: ['Senamiestis', 'Užupis', 'Naujamiestis', 'Žvėrynas', 'Antakalnis'],
    },
    {
      name: 'Kaunas',
      center: { lat: 54.8985, lng: 23.9036 },
      districts: ['Senamiestis', 'Centras', 'Žaliakalnis', 'Šančiai'],
    },
    {
      name: 'Klaipėda',
      center: { lat: 55.7033, lng: 21.1443 },
      districts: ['Senamiestis', 'Melnragė', 'Smiltynė'],
    },
  ],

  // Malta
  mt: [
    {
      name: 'Valletta',
      center: { lat: 35.8989, lng: 14.5146 },
      districts: ['Valletta Merkez', 'Floriana', 'Upper Barrakka', 'Marsamxett'],
    },
    {
      name: 'Sliema & St. Julian’s',
      center: { lat: 35.9125, lng: 14.5029 },
      districts: ['Sliema', 'St. Julian’s', 'Paceville', 'Spinola Bay', 'Gżira'],
    },
    {
      name: 'Mdina & Rabat',
      center: { lat: 35.8858, lng: 14.4031 },
      districts: ['Mdina', 'Rabat', 'Mosta'],
    },
  ],

  // Kıbrıs
  cy: [
    {
      name: 'Lefkoşa',
      center: { lat: 35.1856, lng: 33.3823 },
      districts: ['Merkez', 'Engomi', 'Strovolos', 'Dereboyu', 'Suriçi', 'Gönyeli'],
    },
    {
      name: 'Limasol',
      center: { lat: 34.7071, lng: 33.0226 },
      districts: ['Limassol Marina', 'Germasogeia', 'Mesa Geitonia', 'Agios Tychonas'],
    },
    {
      name: 'Girne',
      center: { lat: 35.3403, lng: 33.3192 },
      districts: ['Girne Liman', 'Alsancak', 'Çatalköy', 'Karakum'],
    },
    {
      name: 'Larnaka',
      center: { lat: 34.9229, lng: 33.6233 },
      districts: ['Finikoudes', 'Mackenzie', 'Skala'],
    },
  ],

  // Arnavutluk
  al: [
    {
      name: 'Tiran',
      center: { lat: 41.3275, lng: 19.8187 },
      districts: ['Blloku', 'Pazari i Ri', 'Kombinat', '21 Dhjetori', 'Liqeni Artificial'],
    },
    {
      name: 'Dıraç (Durrës)',
      center: { lat: 41.3246, lng: 19.4565 },
      districts: ['Vollga', 'Plazh', 'Qendra'],
    },
    {
      name: 'Avlonya (Vlorë)',
      center: { lat: 40.4661, lng: 19.4914 },
      districts: ['Lungomare', 'Uji i Ftohtë', 'Muradie'],
    },
    {
      name: 'İşkodra (Shkodër)',
      center: { lat: 42.0693, lng: 19.5033 },
      districts: ['Gjuhadol', 'Piazza', 'Rozafa'],
    },
  ],

  // Kuzey Makedonya
  mk: [
    {
      name: 'Üsküp',
      center: { lat: 41.9973, lng: 21.428 },
      districts: ['Centar', 'Debar Maalo', 'Karpoš', 'Eski Türk Çarşısı', 'Aerodrom'],
    },
    {
      name: 'Ohri',
      center: { lat: 41.1231, lng: 20.8016 },
      districts: ['Eski Şehir', 'Kaneo', 'Çarşı'],
    },
    {
      name: 'Manastır (Bitola)',
      center: { lat: 41.0297, lng: 21.3292 },
      districts: ['Širok Sokak', 'Yeni Mahalle', 'Merkez'],
    },
  ],

  // Bosna-Hersek
  ba: [
    {
      name: 'Saraybosna',
      center: { lat: 43.8563, lng: 18.4131 },
      districts: ['Baščaršija', 'Centar', 'Grbavica', 'Marijin Dvor', 'Ilidža', 'Bistrik'],
    },
    {
      name: 'Mostar',
      center: { lat: 43.3438, lng: 17.8078 },
      districts: ['Stari Grad', 'Kujundžiluk', 'Carina', 'Bijeli Brijeg'],
    },
    {
      name: 'Banja Luka',
      center: { lat: 44.7722, lng: 17.191 },
      districts: ['Centar', 'Borik', 'Obilićevo'],
    },
    {
      name: 'Tuzla',
      center: { lat: 44.5384, lng: 18.6671 },
      districts: ['Korzo', 'Slatina', 'Brčanska Malta'],
    },
  ],

  // Karadağ
  me: [
    {
      name: 'Podgorica',
      center: { lat: 42.4304, lng: 19.2594 },
      districts: ['Centar', 'Preko Morače', 'City Kvart', 'Stara Varoš'],
    },
    {
      name: 'Budva',
      center: { lat: 42.2911, lng: 18.8403 },
      districts: ['Stari Grad', 'Becici', 'Slovenska Plaža'],
    },
    {
      name: 'Kotor',
      center: { lat: 42.4247, lng: 18.7712 },
      districts: ['Kotor Eski Şehir', 'Dobrota', 'Perast'],
    },
  ],

  // Moldova
  md: [
    {
      name: 'Kişinev',
      center: { lat: 47.0105, lng: 28.8638 },
      districts: ['Centru', 'Botanica', 'Rîșcani', 'Buiucani', 'Ciocana'],
    },
    {
      name: 'Bălți',
      center: { lat: 47.7617, lng: 27.9289 },
      districts: ['Centru', 'Dacia', 'Pământeni'],
    },
    {
      name: 'Komrat (Gagavuzya)',
      center: { lat: 46.3003, lng: 28.6572 },
      districts: ['Merkez', 'Tukan', 'Zarechnyi'],
    },
  ],

  // Belarus
  by: [
    {
      name: 'Minsk',
      center: { lat: 53.9006, lng: 27.559 },
      districts: ['Tsentralny', 'Sovetsky', 'Pervomaysky', 'Oktyabrsky', 'Nemiga'],
    },
    {
      name: 'Brest',
      center: { lat: 52.0976, lng: 23.7341 },
      districts: ['Leninsky', 'Moskovsky', 'Sovetskaya'],
    },
    {
      name: 'Grodno',
      center: { lat: 53.6694, lng: 23.8131 },
      districts: ['Leninsky', 'Oktyabrsky'],
    },
  ],

  // Andorra
  ad: [
    {
      name: 'Andorra la Vella',
      center: { lat: 42.5063, lng: 1.5218 },
      districts: ['Merkez', 'Barri Antic', 'Santa Coloma'],
    },
    {
      name: 'Escaldes-Engordany',
      center: { lat: 42.5092, lng: 1.5408 },
      districts: ['Escaldes-Engordany', 'Vivand', 'Engolasters'],
    },
    {
      name: 'Encamp & La Massana',
      center: { lat: 42.5361, lng: 1.5829 },
      districts: ['Encamp', 'Pas de la Casa', 'La Massana'],
    },
  ],

  // Monako
  mc: [
    {
      name: 'Monte Carlo',
      center: { lat: 43.7398, lng: 7.4272 },
      districts: ['Monte Carlo', 'Carré d’Or', 'Larvotto', 'Saint-Roman'],
    },
    {
      name: 'La Condamine & Monaco-Ville',
      center: { lat: 43.7347, lng: 7.4197 },
      districts: ['La Condamine', 'Monaco-Ville (Le Rocher)', 'Port Hercule'],
    },
    {
      name: 'Fontvieille',
      center: { lat: 43.7276, lng: 7.4178 },
      districts: ['Fontvieille', 'Moneghetti', 'Jardin Exotique'],
    },
  ],

  // San Marino
  sm: [
    {
      name: 'San Marino (Città)',
      center: { lat: 43.9424, lng: 12.4578 },
      districts: ['Centro Storico', 'Murata', 'Cà Berlone'],
    },
    {
      name: 'Borgo Maggiore & Serravalle',
      center: { lat: 43.9522, lng: 12.45 },
      districts: ['Borgo Maggiore', 'Serravalle', 'Dogana', 'Domagnano'],
    },
  ],

  // Lihtenştayn
  li: [
    {
      name: 'Vaduz',
      center: { lat: 47.141, lng: 9.5209 },
      districts: ['Vaduz Merkez', 'Städtle', 'Mühleholz'],
    },
    {
      name: 'Schaan & Triesen',
      center: { lat: 47.1649, lng: 9.5087 },
      districts: ['Schaan', 'Triesen', 'Balzers', 'Eschen'],
    },
  ],

  // Vatikan
  va: [
    {
      name: 'Vatikan & Çevresi',
      center: { lat: 41.9029, lng: 12.4534 },
      districts: ['San Pietro Meydanı', 'Borgo', 'Prati Çevresi', 'Via della Conciliazione'],
    },
  ],
};

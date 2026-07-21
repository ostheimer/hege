import type { DemoData } from "./types";

export const demoData: DemoData = {
  reviere: [
    {
      id: "revier-attersee",
      tenantKey: "gaenserndorf",
      name: "Jagdgesellschaft Gänserndorf",
      bundesland: "Niederösterreich",
      bezirk: "Gänserndorf",
      flaecheHektar: 2150,
      setupCompletedAt: "2026-04-01T09:00:00+02:00",
      zentrum: {
        lat: 48.3394,
        lng: 16.7202,
        label: "Gänserndorf"
      }
    }
  ],
  users: [
    {
      id: "user-steyrer",
      name: "Andreas Ostheimer",
      phone: "+43 660 0000000",
      email: "andreas@ostheimer.at",
      username: "ostheimer"
    },
    {
      id: "user-revierleitung",
      name: "Anna Müller",
      phone: "+43 660 1001001",
      email: "anna.mueller@hege.app",
      username: "revieradmin"
    },
    {
      id: "user-huber",
      name: "Lukas Huber",
      phone: "+43 676 1002003",
      email: "lukas.huber@hege.app",
      username: "huber"
    },
    {
      id: "user-mair",
      name: "Martin Mair",
      phone: "+43 660 7008009",
      email: "martin.mair@hege.app",
      username: "mair"
    },
    {
      id: "user-gruber",
      name: "Stefan Gruber",
      phone: "+43 664 2110011",
      email: "stefan.gruber@hege.app",
      username: "gruber"
    },
    {
      id: "user-berger",
      name: "Johann Berger",
      phone: "+43 676 3220022",
      email: "johann.berger@hege.app",
      username: "berger"
    },
    {
      id: "user-maier",
      name: "Christine Maier",
      phone: "+43 699 4330033",
      email: "christine.maier@hege.app",
      username: "maier"
    },
    {
      id: "user-hofer",
      name: "Wolfgang Hofer",
      phone: "+43 660 5440044",
      email: "wolfgang.hofer@hege.app",
      username: "hofer"
    },
    {
      id: "user-steiner",
      name: "Birgit Steiner",
      phone: "+43 664 6550055",
      email: "birgit.steiner@hege.app",
      username: "steiner"
    },
    {
      id: "user-lehner",
      name: "Klaus Lehner",
      phone: "+43 676 7660066",
      email: "klaus.lehner@hege.app",
      username: "lehner"
    },
    {
      id: "user-bauer",
      name: "Gerhard Bauer",
      phone: "+43 699 8770077",
      email: "gerhard.bauer@hege.app",
      username: "bauer"
    },
    {
      id: "user-pichler",
      name: "Petra Pichler",
      phone: "+43 660 9880088",
      email: "petra.pichler@hege.app",
      username: "pichler"
    }
  ],
  memberships: [
    {
      id: "member-admin",
      userId: "user-revierleitung",
      revierId: "revier-attersee",
      role: "revier-admin",
      jagdzeichen: "RL-01",
      pushEnabled: true
    },
    {
      id: "member-ausgeher",
      userId: "user-steyrer",
      revierId: "revier-attersee",
      role: "platform-admin",
      jagdzeichen: "AO-01",
      pushEnabled: true
    },
    {
      id: "member-schrift",
      userId: "user-mair",
      revierId: "revier-attersee",
      role: "schriftfuehrer",
      jagdzeichen: "MM-04",
      pushEnabled: true
    },
    {
      id: "member-jaeger",
      userId: "user-huber",
      revierId: "revier-attersee",
      role: "jaeger",
      jagdzeichen: "LH-07",
      pushEnabled: true
    },
    {
      id: "member-gruber",
      userId: "user-gruber",
      revierId: "revier-attersee",
      role: "schriftfuehrer",
      jagdzeichen: "SG-12",
      pushEnabled: true
    },
    {
      id: "member-berger",
      userId: "user-berger",
      revierId: "revier-attersee",
      role: "jaeger",
      jagdzeichen: "JB-07",
      pushEnabled: true
    },
    {
      id: "member-maier",
      userId: "user-maier",
      revierId: "revier-attersee",
      role: "jaeger",
      jagdzeichen: "CM-15",
      pushEnabled: true
    },
    {
      id: "member-hofer",
      userId: "user-hofer",
      revierId: "revier-attersee",
      role: "jaeger",
      jagdzeichen: "WH-22",
      pushEnabled: true
    },
    {
      id: "member-steiner",
      userId: "user-steiner",
      revierId: "revier-attersee",
      role: "ausgeher",
      jagdzeichen: "BS-09",
      pushEnabled: false
    },
    {
      id: "member-lehner",
      userId: "user-lehner",
      revierId: "revier-attersee",
      role: "jaeger",
      jagdzeichen: "KL-31",
      pushEnabled: true
    },
    {
      id: "member-bauer",
      userId: "user-bauer",
      revierId: "revier-attersee",
      role: "jaeger",
      jagdzeichen: "GB-44",
      pushEnabled: true
    },
    {
      id: "member-pichler",
      userId: "user-pichler",
      revierId: "revier-attersee",
      role: "ausgeher",
      jagdzeichen: "PP-18",
      pushEnabled: true
    }
  ],
  devices: [
    {
      id: "device-andreas",
      membershipId: "member-ausgeher",
      platform: "ios",
      pushToken: "expo-token-andreas",
      lastSeenAt: "2026-04-03T08:05:00+02:00"
    },
    {
      id: "device-lukas",
      membershipId: "member-jaeger",
      platform: "android",
      pushToken: "expo-token-lukas",
      lastSeenAt: "2026-04-03T07:55:00+02:00"
    }
  ],
  ansitze: [
    {
      id: "ansitz-1",
      revierId: "revier-attersee",
      membershipId: "member-ausgeher",
      standortId: "einrichtung-1",
      standortName: "Hochstand Weikendorfer Remise",
      location: {
        lat: 48.3512,
        lng: 16.7258,
        label: "Weikendorfer Remise"
      },
      startedAt: "2026-04-03T05:45:00+02:00",
      plannedEndAt: "2026-04-03T09:30:00+02:00",
      note: "Rehwildwechsel am Feldrand beobachten.",
      status: "active",
      conflict: false
    },
    {
      id: "ansitz-2",
      revierId: "revier-attersee",
      membershipId: "member-admin",
      standortId: "einrichtung-3",
      standortName: "Ansitz Marchfeldrand",
      location: {
        lat: 48.3336,
        lng: 16.7014,
        label: "Marchfeldrand"
      },
      startedAt: "2026-04-03T06:10:00+02:00",
      note: "Kurzer Frühansitz wegen Wildschaden am Mais.",
      status: "active",
      conflict: false
    },
    {
      id: "ansitz-3",
      revierId: "revier-attersee",
      membershipId: "member-jaeger",
      standortId: "einrichtung-5",
      standortName: "Hochstand Schilfdamm",
      location: {
        lat: 48.3712,
        lng: 16.7182,
        label: "Schilfdamm Strasshof"
      },
      startedAt: "2026-04-02T18:45:00+02:00",
      endedAt: "2026-04-02T21:10:00+02:00",
      note: "Abendansitz auf Schwarzwild, ohne Anblick.",
      status: "completed",
      conflict: false
    },
    {
      id: "ansitz-4",
      revierId: "revier-attersee",
      membershipId: "member-berger",
      standortId: "einrichtung-7",
      standortName: "Kanzel Aderklaa Nord",
      location: {
        lat: 48.3022,
        lng: 16.6932,
        label: "Aderklaa Feldweg"
      },
      startedAt: "2026-04-01T05:30:00+02:00",
      endedAt: "2026-04-01T08:45:00+02:00",
      note: "Frühansitz, ein Stück Rehwild beobachtet.",
      status: "completed",
      conflict: false
    },
    {
      id: "ansitz-5",
      revierId: "revier-attersee",
      membershipId: "member-hofer",
      standortId: "einrichtung-9",
      standortName: "Hochstand Marchegger Au",
      location: {
        lat: 48.2778,
        lng: 16.9028,
        label: "Marchegger Au"
      },
      startedAt: "2026-03-28T17:30:00+01:00",
      endedAt: "2026-03-28T20:45:00+01:00",
      note: "Bockansitz am Auwaldrand.",
      status: "completed",
      conflict: false
    },
    {
      id: "ansitz-6",
      revierId: "revier-attersee",
      membershipId: "member-maier",
      standortId: "einrichtung-4",
      standortName: "Kanzel Pirschweg West",
      location: {
        lat: 48.3398,
        lng: 16.7401,
        label: "Pirschweg West"
      },
      startedAt: "2026-03-25T05:55:00+01:00",
      endedAt: "2026-03-25T08:20:00+01:00",
      note: "Routine-Ansitz, ruhiger Morgen.",
      status: "completed",
      conflict: false
    },
    {
      id: "ansitz-7",
      revierId: "revier-attersee",
      membershipId: "member-lehner",
      standortId: "einrichtung-6",
      standortName: "Hochstand Sandberg Süd",
      location: {
        lat: 48.3216,
        lng: 16.7345,
        label: "Sandberg Süd"
      },
      startedAt: "2026-03-22T18:00:00+01:00",
      endedAt: "2026-03-22T20:55:00+01:00",
      note: "Anwartung Schwarzwild am Maisfeldrand.",
      status: "completed",
      conflict: false
    }
  ],
  reviereinrichtungen: [
    {
      id: "einrichtung-1",
      revierId: "revier-attersee",
      type: "hochstand",
      name: "Hochstand Weikendorfer Remise",
      status: "gut",
      location: {
        lat: 48.3512,
        lng: 16.7258,
        label: "Weikendorfer Remise"
      },
      beschreibung: "Leiterstand mit Blick auf Remise und Feldkante.",
      photos: [
        {
          id: "photo-stand-1",
          title: "Weikendorfer Remise Ostseite",
          url: "https://images.example.invalid/weikendorfer-remise.jpg",
          createdAt: "2026-03-28T10:00:00+01:00"
        }
      ],
      kontrollen: [
        {
          id: "kontrolle-1",
          createdAt: "2026-03-28T10:00:00+01:00",
          createdByMembershipId: "member-admin",
          zustand: "gut",
          note: "Leiter und Dach in Ordnung."
        },
        {
          id: "kontrolle-1b",
          createdAt: "2026-02-12T14:30:00+01:00",
          createdByMembershipId: "member-jaeger",
          zustand: "gut",
          note: "Witterungscheck nach Sturm, alles dicht."
        }
      ],
      wartung: []
    },
    {
      id: "einrichtung-2",
      revierId: "revier-attersee",
      type: "fuetterung",
      name: "Fütterung Feldweg Nord",
      status: "wartung-faellig",
      location: {
        lat: 48.3468,
        lng: 16.7361,
        label: "Feldweg Nord"
      },
      beschreibung: "Winterfütterung entlang der Windschutzhecke.",
      photos: [],
      kontrollen: [
        {
          id: "kontrolle-2",
          createdAt: "2026-04-01T07:15:00+02:00",
          createdByMembershipId: "member-jaeger",
          zustand: "wartung-faellig",
          note: "Deckel verzogen, Nachfüllung schwierig."
        },
        {
          id: "kontrolle-2b",
          createdAt: "2026-02-22T09:45:00+01:00",
          createdByMembershipId: "member-berger",
          zustand: "gut",
          note: "Heuvorrat aufgefüllt."
        }
      ],
      wartung: [
        {
          id: "wartung-1",
          dueAt: "2026-04-06T16:00:00+02:00",
          status: "offen",
          title: "Deckel richten",
          note: "Holzleiste tauschen."
        }
      ]
    },
    {
      id: "einrichtung-3",
      revierId: "revier-attersee",
      type: "hochstand",
      name: "Ansitz Marchfeldrand",
      status: "gut",
      location: {
        lat: 48.3336,
        lng: 16.7014,
        label: "Marchfeldrand"
      },
      beschreibung: "Schwenkbarer Stuhl, ideal bei Nordwestwind.",
      photos: [],
      kontrollen: [
        {
          id: "kontrolle-3a",
          createdAt: "2026-03-18T09:00:00+01:00",
          createdByMembershipId: "member-admin",
          zustand: "gut",
          note: "Stand wackelfrei, Sitzkissen erneuert."
        },
        {
          id: "kontrolle-3b",
          createdAt: "2026-01-30T13:20:00+01:00",
          createdByMembershipId: "member-hofer",
          zustand: "gut"
        }
      ],
      wartung: []
    },
    {
      id: "einrichtung-4",
      revierId: "revier-attersee",
      type: "kirrung",
      name: "Kanzel Pirschweg West",
      status: "gut",
      location: {
        lat: 48.3398,
        lng: 16.7401,
        label: "Pirschweg West"
      },
      beschreibung: "Kanzel mit kleiner Kirrung an der Hecke.",
      photos: [],
      kontrollen: [
        {
          id: "kontrolle-4a",
          createdAt: "2026-03-15T16:30:00+01:00",
          createdByMembershipId: "member-maier",
          zustand: "gut",
          note: "Kirrungsschüssel sauber, frischer Mais."
        },
        {
          id: "kontrolle-4b",
          createdAt: "2026-01-19T11:00:00+01:00",
          createdByMembershipId: "member-lehner",
          zustand: "gut"
        }
      ],
      wartung: []
    },
    {
      id: "einrichtung-5",
      revierId: "revier-attersee",
      type: "hochstand",
      name: "Hochstand Schilfdamm",
      status: "gut",
      location: {
        lat: 48.3712,
        lng: 16.7182,
        label: "Schilfdamm Strasshof"
      },
      beschreibung: "Hochstand am Schilfdamm Richtung Strasshof.",
      photos: [],
      kontrollen: [
        {
          id: "kontrolle-5a",
          createdAt: "2026-03-26T08:15:00+01:00",
          createdByMembershipId: "member-jaeger",
          zustand: "gut",
          note: "Leiterbänder nachgespannt."
        },
        {
          id: "kontrolle-5b",
          createdAt: "2026-02-04T10:45:00+01:00",
          createdByMembershipId: "member-bauer",
          zustand: "gut"
        }
      ],
      wartung: [
        {
          id: "wartung-5",
          dueAt: "2026-03-12T12:00:00+01:00",
          status: "erledigt",
          title: "Leiterbänder erneuern",
          note: "Edelstahlbänder verbaut."
        }
      ]
    },
    {
      id: "einrichtung-6",
      revierId: "revier-attersee",
      type: "hochstand",
      name: "Hochstand Sandberg Süd",
      status: "wartung-faellig",
      location: {
        lat: 48.3216,
        lng: 16.7345,
        label: "Sandberg Süd"
      },
      beschreibung: "Holzhochstand am Sandberg Hangkante.",
      photos: [],
      kontrollen: [
        {
          id: "kontrolle-6a",
          createdAt: "2026-03-30T17:00:00+02:00",
          createdByMembershipId: "member-lehner",
          zustand: "wartung-faellig",
          note: "Eine Stiege locker."
        },
        {
          id: "kontrolle-6b",
          createdAt: "2026-02-14T14:00:00+01:00",
          createdByMembershipId: "member-hofer",
          zustand: "gut"
        }
      ],
      wartung: [
        {
          id: "wartung-6",
          dueAt: "2026-04-12T16:00:00+02:00",
          status: "erledigt",
          title: "Stiege nachschrauben",
          note: "Zusätzliche Verschraubung montieren."
        }
      ]
    },
    {
      id: "einrichtung-7",
      revierId: "revier-attersee",
      type: "hochstand",
      name: "Kanzel Aderklaa Nord",
      status: "gut",
      location: {
        lat: 48.3022,
        lng: 16.6932,
        label: "Aderklaa Feldweg"
      },
      beschreibung: "Geschlossene Kanzel mit Heizung.",
      photos: [],
      kontrollen: [
        {
          id: "kontrolle-7a",
          createdAt: "2026-04-01T15:30:00+02:00",
          createdByMembershipId: "member-berger",
          zustand: "gut",
          note: "Heizgerät kontrolliert."
        },
        {
          id: "kontrolle-7b",
          createdAt: "2026-01-28T09:30:00+01:00",
          createdByMembershipId: "member-admin",
          zustand: "gut"
        }
      ],
      wartung: []
    },
    {
      id: "einrichtung-8",
      revierId: "revier-attersee",
      type: "salzlecke",
      name: "Salzlecke Eichenbusch",
      status: "gut",
      location: {
        lat: 48.3565,
        lng: 16.7095,
        label: "Eichenbusch"
      },
      beschreibung: "Salzlecke an alter Eiche, ganzjährig genutzt.",
      photos: [],
      kontrollen: [
        {
          id: "kontrolle-8a",
          createdAt: "2026-03-20T11:30:00+01:00",
          createdByMembershipId: "member-maier",
          zustand: "gut",
          note: "Salzstein erneuert."
        },
        {
          id: "kontrolle-8b",
          createdAt: "2026-01-12T15:15:00+01:00",
          createdByMembershipId: "member-pichler",
          zustand: "gut"
        }
      ],
      wartung: []
    },
    {
      id: "einrichtung-9",
      revierId: "revier-attersee",
      type: "hochstand",
      name: "Hochstand Marchegger Au",
      status: "gut",
      location: {
        lat: 48.2778,
        lng: 16.9028,
        label: "Marchegger Au"
      },
      beschreibung: "Hochstand am Auwaldrand Richtung March.",
      photos: [],
      kontrollen: [
        {
          id: "kontrolle-9a",
          createdAt: "2026-03-29T10:00:00+02:00",
          createdByMembershipId: "member-hofer",
          zustand: "gut",
          note: "Dach kontrolliert, dicht."
        },
        {
          id: "kontrolle-9b",
          createdAt: "2026-02-08T13:00:00+01:00",
          createdByMembershipId: "member-jaeger",
          zustand: "gut"
        }
      ],
      wartung: []
    },
    {
      id: "einrichtung-10",
      revierId: "revier-attersee",
      type: "fuetterung",
      name: "Fütterung Lange Furche",
      status: "gut",
      location: {
        lat: 48.3623,
        lng: 16.7521,
        label: "Lange Furche"
      },
      beschreibung: "Winterfütterung an der Lange Furche, gemeinsam mit Nachbarrevier.",
      photos: [],
      kontrollen: [
        {
          id: "kontrolle-10a",
          createdAt: "2026-03-12T09:30:00+01:00",
          createdByMembershipId: "member-bauer",
          zustand: "gut",
          note: "Heu und Salz aufgefüllt."
        },
        {
          id: "kontrolle-10b",
          createdAt: "2026-01-22T08:45:00+01:00",
          createdByMembershipId: "member-berger",
          zustand: "gut"
        }
      ],
      wartung: [
        {
          id: "wartung-10",
          dueAt: "2026-05-02T10:00:00+02:00",
          status: "erledigt",
          title: "Sommerputz",
          note: "Alle Trogeinsätze reinigen."
        }
      ]
    },
    {
      id: "einrichtung-11",
      revierId: "revier-attersee",
      type: "hochstand",
      name: "Hochstand Russenheidengraben",
      status: "gesperrt",
      location: {
        lat: 48.3158,
        lng: 16.7589,
        label: "Russenheidengraben"
      },
      beschreibung: "Älterer Holzhochstand, derzeit gesperrt.",
      photos: [],
      kontrollen: [
        {
          id: "kontrolle-11a",
          createdAt: "2026-03-08T14:15:00+01:00",
          createdByMembershipId: "member-lehner",
          zustand: "gesperrt",
          note: "Dach undicht, Holm gerissen. Nicht besteigen."
        },
        {
          id: "kontrolle-11b",
          createdAt: "2026-01-15T11:00:00+01:00",
          createdByMembershipId: "member-admin",
          zustand: "wartung-faellig"
        }
      ],
      wartung: [
        {
          id: "wartung-11",
          dueAt: "2026-04-25T09:00:00+02:00",
          status: "erledigt",
          title: "Komplettsanierung",
          note: "Neuaufbau geplant, Holz besorgt."
        }
      ]
    },
    {
      id: "einrichtung-12",
      revierId: "revier-attersee",
      type: "salzlecke",
      name: "Salzlecke Kreuzweg",
      status: "gut",
      location: {
        lat: 48.3279,
        lng: 16.6985,
        label: "Kreuzweg Aderklaa"
      },
      beschreibung: "Salzlecke am Kreuzweg, gut frequentiert.",
      photos: [],
      kontrollen: [
        {
          id: "kontrolle-12a",
          createdAt: "2026-03-21T16:45:00+01:00",
          createdByMembershipId: "member-maier",
          zustand: "gut",
          note: "Salzblock fast aufgebraucht."
        },
        {
          id: "kontrolle-12b",
          createdAt: "2026-02-01T10:30:00+01:00",
          createdByMembershipId: "member-pichler",
          zustand: "gut"
        }
      ],
      wartung: []
    }
  ],
  fallwild: [
    {
      id: "fallwild-1",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-ausgeher",
      recordedAt: "2026-04-03T06:55:00+02:00",
      location: {
        lat: 48.3441,
        lng: 16.7289,
        label: "B8 Abzweigung Weikendorf",
        source: "device-gps",
        addressLabel: "B8, 2230 Gänserndorf"
      },
      wildart: "Reh",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Gänserndorf",
      strasse: "B8",
      roadReference: {
        roadName: "B8",
        roadKilometer: "33,4",
        source: "gip"
      },
      note: "Gemeinsam mit Straßenmeisterei gesichert.",
      photos: [
        {
          id: "photo-fallwild-1",
          title: "Unfallstelle",
          url: "https://images.example.invalid/fallwild-1.jpg",
          createdAt: "2026-04-03T06:56:00+02:00"
        }
      ]
    },
    {
      id: "fallwild-2",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-jaeger",
      recordedAt: "2026-04-02T19:35:00+02:00",
      location: {
        lat: 48.3658,
        lng: 16.7129,
        label: "L3013 Strasshof",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "maennlich",
      altersklasse: "Jaehrling",
      bergungsStatus: "geborgen",
      gemeinde: "Strasshof an der Nordbahn",
      strasse: "L3013",
      roadReference: {
        roadName: "L3013",
        roadKilometer: "4,1",
        source: "gip"
      },
      note: "Nach Verkehrsunfall an die Strecke gelegt.",
      photos: []
    },
    {
      id: "fallwild-3",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-berger",
      recordedAt: "2026-04-01T22:10:00+02:00",
      location: {
        lat: 48.3034,
        lng: 16.6942,
        label: "Aderklaaer Straße",
        source: "device-gps"
      },
      wildart: "Fuchs",
      geschlecht: "maennlich",
      altersklasse: "Adult",
      bergungsStatus: "entsorgt",
      gemeinde: "Aderklaa",
      strasse: "Aderklaaer Straße",
      roadReference: {
        roadName: "L11",
        roadKilometer: "6,8",
        source: "gip"
      },
      note: "Verkehrsopfer, an Sammelstelle übergeben.",
      photos: []
    },
    {
      id: "fallwild-4",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-hofer",
      recordedAt: "2026-04-01T05:50:00+02:00",
      location: {
        lat: 48.2782,
        lng: 16.9034,
        label: "Marchegger Au, Forstweg",
        source: "device-gps"
      },
      wildart: "Schwarzwild",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Marchegg",
      strasse: "Forstweg",
      note: "Bachenfund am Weg, Trichinenprobe entnommen.",
      photos: []
    },
    {
      id: "fallwild-5",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-maier",
      recordedAt: "2026-03-30T07:20:00+02:00",
      location: {
        lat: 48.3398,
        lng: 16.7401,
        label: "Pirschweg West",
        source: "device-gps"
      },
      wildart: "Hase",
      geschlecht: "unbekannt",
      altersklasse: "Adult",
      bergungsStatus: "entsorgt",
      gemeinde: "Gänserndorf",
      strasse: "Pirschweg",
      note: "Vermutlich Greifvogelriss.",
      photos: []
    },
    {
      id: "fallwild-6",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-lehner",
      recordedAt: "2026-03-29T20:55:00+02:00",
      location: {
        lat: 48.3216,
        lng: 16.7345,
        label: "Sandberg Süd",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "an-behoerde-gemeldet",
      gemeinde: "Gänserndorf",
      strasse: "Sandbergstraße",
      roadReference: {
        roadName: "Sandbergstraße",
        roadKilometer: "2,3",
        source: "manual"
      },
      note: "Gemeldet, Behörde nimmt Probe.",
      photos: []
    },
    {
      id: "fallwild-7",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-berger",
      recordedAt: "2026-03-28T18:05:00+01:00",
      location: {
        lat: 48.3018,
        lng: 16.6918,
        label: "Aderklaa Hauptstraße",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "maennlich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Aderklaa",
      strasse: "Hauptstraße",
      roadReference: {
        roadName: "L11",
        roadKilometer: "5,9",
        source: "gip"
      },
      photos: []
    },
    {
      id: "fallwild-8",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-bauer",
      recordedAt: "2026-03-26T16:40:00+01:00",
      location: {
        lat: 48.3623,
        lng: 16.7521,
        label: "Lange Furche",
        source: "device-gps"
      },
      wildart: "Dachs",
      geschlecht: "maennlich",
      altersklasse: "Adult",
      bergungsStatus: "entsorgt",
      gemeinde: "Weikendorf",
      strasse: "Feldweg",
      note: "Wahrscheinlich Krankheit, Tierarzt informiert.",
      photos: []
    },
    {
      id: "fallwild-9",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-jaeger",
      recordedAt: "2026-03-24T06:30:00+01:00",
      location: {
        lat: 48.3712,
        lng: 16.7182,
        label: "Schilfdamm Strasshof",
        source: "device-gps"
      },
      wildart: "Schwarzwild",
      geschlecht: "maennlich",
      altersklasse: "Jaehrling",
      bergungsStatus: "geborgen",
      gemeinde: "Strasshof an der Nordbahn",
      strasse: "Schilfdamm",
      photos: []
    },
    {
      id: "fallwild-10",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-maier",
      recordedAt: "2026-03-21T09:10:00+01:00",
      location: {
        lat: 48.3398,
        lng: 16.7401,
        label: "Pirschweg West Kanzel",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "weiblich",
      altersklasse: "Kitz",
      bergungsStatus: "an-behoerde-gemeldet",
      gemeinde: "Gänserndorf",
      strasse: "Pirschweg",
      note: "Verdacht auf Mähverlust.",
      photos: []
    },
    {
      id: "fallwild-11",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-hofer",
      recordedAt: "2026-03-19T17:25:00+01:00",
      location: {
        lat: 48.2778,
        lng: 16.9028,
        label: "Marchegger Au",
        source: "device-gps"
      },
      wildart: "Rotwild",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Marchegg",
      strasse: "Auwaldweg",
      note: "Tier verendet, sauber gemeldet.",
      photos: []
    },
    {
      id: "fallwild-12",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-berger",
      recordedAt: "2026-03-17T08:50:00+01:00",
      location: {
        lat: 48.3022,
        lng: 16.6932,
        label: "Aderklaa Feldweg",
        source: "device-gps"
      },
      wildart: "Fuchs",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "entsorgt",
      gemeinde: "Aderklaa",
      strasse: "Feldweg",
      photos: []
    },
    {
      id: "fallwild-13",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-lehner",
      recordedAt: "2026-03-15T19:30:00+01:00",
      location: {
        lat: 48.3216,
        lng: 16.7345,
        label: "Sandberg Süd",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "maennlich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Gänserndorf",
      strasse: "Sandbergstraße",
      photos: []
    },
    {
      id: "fallwild-14",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-bauer",
      recordedAt: "2026-03-12T11:05:00+01:00",
      location: {
        lat: 48.3565,
        lng: 16.7095,
        label: "Eichenbusch",
        source: "device-gps"
      },
      wildart: "Hase",
      geschlecht: "unbekannt",
      altersklasse: "Adult",
      bergungsStatus: "entsorgt",
      gemeinde: "Weikendorf",
      strasse: "Eichengasse",
      note: "Vermutlich Hauskatzenriss.",
      photos: []
    },
    {
      id: "fallwild-15",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-jaeger",
      recordedAt: "2026-03-08T22:40:00+01:00",
      location: {
        lat: 48.3712,
        lng: 16.7182,
        label: "L3013 Strasshof",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Strasshof an der Nordbahn",
      strasse: "L3013",
      roadReference: {
        roadName: "L3013",
        roadKilometer: "5,2",
        source: "gip"
      },
      photos: []
    },
    {
      id: "fallwild-16",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-pichler",
      recordedAt: "2026-03-04T07:15:00+01:00",
      location: {
        lat: 48.3279,
        lng: 16.6985,
        label: "Kreuzweg Aderklaa",
        source: "device-gps"
      },
      wildart: "Schwarzwild",
      geschlecht: "weiblich",
      altersklasse: "Jaehrling",
      bergungsStatus: "geborgen",
      gemeinde: "Aderklaa",
      strasse: "Kreuzweg",
      note: "Trichinenprobe gemeldet.",
      photos: []
    },
    {
      id: "fallwild-17",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-maier",
      recordedAt: "2026-02-28T14:25:00+01:00",
      location: {
        lat: 48.3441,
        lng: 16.7289,
        label: "B8 Abzweigung",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "maennlich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Gänserndorf",
      strasse: "B8",
      roadReference: {
        roadName: "B8",
        roadKilometer: "32,9",
        source: "gip"
      },
      photos: []
    },
    {
      id: "fallwild-18",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-hofer",
      recordedAt: "2026-02-22T18:50:00+01:00",
      location: {
        lat: 48.2778,
        lng: 16.9028,
        label: "Marchegger Au",
        source: "device-gps"
      },
      wildart: "Rotwild",
      geschlecht: "maennlich",
      altersklasse: "Adult",
      bergungsStatus: "an-behoerde-gemeldet",
      gemeinde: "Marchegg",
      strasse: "Auwaldweg",
      note: "Stark verletzt, Förster informiert.",
      photos: []
    },
    {
      id: "fallwild-19",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-lehner",
      recordedAt: "2026-02-15T09:20:00+01:00",
      location: {
        lat: 48.3216,
        lng: 16.7345,
        label: "Sandberg Süd",
        source: "device-gps"
      },
      wildart: "Muffelwild",
      geschlecht: "maennlich",
      altersklasse: "Adult",
      bergungsStatus: "erfasst",
      gemeinde: "Gänserndorf",
      strasse: "Sandbergstraße",
      note: "Selten in dieser Gegend, Sichtmeldung beigelegt.",
      photos: []
    },
    {
      id: "fallwild-20",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-berger",
      recordedAt: "2026-02-08T13:40:00+01:00",
      location: {
        lat: 48.3034,
        lng: 16.6942,
        label: "Aderklaaer Straße",
        source: "device-gps"
      },
      wildart: "Fuchs",
      geschlecht: "weiblich",
      altersklasse: "Jaehrling",
      bergungsStatus: "entsorgt",
      gemeinde: "Aderklaa",
      strasse: "Aderklaaer Straße",
      roadReference: {
        roadName: "L11",
        roadKilometer: "6,2",
        source: "gip"
      },
      photos: []
    },
    {
      id: "fallwild-21",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-bauer",
      recordedAt: "2026-01-30T16:15:00+01:00",
      location: {
        lat: 48.3623,
        lng: 16.7521,
        label: "Lange Furche",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Weikendorf",
      strasse: "Feldweg",
      photos: []
    },
    {
      id: "fallwild-22",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-jaeger",
      recordedAt: "2026-01-21T08:05:00+01:00",
      location: {
        lat: 48.3658,
        lng: 16.7129,
        label: "L3013 Strasshof",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "maennlich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Strasshof an der Nordbahn",
      strasse: "L3013",
      roadReference: {
        roadName: "L3013",
        roadKilometer: "3,7",
        source: "gip"
      },
      photos: []
    },
    {
      id: "fallwild-23",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-maier",
      recordedAt: "2026-01-12T19:55:00+01:00",
      location: {
        lat: 48.3398,
        lng: 16.7401,
        label: "Pirschweg West",
        source: "device-gps"
      },
      wildart: "Hase",
      geschlecht: "unbekannt",
      altersklasse: "Adult",
      bergungsStatus: "entsorgt",
      gemeinde: "Gänserndorf",
      strasse: "Pirschweg",
      photos: []
    },
    {
      id: "fallwild-24",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-hofer",
      recordedAt: "2025-12-29T11:30:00+01:00",
      location: {
        lat: 48.2778,
        lng: 16.9028,
        label: "Marchegger Au",
        source: "device-gps"
      },
      wildart: "Schwarzwild",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Marchegg",
      strasse: "Auwaldweg",
      note: "Bache nach Drückjagd.",
      photos: []
    },
    {
      id: "fallwild-25",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-lehner",
      recordedAt: "2025-12-15T07:45:00+01:00",
      location: {
        lat: 48.3216,
        lng: 16.7345,
        label: "Sandberg Süd",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "maennlich",
      altersklasse: "Jaehrling",
      bergungsStatus: "geborgen",
      gemeinde: "Gänserndorf",
      strasse: "Sandbergstraße",
      photos: []
    },
    {
      id: "fallwild-26",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-berger",
      recordedAt: "2025-11-28T14:20:00+01:00",
      location: {
        lat: 48.3022,
        lng: 16.6932,
        label: "Aderklaa Feldweg",
        source: "device-gps"
      },
      wildart: "Fuchs",
      geschlecht: "maennlich",
      altersklasse: "Adult",
      bergungsStatus: "entsorgt",
      gemeinde: "Aderklaa",
      strasse: "Feldweg",
      photos: []
    },
    {
      id: "fallwild-27",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-bauer",
      recordedAt: "2025-11-10T09:15:00+01:00",
      location: {
        lat: 48.3565,
        lng: 16.7095,
        label: "Eichenbusch",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Weikendorf",
      strasse: "Eichengasse",
      photos: []
    },
    {
      id: "fallwild-28",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-pichler",
      recordedAt: "2025-10-22T17:40:00+02:00",
      location: {
        lat: 48.3279,
        lng: 16.6985,
        label: "Kreuzweg Aderklaa",
        source: "device-gps"
      },
      wildart: "Dachs",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "entsorgt",
      gemeinde: "Aderklaa",
      strasse: "Kreuzweg",
      photos: []
    },
    {
      id: "fallwild-29",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-jaeger",
      recordedAt: "2025-09-30T20:10:00+02:00",
      location: {
        lat: 48.3712,
        lng: 16.7182,
        label: "Schilfdamm Strasshof",
        source: "device-gps"
      },
      wildart: "Schwarzwild",
      geschlecht: "maennlich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Strasshof an der Nordbahn",
      strasse: "Schilfdamm",
      photos: []
    },
    {
      id: "fallwild-30",
      revierId: "revier-attersee",
      reportedByMembershipId: "member-maier",
      recordedAt: "2025-08-18T06:55:00+02:00",
      location: {
        lat: 48.3441,
        lng: 16.7289,
        label: "B8 Abzweigung",
        source: "device-gps"
      },
      wildart: "Reh",
      geschlecht: "weiblich",
      altersklasse: "Kitz",
      bergungsStatus: "geborgen",
      gemeinde: "Gänserndorf",
      strasse: "B8",
      roadReference: {
        roadName: "B8",
        roadKilometer: "33,1",
        source: "gip"
      },
      photos: []
    }
  ],
  reviermeldungen: [
    {
      id: "reviermeldung-1",
      revierId: "revier-attersee",
      createdByMembershipId: "member-ausgeher",
      category: "schaden",
      status: "neu",
      occurredAt: "2026-04-03T07:20:00+02:00",
      title: "Frischer Wildschaden am Maisacker",
      description: "Südlich vom Feldweg sind mehrere Reihen umgebrochen.",
      location: {
        lat: 48.3428,
        lng: 16.7334,
        label: "Feldweg Süd"
      },
      photos: [],
      createdAt: "2026-04-03T07:24:00+02:00",
      updatedAt: "2026-04-03T07:24:00+02:00"
    },
    {
      id: "reviermeldung-2",
      revierId: "revier-attersee",
      createdByMembershipId: "member-jaeger",
      category: "sichtung",
      status: "geprueft",
      occurredAt: "2026-04-02T20:15:00+02:00",
      title: "Schwarzwildrotte am Schilfdamm",
      description: "Sieben Stück Schwarzwild im Schilfgürtel beobachtet.",
      location: {
        lat: 48.3712,
        lng: 16.7182,
        label: "Schilfdamm Strasshof"
      },
      photos: [],
      createdAt: "2026-04-02T20:25:00+02:00",
      updatedAt: "2026-04-02T20:25:00+02:00"
    },
    {
      id: "reviermeldung-3",
      revierId: "revier-attersee",
      createdByMembershipId: "member-berger",
      category: "gefahr",
      status: "in_bearbeitung",
      occurredAt: "2026-04-01T22:05:00+02:00",
      title: "Verkehrsunfall mit Reh auf der L11",
      description: "PKW-Fahrer informiert, Reh ausgeflogen, Strasse vorerst frei.",
      location: {
        lat: 48.3018,
        lng: 16.6918,
        label: "L11 Aderklaa"
      },
      photos: [],
      createdAt: "2026-04-01T22:15:00+02:00",
      updatedAt: "2026-04-02T08:00:00+02:00"
    },
    {
      id: "reviermeldung-4",
      revierId: "revier-attersee",
      createdByMembershipId: "member-maier",
      category: "sonstiges",
      status: "erledigt",
      occurredAt: "2026-03-29T15:30:00+02:00",
      title: "Spaziergänger im Schongebiet",
      description: "Hund war frei laufend, Halter freundlich aufgeklärt.",
      location: {
        lat: 48.3398,
        lng: 16.7401,
        label: "Pirschweg West"
      },
      photos: [],
      createdAt: "2026-03-29T15:45:00+02:00",
      updatedAt: "2026-03-29T16:30:00+02:00"
    },
    {
      id: "reviermeldung-5",
      revierId: "revier-attersee",
      createdByMembershipId: "member-lehner",
      category: "reviereinrichtung",
      status: "in_bearbeitung",
      occurredAt: "2026-03-30T17:10:00+02:00",
      title: "Hochstand Sandberg Süd defekt",
      description: "Eine Stiege locker, Stand vorübergehend nur mit Vorsicht.",
      location: {
        lat: 48.3216,
        lng: 16.7345,
        label: "Sandberg Süd"
      },
      relatedType: "reviereinrichtung",
      relatedId: "einrichtung-6",
      photos: [],
      createdAt: "2026-03-30T17:20:00+02:00",
      updatedAt: "2026-03-31T09:00:00+02:00"
    },
    {
      id: "reviermeldung-6",
      revierId: "revier-attersee",
      createdByMembershipId: "member-bauer",
      category: "fuetterung",
      status: "erledigt",
      occurredAt: "2026-03-12T09:45:00+01:00",
      title: "Fütterung aufgefüllt",
      description: "Heu und Mineralstein bei Lange Furche nachgelegt.",
      location: {
        lat: 48.3623,
        lng: 16.7521,
        label: "Lange Furche"
      },
      relatedType: "reviereinrichtung",
      relatedId: "einrichtung-10",
      photos: [],
      createdAt: "2026-03-12T10:00:00+01:00",
      updatedAt: "2026-03-12T11:00:00+01:00"
    },
    {
      id: "reviermeldung-7",
      revierId: "revier-attersee",
      createdByMembershipId: "member-hofer",
      category: "schaden",
      status: "neu",
      occurredAt: "2026-03-22T18:30:00+01:00",
      title: "Wildverbiss in Auwald-Aufforstung",
      description: "Junge Eschen am Auwaldrand stark verbissen.",
      location: {
        lat: 48.2782,
        lng: 16.9034,
        label: "Marchegger Au"
      },
      photos: [],
      createdAt: "2026-03-22T19:00:00+01:00",
      updatedAt: "2026-03-22T19:00:00+01:00"
    },
    {
      id: "reviermeldung-8",
      revierId: "revier-attersee",
      createdByMembershipId: "member-pichler",
      category: "sonstiges",
      status: "geprueft",
      occurredAt: "2026-03-18T11:20:00+01:00",
      title: "Müllablagerung am Feldrand",
      description: "Bauschutt am Kreuzweg, Gemeinde verständigt.",
      location: {
        lat: 48.3279,
        lng: 16.6985,
        label: "Kreuzweg"
      },
      photos: [],
      createdAt: "2026-03-18T11:40:00+01:00",
      updatedAt: "2026-03-18T13:00:00+01:00"
    },
    {
      id: "reviermeldung-9",
      revierId: "revier-attersee",
      createdByMembershipId: "member-berger",
      category: "sichtung",
      status: "geprueft",
      occurredAt: "2026-03-15T07:45:00+01:00",
      title: "Rehwildwechsel an der Hecke",
      description: "Vier Rehe regelmäßig beim Maiswechsel.",
      location: {
        lat: 48.3034,
        lng: 16.6942,
        label: "Aderklaaer Hecke"
      },
      photos: [],
      createdAt: "2026-03-15T08:00:00+01:00",
      updatedAt: "2026-03-15T08:00:00+01:00"
    },
    {
      id: "reviermeldung-10",
      revierId: "revier-attersee",
      createdByMembershipId: "member-maier",
      category: "gefahr",
      status: "erledigt",
      occurredAt: "2026-03-05T22:30:00+01:00",
      title: "Wildschwein im Ortsgebiet",
      description: "Bache mit Frischlingen am Ortsrand, Polizei informiert.",
      location: {
        lat: 48.3358,
        lng: 16.7165,
        label: "Gänserndorf Ortsrand"
      },
      photos: [],
      createdAt: "2026-03-05T22:45:00+01:00",
      updatedAt: "2026-03-06T08:00:00+01:00"
    },
    {
      id: "reviermeldung-11",
      revierId: "revier-attersee",
      createdByMembershipId: "member-jaeger",
      category: "sonstiges",
      status: "verworfen",
      occurredAt: "2026-02-26T19:00:00+01:00",
      title: "Vermeintlicher Wilderer-Hinweis",
      description: "Spaziergängerin meldete Geräusche, vor Ort nichts feststellbar.",
      location: {
        lat: 48.3658,
        lng: 16.7129,
        label: "L3013 Strasshof"
      },
      photos: [],
      createdAt: "2026-02-26T19:30:00+01:00",
      updatedAt: "2026-02-27T09:00:00+01:00"
    },
    {
      id: "reviermeldung-12",
      revierId: "revier-attersee",
      createdByMembershipId: "member-lehner",
      category: "wasserung",
      status: "archiviert",
      occurredAt: "2026-02-12T13:00:00+01:00",
      title: "Tränke am Sandberg trocken",
      description: "Wasserstelle wieder befüllt, Quelle scheint stabil.",
      location: {
        lat: 48.3216,
        lng: 16.7345,
        label: "Sandberg"
      },
      photos: [],
      createdAt: "2026-02-12T13:30:00+01:00",
      updatedAt: "2026-02-13T10:00:00+01:00"
    }
  ],
  aufgaben: [
    {
      id: "aufgabe-1",
      revierId: "revier-attersee",
      createdByMembershipId: "member-admin",
      sourceType: "reviereinrichtung",
      sourceId: "einrichtung-2",
      title: "Deckel der Fütterung richten",
      description: "Holzleiste tauschen und Deckel wieder leichtgängig machen.",
      status: "offen",
      priority: "hoch",
      dueAt: "2026-04-06T16:00:00+02:00",
      assigneeMembershipIds: ["member-ausgeher"],
      createdAt: "2026-04-03T08:00:00+02:00",
      updatedAt: "2026-04-03T08:00:00+02:00"
    },
    {
      id: "aufgabe-2",
      revierId: "revier-attersee",
      createdByMembershipId: "member-admin",
      sourceType: "reviermeldung",
      sourceId: "reviermeldung-5",
      title: "Hochstand Sandberg sanieren",
      description: "Stiegen nachschrauben und Holm prüfen.",
      status: "in_arbeit",
      priority: "hoch",
      dueAt: "2026-04-12T16:00:00+02:00",
      assigneeMembershipIds: ["member-jaeger", "member-lehner"],
      createdAt: "2026-03-31T09:00:00+02:00",
      updatedAt: "2026-04-02T18:30:00+02:00"
    },
    {
      id: "aufgabe-3",
      revierId: "revier-attersee",
      createdByMembershipId: "member-admin",
      title: "Frühjahrsputz Reviertag organisieren",
      description: "Hochstände kontrollieren, Wege freischneiden, Treffpunkt fixieren.",
      status: "offen",
      priority: "normal",
      dueAt: "2026-05-09T09:00:00+02:00",
      assigneeMembershipIds: ["member-schrift", "member-gruber"],
      createdAt: "2026-04-02T17:00:00+02:00",
      updatedAt: "2026-04-02T17:00:00+02:00"
    },
    {
      id: "aufgabe-4",
      revierId: "revier-attersee",
      createdByMembershipId: "member-schrift",
      sourceType: "sitzung",
      sourceId: "sitzung-1",
      title: "Protokoll Frühjahrsbesprechung schreiben",
      description: "Entwurf bis 14. April fertigstellen.",
      status: "angenommen",
      priority: "normal",
      dueAt: "2026-04-14T18:00:00+02:00",
      assigneeMembershipIds: ["member-schrift"],
      createdAt: "2026-04-02T20:00:00+02:00",
      updatedAt: "2026-04-03T07:00:00+02:00"
    },
    {
      id: "aufgabe-5",
      revierId: "revier-attersee",
      createdByMembershipId: "member-admin",
      sourceType: "reviereinrichtung",
      sourceId: "einrichtung-11",
      title: "Hochstand Russenheidengraben neu aufbauen",
      description: "Holz besorgen, Termin koordinieren, alten Stand abtragen.",
      status: "in_arbeit",
      priority: "dringend",
      dueAt: "2026-04-25T09:00:00+02:00",
      assigneeMembershipIds: ["member-bauer", "member-hofer"],
      createdAt: "2026-03-09T10:00:00+01:00",
      updatedAt: "2026-04-01T11:00:00+02:00"
    },
    {
      id: "aufgabe-6",
      revierId: "revier-attersee",
      createdByMembershipId: "member-admin",
      title: "Salzlecken vor Brunft kontrollieren",
      description: "Alle Salzlecken vor der Brunftzeit befüllen.",
      status: "offen",
      priority: "normal",
      dueAt: "2026-05-20T18:00:00+02:00",
      assigneeMembershipIds: ["member-maier", "member-pichler"],
      createdAt: "2026-04-01T08:00:00+02:00",
      updatedAt: "2026-04-01T08:00:00+02:00"
    },
    {
      id: "aufgabe-7",
      revierId: "revier-attersee",
      createdByMembershipId: "member-admin",
      sourceType: "fallwild_vorgang",
      sourceId: "fallwild-19",
      title: "Muffelwild-Sichtung dokumentieren",
      description: "Sichtmeldung an die Bezirksjägerschaft weiterleiten.",
      status: "erledigt",
      priority: "niedrig",
      dueAt: "2026-02-22T18:00:00+01:00",
      completedAt: "2026-02-21T14:00:00+01:00",
      completionNote: "Mail an Bezirk versandt.",
      assigneeMembershipIds: ["member-schrift"],
      createdAt: "2026-02-15T11:00:00+01:00",
      updatedAt: "2026-02-21T14:00:00+01:00"
    },
    {
      id: "aufgabe-8",
      revierId: "revier-attersee",
      createdByMembershipId: "member-admin",
      title: "Abschussplan Rehwild aktualisieren",
      description: "Plan an die Bezirksverwaltung übermitteln.",
      status: "blockiert",
      priority: "hoch",
      dueAt: "2026-04-30T18:00:00+02:00",
      assigneeMembershipIds: ["member-admin"],
      createdAt: "2026-03-25T16:00:00+01:00",
      updatedAt: "2026-04-02T09:00:00+02:00"
    },
    {
      id: "aufgabe-9",
      revierId: "revier-attersee",
      createdByMembershipId: "member-admin",
      sourceType: "reviereinrichtung",
      sourceId: "einrichtung-10",
      title: "Sommerputz Fütterung Lange Furche",
      description: "Trogeinsätze reinigen und desinfizieren.",
      status: "offen",
      priority: "niedrig",
      dueAt: "2026-05-02T10:00:00+02:00",
      assigneeMembershipIds: ["member-bauer"],
      createdAt: "2026-04-01T09:00:00+02:00",
      updatedAt: "2026-04-01T09:00:00+02:00"
    },
    {
      id: "aufgabe-10",
      revierId: "revier-attersee",
      createdByMembershipId: "member-admin",
      sourceType: "reviermeldung",
      sourceId: "reviermeldung-7",
      title: "Wildverbiss in Auwald-Aufforstung erfassen",
      description: "Schaden vermessen und Förster kontaktieren.",
      status: "offen",
      priority: "normal",
      dueAt: "2026-04-18T18:00:00+02:00",
      assigneeMembershipIds: ["member-hofer"],
      createdAt: "2026-03-22T19:30:00+01:00",
      updatedAt: "2026-03-22T19:30:00+01:00"
    }
  ],
  sitzungen: [
    {
      id: "sitzung-1",
      revierId: "revier-attersee",
      title: "Frühjahrsbesprechung 2026",
      scheduledAt: "2026-04-11T19:00:00+02:00",
      locationLabel: "Jagdhaus Gänserndorf",
      status: "entwurf",
      participants: [
        {
          membershipId: "member-admin",
          anwesend: true
        },
        {
          membershipId: "member-ausgeher",
          anwesend: true
        },
        {
          membershipId: "member-schrift",
          anwesend: true
        },
        {
          membershipId: "member-jaeger",
          anwesend: false
        }
      ],
      versions: [
        {
          id: "version-1",
          createdAt: "2026-04-02T21:15:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Erster Entwurf mit Themen zu Fallwild und Hochstandwartung.",
          agenda: ["Begrüßung", "Fallwildstatistik", "Wartungsplan Hochstände"],
          beschluesse: [
            {
              id: "beschluss-1",
              title: "Wartung Weikendorfer Remise",
              decision: "Kontrolle aller Leiterstände bis 20. April abschließen.",
              owner: "Andreas Ostheimer",
              dueAt: "2026-04-20T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-2",
      revierId: "revier-attersee",
      title: "Winterabschluss 2025",
      scheduledAt: "2026-02-14T18:30:00+01:00",
      locationLabel: "Jagdhaus Gänserndorf",
      status: "freigegeben",
      participants: [
        {
          membershipId: "member-admin",
          anwesend: true
        },
        {
          membershipId: "member-ausgeher",
          anwesend: true
        },
        {
          membershipId: "member-schrift",
          anwesend: true
        }
      ],
      versions: [
        {
          id: "version-2",
          createdAt: "2026-02-15T08:10:00+01:00",
          createdByMembershipId: "member-schrift",
          summary: "Rückblick auf die Saison und Beschluss für den Frühjahrsputz.",
          agenda: ["Rückblick", "Abschussplan", "Frühjahrsputz"],
          beschluesse: [
            {
              id: "beschluss-2",
              title: "Frühjahrsputz",
              decision: "Gemeinsamer Reviertag am 22. März mit Fokus auf Hochstände und Wege.",
              owner: "Martin Mair",
              dueAt: "2026-03-22T09:00:00+01:00"
            }
          ],
          attachments: []
        }
      ],
      publishedDocument: {
        id: "document-sitzung-2",
        title: "Winterabschluss 2025 Protokoll",
        fileName: "winterabschluss-2025-protokoll.pdf",
        contentType: "application/pdf",
        url: "/api/v1/documents/document-sitzung-2/download",
        createdAt: "2026-02-15T08:30:00+01:00"
      }
    },
    {
      id: "sitzung-3",
      revierId: "revier-attersee",
      title: "Saisonauftakt Frühjahr 2025",
      scheduledAt: "2025-03-08T18:00:00+01:00",
      locationLabel: "Jagdhaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true },
        { membershipId: "member-berger", anwesend: true },
        { membershipId: "member-hofer", anwesend: false }
      ],
      versions: [
        {
          id: "version-3",
          createdAt: "2025-03-09T09:00:00+01:00",
          createdByMembershipId: "member-schrift",
          summary: "Saisoneröffnung, Begehungsscheine ausgegeben, Reviergrenzen aktualisiert.",
          agenda: ["Begehungsscheine", "Reviergrenzen", "Hegeplan"],
          beschluesse: [
            {
              id: "beschluss-3",
              title: "Begehungsscheine 2025/26",
              decision: "Ausgabe der Scheine bis Ende März abschließen.",
              owner: "Anna Müller",
              dueAt: "2025-03-31T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-4",
      revierId: "revier-attersee",
      title: "Hegeschau 2025",
      scheduledAt: "2025-04-26T10:00:00+02:00",
      locationLabel: "Vereinshaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-ausgeher", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true },
        { membershipId: "member-bauer", anwesend: true }
      ],
      versions: [
        {
          id: "version-4",
          createdAt: "2025-04-27T11:30:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Trophäenschau und Bewertung der Saison 2024/25.",
          agenda: ["Trophäenbewertung", "Saisonrückblick", "Auszeichnungen"],
          beschluesse: [
            {
              id: "beschluss-4",
              title: "Trophäenbewertung dokumentieren",
              decision: "Bewertungsergebnisse digital archivieren.",
              owner: "Stefan Gruber",
              dueAt: "2025-05-15T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-5",
      revierId: "revier-attersee",
      title: "Hegeringbesprechung Mai 2025",
      scheduledAt: "2025-05-22T19:30:00+02:00",
      locationLabel: "Gasthaus Strasshof",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true }
      ],
      versions: [
        {
          id: "version-5",
          createdAt: "2025-05-23T09:30:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Abstimmung mit Nachbarrevieren zur Bockjagd.",
          agenda: ["Reviergrenzen", "Bockjagd", "Sichtungen"],
          beschluesse: [
            {
              id: "beschluss-5",
              title: "Gemeinsame Bockjagd",
              decision: "Termin Mitte Juni mit Nachbarrevier abstimmen.",
              owner: "Anna Müller",
              dueAt: "2025-06-10T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-6",
      revierId: "revier-attersee",
      title: "Vorstandssitzung Juni 2025",
      scheduledAt: "2025-06-18T18:00:00+02:00",
      locationLabel: "Jagdhaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-gruber", anwesend: true }
      ],
      versions: [
        {
          id: "version-6",
          createdAt: "2025-06-19T08:00:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Budgetbesprechung und Reviereinrichtungs-Inventur.",
          agenda: ["Finanzbericht", "Inventur", "Sommerprojekte"],
          beschluesse: [
            {
              id: "beschluss-6",
              title: "Inventur Reviereinrichtungen",
              decision: "Bestandsaufnahme aller Hochstände bis Ende Juli.",
              owner: "Anna Müller",
              dueAt: "2025-07-31T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-7",
      revierId: "revier-attersee",
      title: "Bezirksjägertag 2025",
      scheduledAt: "2025-07-12T09:00:00+02:00",
      locationLabel: "Bezirksjägerschaft Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true }
      ],
      versions: [
        {
          id: "version-7",
          createdAt: "2025-07-13T10:00:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Gemeinsame Sitzung der Reviere im Bezirk.",
          agenda: ["Bezirksberichte", "Schulungen", "Wildbestände"],
          beschluesse: [
            {
              id: "beschluss-7",
              title: "Bezirks-Schulung Wildbrethygiene",
              decision: "Anmeldung bis 15. August.",
              owner: "Martin Mair",
              dueAt: "2025-08-15T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-8",
      revierId: "revier-attersee",
      title: "Bockschau 2025",
      scheduledAt: "2025-08-09T15:00:00+02:00",
      locationLabel: "Vereinshaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-ausgeher", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true },
        { membershipId: "member-berger", anwesend: true },
        { membershipId: "member-hofer", anwesend: true }
      ],
      versions: [
        {
          id: "version-8",
          createdAt: "2025-08-10T09:00:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Bewertung der Bockabschüsse 2025.",
          agenda: ["Trophäenbewertung", "Diskussion", "Ausblick"],
          beschluesse: [
            {
              id: "beschluss-8",
              title: "Bewertungen einreichen",
              decision: "Trophäen bis 30. September einsenden.",
              owner: "Stefan Gruber",
              dueAt: "2025-09-30T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-9",
      revierId: "revier-attersee",
      title: "Vorstandssitzung September 2025",
      scheduledAt: "2025-09-19T18:30:00+02:00",
      locationLabel: "Jagdhaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-gruber", anwesend: true }
      ],
      versions: [
        {
          id: "version-9",
          createdAt: "2025-09-20T08:30:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Vorbereitung Drückjagd und Wintersaison.",
          agenda: ["Drückjagd", "Wintersaison", "Sicherheit"],
          beschluesse: [
            {
              id: "beschluss-9",
              title: "Drückjagd-Termin",
              decision: "Drückjagd am 15. November fixiert.",
              owner: "Anna Müller",
              dueAt: "2025-11-15T08:00:00+01:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-10",
      revierId: "revier-attersee",
      title: "Trichinenuntersuchung Schulung 2025",
      scheduledAt: "2025-10-04T14:00:00+02:00",
      locationLabel: "Bezirksjägerschaft Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true },
        { membershipId: "member-berger", anwesend: true },
        { membershipId: "member-hofer", anwesend: true }
      ],
      versions: [
        {
          id: "version-10",
          createdAt: "2025-10-05T09:00:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Schulung zur Probenentnahme bei Schwarzwild.",
          agenda: ["Theorie", "Praxis", "Dokumentation"],
          beschluesse: [
            {
              id: "beschluss-10",
              title: "Probennahme-Set verteilen",
              decision: "Sets an alle Jäger verteilen.",
              owner: "Lukas Huber",
              dueAt: "2025-10-31T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-11",
      revierId: "revier-attersee",
      title: "Drückjagd-Vorbesprechung 2025",
      scheduledAt: "2025-11-08T17:00:00+01:00",
      locationLabel: "Jagdhaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true },
        { membershipId: "member-ausgeher", anwesend: true },
        { membershipId: "member-berger", anwesend: true },
        { membershipId: "member-hofer", anwesend: true },
        { membershipId: "member-bauer", anwesend: true }
      ],
      versions: [
        {
          id: "version-11",
          createdAt: "2025-11-09T08:00:00+01:00",
          createdByMembershipId: "member-schrift",
          summary: "Sicherheitseinweisung und Standverteilung.",
          agenda: ["Sicherheit", "Stände", "Kommunikation"],
          beschluesse: [
            {
              id: "beschluss-11",
              title: "Funkgeräte-Test",
              decision: "Funkgeräte am Vortag testen.",
              owner: "Lukas Huber",
              dueAt: "2025-11-14T18:00:00+01:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-12",
      revierId: "revier-attersee",
      title: "Drückjagd Nachbesprechung 2025",
      scheduledAt: "2025-11-22T19:00:00+01:00",
      locationLabel: "Jagdhaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true }
      ],
      versions: [
        {
          id: "version-12",
          createdAt: "2025-11-23T10:00:00+01:00",
          createdByMembershipId: "member-schrift",
          summary: "Auswertung der Drückjagd, Strecke 12 Stück.",
          agenda: ["Streckenliste", "Verbesserungen", "Dank"],
          beschluesse: [
            {
              id: "beschluss-12",
              title: "Streckenliste digitalisieren",
              decision: "Streckenliste an Bezirk weiterleiten.",
              owner: "Stefan Gruber",
              dueAt: "2025-11-30T18:00:00+01:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-13",
      revierId: "revier-attersee",
      title: "Adventsessen Jagdgesellschaft 2025",
      scheduledAt: "2025-12-13T18:00:00+01:00",
      locationLabel: "Gasthaus zur Linde",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-ausgeher", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true },
        { membershipId: "member-gruber", anwesend: true },
        { membershipId: "member-berger", anwesend: true },
        { membershipId: "member-maier", anwesend: true },
        { membershipId: "member-hofer", anwesend: true }
      ],
      versions: [
        {
          id: "version-13",
          createdAt: "2025-12-14T11:00:00+01:00",
          createdByMembershipId: "member-schrift",
          summary: "Geselliges Beisammensein zum Jahresausklang.",
          agenda: ["Jahresrückblick", "Ehrungen"],
          beschluesse: [],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-14",
      revierId: "revier-attersee",
      title: "Jahreshauptversammlung 2026",
      scheduledAt: "2026-01-17T19:00:00+01:00",
      locationLabel: "Vereinshaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-gruber", anwesend: true },
        { membershipId: "member-ausgeher", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true },
        { membershipId: "member-berger", anwesend: true },
        { membershipId: "member-maier", anwesend: false },
        { membershipId: "member-hofer", anwesend: true },
        { membershipId: "member-lehner", anwesend: true },
        { membershipId: "member-bauer", anwesend: true }
      ],
      versions: [
        {
          id: "version-14",
          createdAt: "2026-01-18T10:00:00+01:00",
          createdByMembershipId: "member-schrift",
          summary: "Jahresberichte, Wahlen und Beschlussfassungen.",
          agenda: [
            "Eröffnung",
            "Jahresbericht",
            "Kassenbericht",
            "Wahlen",
            "Anträge",
            "Allfälliges"
          ],
          beschluesse: [
            {
              id: "beschluss-14a",
              title: "Mitgliedsbeitrag 2026",
              decision: "Beitrag bleibt unverändert bei 180 EUR.",
              owner: "Anna Müller"
            },
            {
              id: "beschluss-14b",
              title: "Vorstand bestätigt",
              decision: "Vorstand einstimmig wiedergewählt.",
              owner: "Stefan Gruber"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-15",
      revierId: "revier-attersee",
      title: "Jungjäger-Schulung Januar 2026",
      scheduledAt: "2026-01-31T14:00:00+01:00",
      locationLabel: "Jagdhaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true },
        { membershipId: "member-pichler", anwesend: true }
      ],
      versions: [
        {
          id: "version-15",
          createdAt: "2026-02-01T09:00:00+01:00",
          createdByMembershipId: "member-schrift",
          summary: "Praktische Einweisung für Jungjäger.",
          agenda: ["Reviereinweisung", "Sicherheitsregeln", "Q&A"],
          beschluesse: [],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-16",
      revierId: "revier-attersee",
      title: "Hegeschau 2026 - Vorbesprechung",
      scheduledAt: "2026-03-07T18:00:00+01:00",
      locationLabel: "Jagdhaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-gruber", anwesend: true }
      ],
      versions: [
        {
          id: "version-16",
          createdAt: "2026-03-08T09:00:00+01:00",
          createdByMembershipId: "member-schrift",
          summary: "Organisation und Aufgabenverteilung für die Hegeschau.",
          agenda: ["Termin", "Aufgaben", "Einladungen"],
          beschluesse: [
            {
              id: "beschluss-16",
              title: "Hegeschau-Termin fixiert",
              decision: "Hegeschau am 25. April 2026.",
              owner: "Anna Müller",
              dueAt: "2026-04-25T10:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-17",
      revierId: "revier-attersee",
      title: "Hegeschau 2026",
      scheduledAt: "2026-04-25T10:00:00+02:00",
      locationLabel: "Vereinshaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-ausgeher", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true },
        { membershipId: "member-gruber", anwesend: true },
        { membershipId: "member-berger", anwesend: true },
        { membershipId: "member-bauer", anwesend: true }
      ],
      versions: [
        {
          id: "version-17",
          createdAt: "2026-04-26T11:00:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Trophäenbewertung Saison 2025/26 und Würdigung der Mitglieder.",
          agenda: ["Trophäenbewertung", "Saisonrückblick", "Ehrungen"],
          beschluesse: [
            {
              id: "beschluss-17",
              title: "Bewertungen archivieren",
              decision: "Bewertungsergebnisse digital archivieren und veröffentlichen.",
              owner: "Stefan Gruber",
              dueAt: "2026-05-15T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-18",
      revierId: "revier-attersee",
      title: "Bezirksjägertag 2026",
      scheduledAt: "2026-05-23T09:00:00+02:00",
      locationLabel: "Bezirksjägerschaft Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true }
      ],
      versions: [
        {
          id: "version-18",
          createdAt: "2026-05-24T10:00:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Bezirksweite Themen und Wildbestandsabschätzung.",
          agenda: ["Bezirksberichte", "Wildbestand", "Schulungen"],
          beschluesse: [
            {
              id: "beschluss-18",
              title: "Wildbestandszählung",
              decision: "Gemeinsame Bestandszählung im Herbst.",
              owner: "Anna Müller",
              dueAt: "2026-10-15T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-19",
      revierId: "revier-attersee",
      title: "Vorstandssitzung Juni 2026",
      scheduledAt: "2026-06-19T18:30:00+02:00",
      locationLabel: "Jagdhaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-gruber", anwesend: true }
      ],
      versions: [
        {
          id: "version-19",
          createdAt: "2026-06-20T08:30:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Halbjahresbilanz und Ausblick auf die Sommermonate.",
          agenda: ["Bilanz", "Sommerarbeiten", "Termine"],
          beschluesse: [
            {
              id: "beschluss-19",
              title: "Sommerarbeiten",
              decision: "Wege freischneiden im Juli.",
              owner: "Andreas Ostheimer",
              dueAt: "2026-07-31T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    },
    {
      id: "sitzung-20",
      revierId: "revier-attersee",
      title: "Bockschau 2026",
      scheduledAt: "2026-08-08T15:00:00+02:00",
      locationLabel: "Vereinshaus Gänserndorf",
      status: "freigegeben",
      participants: [
        { membershipId: "member-admin", anwesend: true },
        { membershipId: "member-schrift", anwesend: true },
        { membershipId: "member-jaeger", anwesend: true }
      ],
      versions: [
        {
          id: "version-20",
          createdAt: "2026-08-09T09:00:00+02:00",
          createdByMembershipId: "member-schrift",
          summary: "Bewertung der Bockabschüsse 2026.",
          agenda: ["Trophäenbewertung", "Diskussion"],
          beschluesse: [
            {
              id: "beschluss-20",
              title: "Trophäen einsenden",
              decision: "Bewertete Trophäen bis 30. September weiterleiten.",
              owner: "Stefan Gruber",
              dueAt: "2026-09-30T18:00:00+02:00"
            }
          ],
          attachments: []
        }
      ]
    }
  ],
  contactLists: [
    {
      id: "contact-list-reviernachbarn",
      revierId: "revier-attersee",
      title: "Reviernachbarn",
      position: 10,
      createdAt: "2026-04-01T09:00:00+02:00",
      updatedAt: "2026-04-01T09:00:00+02:00",
      entries: [
        {
          id: "contact-entry-nachbar-1",
          listId: "contact-list-reviernachbarn",
          revierId: "revier-attersee",
          name: "Josef Schneider",
          phone: "+43 664 1204501",
          revier: "Weikendorf Nord",
          funktion: "Revierleiter",
          position: 10,
          createdAt: "2026-04-01T09:00:00+02:00",
          updatedAt: "2026-04-01T09:00:00+02:00"
        },
        {
          id: "contact-entry-nachbar-2",
          listId: "contact-list-reviernachbarn",
          revierId: "revier-attersee",
          name: "Maria Leitner",
          phone: "+43 676 8802304",
          revier: "Marchfeld Süd",
          funktion: "Jagdleiterin",
          note: "Grenzabstimmung bei Schilfdamm und B8.",
          position: 20,
          createdAt: "2026-04-01T09:00:00+02:00",
          updatedAt: "2026-04-01T09:00:00+02:00"
        }
      ]
    },
    {
      id: "contact-list-weidkameraden",
      revierId: "revier-attersee",
      title: "Weidkameraden",
      position: 20,
      createdAt: "2026-04-01T09:00:00+02:00",
      updatedAt: "2026-04-01T09:00:00+02:00",
      entries: [
        {
          id: "contact-entry-weidkamerad-1",
          listId: "contact-list-weidkameraden",
          revierId: "revier-attersee",
          membershipId: "member-admin",
          name: "Anna Müller",
          phone: "+43 660 1001001",
          funktion: "Revierleitung",
          position: 10,
          createdAt: "2026-04-01T09:00:00+02:00",
          updatedAt: "2026-04-01T09:00:00+02:00"
        },
        {
          id: "contact-entry-weidkamerad-2",
          listId: "contact-list-weidkameraden",
          revierId: "revier-attersee",
          membershipId: "member-schrift",
          name: "Martin Mair",
          phone: "+43 660 7008009",
          funktion: "Schriftführung",
          position: 20,
          createdAt: "2026-04-01T09:00:00+02:00",
          updatedAt: "2026-04-01T09:00:00+02:00"
        },
        {
          id: "contact-entry-weidkamerad-3",
          listId: "contact-list-weidkameraden",
          revierId: "revier-attersee",
          membershipId: "member-jaeger",
          name: "Lukas Huber",
          phone: "+43 676 1002003",
          funktion: "Nachsuche",
          position: 30,
          createdAt: "2026-04-01T09:00:00+02:00",
          updatedAt: "2026-04-01T09:00:00+02:00"
        }
      ]
    },
    {
      id: "contact-list-notruf",
      revierId: "revier-attersee",
      title: "Notrufnummern",
      position: 30,
      createdAt: "2026-04-01T09:00:00+02:00",
      updatedAt: "2026-04-01T09:00:00+02:00",
      entries: [
        {
          id: "contact-entry-notruf-1",
          listId: "contact-list-notruf",
          revierId: "revier-attersee",
          name: "Euro-Notruf",
          phone: "112",
          funktion: "Notruf",
          position: 10,
          createdAt: "2026-04-01T09:00:00+02:00",
          updatedAt: "2026-04-01T09:00:00+02:00"
        },
        {
          id: "contact-entry-notruf-2",
          listId: "contact-list-notruf",
          revierId: "revier-attersee",
          name: "Polizei",
          phone: "133",
          funktion: "Sicherheitsnotruf",
          position: 20,
          createdAt: "2026-04-01T09:00:00+02:00",
          updatedAt: "2026-04-01T09:00:00+02:00"
        },
        {
          id: "contact-entry-notruf-3",
          listId: "contact-list-notruf",
          revierId: "revier-attersee",
          name: "Rettung",
          phone: "144",
          funktion: "Medizinischer Notruf",
          position: 30,
          createdAt: "2026-04-01T09:00:00+02:00",
          updatedAt: "2026-04-01T09:00:00+02:00"
        }
      ]
    }
  ],
  notifications: [
    {
      id: "notification-1",
      revierId: "revier-attersee",
      channel: "push",
      title: "Ansitz aktiv",
      body: "Andreas Ostheimer sitzt am Hochstand Weikendorfer Remise an.",
      createdAt: "2026-04-03T05:46:00+02:00"
    },
    {
      id: "notification-2",
      revierId: "revier-attersee",
      channel: "in-app",
      title: "Fallwild geborgen",
      body: "Ein Reh an der B8 wurde dokumentiert und geborgen.",
      createdAt: "2026-04-03T06:57:00+02:00"
    },
    {
      id: "notification-3",
      revierId: "revier-attersee",
      channel: "in-app",
      title: "Protokoll veröffentlicht",
      body: "Das Protokoll Winterabschluss 2025 steht mobil zum Lesen bereit.",
      createdAt: "2026-02-15T08:32:00+01:00"
    },
    {
      id: "notification-4",
      revierId: "revier-attersee",
      channel: "push",
      title: "Wartung fällig",
      body: "Die Fütterung Feldweg Nord benötigt Wartung (Deckel verzogen).",
      createdAt: "2026-04-01T07:30:00+02:00"
    },
    {
      id: "notification-5",
      revierId: "revier-attersee",
      channel: "push",
      title: "Aufgabe zugewiesen",
      body: "Lukas Huber: Hochstand Sandberg sanieren bis 12. April.",
      createdAt: "2026-03-31T09:05:00+02:00"
    },
    {
      id: "notification-6",
      revierId: "revier-attersee",
      channel: "in-app",
      title: "Ansitz-Konflikt vermeiden",
      body: "Marchfeldrand ist heute schon belegt - bitte abstimmen.",
      createdAt: "2026-03-30T17:45:00+02:00"
    },
    {
      id: "notification-7",
      revierId: "revier-attersee",
      channel: "in-app",
      title: "Neue Reviermeldung",
      body: "Schwarzwildrotte am Schilfdamm gemeldet.",
      createdAt: "2026-03-22T19:10:00+01:00"
    },
    {
      id: "notification-8",
      revierId: "revier-attersee",
      channel: "push",
      title: "Sitzung erinnerung",
      body: "Frühjahrsbesprechung am 11. April im Jagdhaus.",
      createdAt: "2026-03-15T18:00:00+01:00"
    }
  ]
};

export function cloneDemoData(): DemoData {
  return JSON.parse(JSON.stringify(demoData)) as DemoData;
}

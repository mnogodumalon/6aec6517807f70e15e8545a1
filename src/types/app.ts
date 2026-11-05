// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Firmen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    firmenname?: string;
    branche?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    land?: string;
    telefon?: string;
    email?: string;
    website?: string;
    bemerkung?: string;
  };
}

export interface Kontakte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    anrede?: LookupValue;
    vorname?: string;
    nachname?: string;
    position?: string;
    firma?: string; // applookup -> URL zu 'Firmen' Record
    kontaktart?: LookupValue;
    status?: LookupValue;
    email?: string;
    telefon?: string;
    mobil?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    land?: string;
    geburtstag?: string; // Format: YYYY-MM-DD oder ISO String
    bemerkung?: string;
  };
}

export const APP_IDS = {
  FIRMEN: '6aec650817ce0acfaebb198e',
  KONTAKTE: '6aec650b1a7c61d36d3f3f26',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'kontakte': {
    anrede: [{ key: "frau", label: "Frau" }, { key: "herr", label: "Herr" }, { key: "divers", label: "Divers" }],
    kontaktart: [{ key: "kunde", label: "Kunde" }, { key: "lieferant", label: "Lieferant" }, { key: "partner", label: "Partner" }, { key: "privat", label: "Privat" }, { key: "sonstiges", label: "Sonstiges" }],
    status: [{ key: "aktiv", label: "Aktiv" }, { key: "inaktiv", label: "Inaktiv" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'firmen': {
    'firmenname': 'string/text',
    'branche': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'land': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'website': 'string/url',
    'bemerkung': 'string/textarea',
  },
  'kontakte': {
    'anrede': 'lookup/radio',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'position': 'string/text',
    'firma': 'applookup/select',
    'kontaktart': 'lookup/select',
    'status': 'lookup/select',
    'email': 'string/email',
    'telefon': 'string/tel',
    'mobil': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'land': 'string/text',
    'geburtstag': 'date/date',
    'bemerkung': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateFirmen = StripLookup<Firmen['fields']>;
export type CreateKontakte = StripLookup<Kontakte['fields']>;
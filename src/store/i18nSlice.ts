import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { api } from '../services/api';
import { defaultCatalog, supportedLocales, type SupportedLocale } from '../i18n/catalog';

const LOCALE_STORAGE_KEY = 'planttrack:locale';

type TranslationRow = {
  id: number;
  organization_id: number;
  namespace: string;
  entry_key: string;
  tr: string;
  en: string;
};

type I18nState = {
  locale: SupportedLocale;
  entries: Record<string, string>;
  loading: boolean;
  error: string;
};

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(locale);
}

function loadInitialLocale(): SupportedLocale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && isSupportedLocale(raw)) return raw;
  } catch {
    // ignore
  }
  return 'tr';
}

function buildCatalog(locale: SupportedLocale, rows: TranslationRow[]) {
  const result: Record<string, string> = {
    ...defaultCatalog[locale]
  };

  for (const row of rows) {
    const localizedValue = locale === 'tr' ? row.tr : row.en;
    if (localizedValue && localizedValue.length > 0) {
      result[`${row.namespace}.${row.entry_key}`] = localizedValue;
    }
  }

  return result;
}

const initialLocale = loadInitialLocale();

const initialState: I18nState = {
  locale: initialLocale,
  entries: { ...defaultCatalog[initialLocale] },
  loading: false,
  error: ''
};

export const fetchI18nTranslations = createAsyncThunk<
  Record<string, string>,
  { organizationId: number; locale: SupportedLocale },
  { rejectValue: string }
>('i18n/fetchTranslations', async ({ organizationId, locale }, thunkApi) => {
  try {
    const response = await api.get(`/api/organizations/${organizationId}/translations`);

    const rows = (response.data.translations ?? []) as TranslationRow[];
    return buildCatalog(locale, rows);
  } catch {
    return thunkApi.rejectWithValue('Dil verileri yuklenemedi.');
  }
});

const i18nSlice = createSlice({
  name: 'i18n',
  initialState,
  reducers: {
    setLocale(state, action: PayloadAction<SupportedLocale>) {
      state.locale = action.payload;
      state.error = '';
      state.entries = { ...defaultCatalog[action.payload] };
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, action.payload);
      } catch {
        // ignore
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchI18nTranslations.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchI18nTranslations.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchI18nTranslations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Dil verileri yuklenemedi.';
      });
  }
});

export const { setLocale } = i18nSlice.actions;
export default i18nSlice.reducer;

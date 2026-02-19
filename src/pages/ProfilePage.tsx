import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';

import type { AppDispatch, RootState } from '../store';
import { localeLabels, supportedLocales, type SupportedLocale } from '../i18n/catalog';
import { fetchI18nTranslations, setLocale } from '../store/i18nSlice';
import { useI18n } from '../hooks/useI18n';

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.user);
  const locale = useSelector((s: RootState) => s.i18n.locale);
  const { t } = useI18n();

  const localeOptions = useMemo(
    () => supportedLocales.map((value) => ({ label: localeLabels[value], value })),
    []
  );

  if (!user.organizationId) {
    return <Message severity="warn" text="Organization bulunamadi. Lutfen tekrar giris yap." className="w-full" />;
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <Card className="p-component-sm">
        <div className="grid gap-4">
          <div>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">{t('profile.title', 'Profil')}</h2>
            <p className="text-sm text-slate-600">{t('profile.subtitle', 'Kullanici ve dil ayarlarini yonet.')}</p>
          </div>

          <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div>
              <span className="font-medium text-slate-700">{t('profile.name', 'Ad')}:</span> {user.name}
            </div>
            <div>
              <span className="font-medium text-slate-700">{t('profile.email', 'E-posta')}:</span> {user.email || '-'}
            </div>
            <div>
              <span className="font-medium text-slate-700">{t('profile.role', 'Rol')}:</span> {user.role}
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('profile.language', 'Dil')}</span>
            <Dropdown
              value={locale}
              options={localeOptions}
              onChange={(event) => {
                const nextLocale = event.value as SupportedLocale;
                dispatch(setLocale(nextLocale));
                dispatch(fetchI18nTranslations({ organizationId: user.organizationId!, locale: nextLocale }));
              }}
              optionLabel="label"
              optionValue="value"
              className="w-full max-w-xs"
            />
          </label>
        </div>
      </Card>
    </div>
  );
}

import { FormEvent, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { AuthShell } from '../../components/auth/AuthShell';
import { authApi } from '../../services/authApi';

export function LoginPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | undefined;
    return state?.from?.pathname || '/';
  }, [location.state]);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authApi.login({ email, password });
      if (!remember) {
        sessionStorage.setItem('planttrack_ephemeral_login', '1');
      }
      navigate(redirectPath, { replace: true });
    } catch {
      setError('Giris basarisiz. Bilgilerini kontrol et ve tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heroTitle="PlantTrack'a hos geldin"
      heroSubtitle="Akilli Uretim ve Stok"
      heroDescription="Uretim verilerini tek panelde yonet, ekip ve stok akislarini guvenle takip et."
      heroIcon={<Rocket className="h-6 w-6" />}
    >
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Hesabina giris yap</h2>
        <p className="text-sm text-slate-500">Devam etmek icin e-posta ve sifreni gir.</p>
      </div>

      <form className="space-y-4 rounded-2xl bg-white p-6 shadow-sm" onSubmit={onSubmit}>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">E-posta</span>
          <InputText
            id="login-email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ornek@firma.com"
            className="w-full p-inputtext-sm"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Sifre</span>
          <Password
            id="login-password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Sifren"
            toggleMask
            feedback={false}
            inputClassName="w-full p-inputtext-sm"
            className="w-full"
            required
          />
        </label>

        <div className="flex items-center justify-between text-sm text-slate-600">
          <label className="inline-flex items-center gap-2">
            <Checkbox
              id="remember"
              name="remember"
              checked={remember}
              onChange={(event) => setRemember(Boolean(event.checked))}
            />
            <span>Beni hatirla</span>
          </label>

          <Link to="/auth/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
            Sifremi unuttum
          </Link>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <Button
            type="submit"
            label="Giris yap"
            icon="pi pi-sign-in"
            loading={loading}
            size="small"
            className="w-full sm:flex-1"
          />
          <Link
            to="/auth/register"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-2 text-slate-700 transition hover:bg-slate-50"
          >
            Kayit ol
          </Link>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </AuthShell>
  );
}

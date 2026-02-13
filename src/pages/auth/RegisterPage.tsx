import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Building2 } from 'lucide-react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { AuthShell } from '../../components/auth/AuthShell';
import { authApi } from '../../services/authApi';

const hasStrongPassword = (value: string): boolean => {
  const hasMinLength = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
};

export function RegisterPage(): React.JSX.Element {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!agree) {
      setError('Devam etmek icin kosullari kabul etmelisin.');
      return;
    }

    if (normalizedFirstName.length < 2 || normalizedLastName.length < 2) {
      setError('Ad ve soyad en az 2 karakter olmali.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Sifre ve sifre tekrari ayni olmali.');
      return;
    }

    if (!hasStrongPassword(password)) {
      setError('Sifre en az 8 karakter; buyuk, kucuk harf, rakam ve ozel karakter icermeli.');
      return;
    }

    setLoading(true);

    try {
      await authApi.register({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        password,
      });
      navigate('/', { replace: true });
    } catch (error) {
      const apiMessage = axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setError(apiMessage ?? 'Kayit olusturulamadi. Bilgileri kontrol edip tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heroTitle="Yeni ekip, tek platform"
      heroSubtitle="PlantTrack"
      heroDescription="Birkac adimda hesabi olustur, stok ve uretim takibini aninda baslat."
      heroIcon={<Building2 className="h-6 w-6" />}
    >
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Kayit ol</h2>
        <p className="text-sm text-slate-500">Yoneticini olustur ve panele gec.</p>
      </div>

      <form className="space-y-4 rounded-2xl bg-white p-6 shadow-sm" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Ad</span>
            <InputText
              id="register-first-name"
              name="firstName"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="p-inputtext-sm"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Soyad</span>
            <InputText
              id="register-last-name"
              name="lastName"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="p-inputtext-sm"
              required
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">E-posta</span>
          <InputText
            id="register-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="p-inputtext-sm"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Sifre</span>
          <Password
            id="register-password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            toggleMask
            feedback={false}
            inputClassName="w-full p-inputtext-sm"
            className="w-full"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Sifre tekrar</span>
          <Password
            id="register-password-confirm"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            toggleMask
            feedback={false}
            inputClassName="w-full p-inputtext-sm"
            className="w-full"
            required
          />
        </label>

        <label className="inline-flex items-start gap-2 text-sm text-slate-600">
          <Checkbox id="terms" name="terms" checked={agree} onChange={(event) => setAgree(Boolean(event.checked))} />
          <span>Kullanim kosullarini ve gizlilik politikasini kabul ediyorum.</span>
        </label>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <Button
            type="submit"
            label="Hesap olustur"
            icon="pi pi-user-plus"
            loading={loading}
            size="small"
            className="w-full sm:flex-1"
          />
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-2 text-slate-700 transition hover:bg-slate-50"
          >
            Giris yap
          </Link>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </AuthShell>
  );
}

import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';

type SearchFieldProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
};

export default function SearchField({
  value,
  placeholder,
  onChange,
  className = 'w-full sm:w-auto',
  inputClassName = 'w-full sm:w-72',
  ariaLabel
}: SearchFieldProps) {
  return (
    <IconField iconPosition="left" className={className}>
      <InputIcon className="pi pi-search text-slate-400" />
      <InputText
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={inputClassName}
      />
    </IconField>
  );
}

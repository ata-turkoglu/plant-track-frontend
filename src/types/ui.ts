export type TranslateFn = (key: string, fallback?: string) => string;

export type SelectOption<T extends string | number = number> = {
  label: string;
  value: T;
};

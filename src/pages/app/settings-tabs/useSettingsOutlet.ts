import { useOutletContext } from 'react-router-dom';
import type { SettingsOutletContextValue } from '../SettingsPage';

export const useSettingsOutlet = (): SettingsOutletContextValue => {
  return useOutletContext<SettingsOutletContextValue>();
};

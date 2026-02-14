import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import type { Menu as MenuType } from 'primereact/menu';

import type { RootState } from '../store';
import { toggleSidebar } from '../store/uiSlice';
import { logout } from '../store/userSlice';

export default function AppHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const menuRef = useRef<MenuType>(null);
  const user = useSelector((state: RootState) => state.user);

  const menuItems = [
    {
      label: 'Profile',
      icon: 'pi pi-user'
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => {
        dispatch(logout());
        navigate('/auth/login');
      }
    }
  ];

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <Button
          icon="pi pi-bars"
          rounded
          text
          size="small"
          aria-label="Toggle sidebar"
          onClick={() => dispatch(toggleSidebar())}
        />
        <img src="/images/logo.webp" alt="PlantTrack" className="h-8 w-8 rounded-md object-cover" />
        <span className="text-sm font-semibold text-slate-900">PlantTrack</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right text-xs text-slate-600">
          <p className="font-semibold text-slate-900">{user.name}</p>
          <p>{user.role}</p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent p-0"
          onClick={(event) => menuRef.current?.toggle(event)}
          aria-controls="user_menu"
          aria-haspopup
        >
          <Avatar label={user.name[0]} shape="circle" className="h-8 w-8 bg-brand-500 text-white" />
        </button>
        <Menu model={menuItems} popup id="user_menu" ref={menuRef} />
      </div>
    </header>
  );
}

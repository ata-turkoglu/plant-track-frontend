import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Toast } from 'primereact/toast';

import type { AppDispatch, RootState } from '../store';
import { dequeueToast } from '../store/uiSlice';

export default function AppToast() {
  const dispatch = useDispatch<AppDispatch>();
  const toastRef = useRef<Toast>(null);
  const firstToast = useSelector((state: RootState) => state.ui.toastQueue[0]);

  useEffect(() => {
    if (!firstToast) return;
    toastRef.current?.show({
      severity: firstToast.severity,
      summary: firstToast.summary,
      detail: firstToast.detail,
      life: firstToast.life ?? 2800
    });
    dispatch(dequeueToast());
  }, [dispatch, firstToast]);

  return <Toast ref={toastRef} position="top-right" />;
}

import { useMemo } from 'react';
import axios from 'axios';
import { usePage } from '@inertiajs/react';

export const useRoleApi = () => {
  const { auth } = usePage().props;

  const api = useMemo(() => {
    const role = auth?.user?.role?.toLowerCase();
    const validRoles = ['admin', 'frontdesk', 'designer', 'production', 'cashier'];
    if (!validRoles.includes(role)) {
      console.error('Invalid role:', role);
      return null;
    }

    const baseURL = `/${role}`;

    return axios.create({ baseURL });
  }, [auth?.user?.role]);


  const buildUrl = (path) => {
    const role = auth?.user?.role?.toLowerCase();
    const validRoles = ['admin', 'frontdesk', 'designer', 'production', 'cashier'];

    if (!validRoles.includes(role)) {
      console.error('Invalid role:', role);
      return path;
    }


    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/${role}/${cleanPath}`;
  };

  return { api, buildUrl };
};
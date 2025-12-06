import { useMemo } from 'react';
import axios from 'axios';
import { usePage } from '@inertiajs/react';

export const useRoleApi = () => {
   const { auth } = usePage().props;

  const api = useMemo(() => {
    const role = auth?.user?.role?.toLowerCase();    
    const validRoles = ['admin', 'frontdesk', 'designer', 'production'];
    if (!validRoles.includes(role)) {
      console.error('Invalid role:', role);
      return null;
    }

    const baseURL = `/${role}`;

    return axios.create({ baseURL });
  }, [auth?.user?.role]);
  
  // Helper function to build role-based URLs for router
  const buildUrl = (path) => {
    const role = auth?.user?.role?.toLowerCase();
    const validRoles = ['admin', 'frontdesk', 'designer', 'production'];
    
    if (!validRoles.includes(role)) {
      console.error('Invalid role:', role);
      return path;
    }
    
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/${role}/${cleanPath}`;
  };
  
  return { api, buildUrl };
};
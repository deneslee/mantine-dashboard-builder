import { createContext } from 'react';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

/** Placeholder identity. Replace the provider value when auth arrives; consumers stay unchanged. */
export const placeholderUser: CurrentUser = { id: 'me', name: 'Alex Morgan', email: 'alex@example.com' };

export const CurrentUserContext = createContext<CurrentUser>(placeholderUser);

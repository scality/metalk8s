import { createContext } from 'react';
import type { Navbar } from './navbarHooks';
import './navbarHooks';

if (!window.shellContexts) {
  // @ts-expect-error - FIXME when you are working on it
  window.shellContexts = {};
}

// @ts-expect-error - FIXME when you are working on it
if (!window.shellContexts.NavbarContext) {
  // @ts-expect-error - FIXME when you are working on it
  window.shellContexts.NavbarContext = createContext<Navbar | null>(null);
}

// @ts-expect-error - FIXME when you are working on it
export const NavbarContext = window.shellContexts.NavbarContext;

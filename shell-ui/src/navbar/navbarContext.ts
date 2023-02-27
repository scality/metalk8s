import { createContext } from 'react';
import type { Navbar } from './navbarHooks';
import './navbarHooks';

if (!window.shellContexts) {
  window.shellContexts = {};
}

if (!window.shellContexts.NavbarContext) {
  window.shellContexts.NavbarContext = createContext<Navbar | null>(null);
}

export const NavbarContext = window.shellContexts.NavbarContext;
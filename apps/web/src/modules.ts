export interface ShellModule {
  path: string;
  name: string;
  description: string;
  /** The module draws its own full-bleed chrome, so the shell hides its header there. */
  immersive?: boolean;
}

export const modules: ShellModule[] = [
  {
    path: '/ledger',
    name: 'Phantom Ledger',
    description: 'Collect money friends owe and send badminton invites.',
    immersive: true,
  },
];

export function isImmersive(pathname: string): boolean {
  return modules.some((module) => module.immersive && (pathname === module.path || pathname.startsWith(`${module.path}/`)));
}

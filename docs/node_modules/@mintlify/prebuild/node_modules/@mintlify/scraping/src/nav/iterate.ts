import { NavigationEntry } from '@mintlify/models';

export function iterateOverNavItems(navItems: Array<NavigationEntry>, origin: string): Array<URL> {
  return navItems.flatMap((navItem) => recurseOverGroup(navItem, origin));
}

function recurseOverGroup(group: NavigationEntry, origin: string): Array<URL> {
  if (typeof group === 'string') {
    return [new URL(group, origin)];
  }

  return group.pages.flatMap((pageOrGroup: string | NavigationEntry) => {
    if (typeof pageOrGroup === 'string') {
      return new URL(pageOrGroup, origin);
    }
    return recurseOverGroup(pageOrGroup, origin);
  });
}

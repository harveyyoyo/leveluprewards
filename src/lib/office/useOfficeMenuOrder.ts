'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OfficeNavId } from '@/lib/office/officeNav';

const STORAGE_KEY = 'school-office-menu-order';
const CHANGE_EVENT = 'school-office-menu-order-change';

function readOrder(): OfficeNavId[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed.filter((v) => typeof v === 'string') as OfficeNavId[]) : [];
  } catch {
    return [];
  }
}

/**
 * Sorts menu items by the saved order. Items not in it (new sections) keep their usual place
 * relative to each other and go after the saved ones.
 */
export function applyOfficeMenuOrder<T extends { id: OfficeNavId }>(items: T[], order: OfficeNavId[]): T[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (rank.get(a.item.id) ?? order.length + a.i) - (rank.get(b.item.id) ?? order.length + b.i))
    .map(({ item }) => item);
}

/** `ids` with `moved` placed where `target` is (dragging down puts it after, up puts it before). */
export function moveOfficeMenuItem(ids: OfficeNavId[], moved: OfficeNavId, target: OfficeNavId): OfficeNavId[] {
  const from = ids.indexOf(moved);
  const to = ids.indexOf(target);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = ids.filter((id) => id !== moved);
  next.splice(to, 0, moved);
  return next;
}

/** Per-device order of the office side menu, set by dragging items up and down. */
export function useOfficeMenuOrder() {
  const [order, setOrderState] = useState<OfficeNavId[]>([]);

  useEffect(() => {
    setOrderState(readOrder());
    const sync = () => setOrderState(readOrder());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setOrder = useCallback((next: OfficeNavId[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be blocked (private mode); the new order just lasts until the page reloads.
    }
    setOrderState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { order, setOrder };
}

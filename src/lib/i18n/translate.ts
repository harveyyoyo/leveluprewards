import type { MessageTree } from '@/lib/i18n/messages/types';

type Primitive = string | number | boolean | null | undefined;

type PathValue<T> = T extends Primitive
  ? T
  : T extends readonly (infer U)[]
    ? U
    : T extends Record<string, unknown>
      ? { [K in keyof T]: PathValue<T[K]> }[keyof T]
      : never;

export type TranslationParams = Record<string, string | number>;

function getByPath(tree: MessageTree, key: string): string | undefined {
  const parts = key.split('.');
  let cursor: unknown = tree;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || !(part in (cursor as Record<string, unknown>))) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === 'string' ? cursor : undefined;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = params[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}

export function createTranslator(messages: MessageTree) {
  return function t(key: PathValue<MessageTree> extends string ? string : string, params?: TranslationParams): string {
    const resolved = getByPath(messages, key) ?? key;
    return interpolate(resolved, params);
  };
}

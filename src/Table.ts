/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Copyright (C) 2023 Menhera.org

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
  @license
*/

class Index<T extends object> {
  readonly #index = new Map<unknown, T[]>();
  readonly #reverseIndex = new WeakMap<T, unknown>();

  public add(value: unknown, item: T): void {
    const items = this.#index.get(value);
    if (undefined === items) {
      this.#index.set(value, [item]);
    } else if (!items.includes(item)) {
      items.push(item);
    }
    this.#reverseIndex.set(item, value);
  }

  public delete(item: T): void {
    const value = this.#reverseIndex.get(item);
    const items = this.#index.get(value);
    if (undefined !== items) {
      const index = items.indexOf(item);
      if (-1 !== index) {
        items.splice(index, 1);
        if (0 === items.length) {
          this.#index.delete(value);
        }
      }
    }
  }

  public find(value: unknown): T[] {
    const items = this.#index.get(value);
    if (undefined === items) {
      return [];
    } else {
      return items;
    }
  }
}

export class Table<T extends object> {
  readonly #indexKeys: string[];
  readonly #indices: Map<string, Index<T>> = new Map();
  readonly #items: Set<T> = new Set();

  public constructor(indexKeys: (keyof T)[]) {
    this.#indexKeys = [... indexKeys].filter((keyName) => 'string' == typeof keyName) as string[];
    for (const indexKey of this.#indexKeys) {
      this.#indices.set(indexKey, new Index());
    }
  }

  public add(item: T): void{
    for (const indexKey of this.#indexKeys) {
      const index = this.#indices.get(indexKey)!;
      const record = item as Record<string, unknown>;
      const value = record[indexKey];
      if (undefined !== value) {
        index.add(value, item);
      }
    }
    this.#items.add(item);
  }

  public delete(item: T): void {
    for (const indexKey of this.#indexKeys) {
      const index = this.#indices.get(indexKey)!;
      index.delete(item);
    }
    this.#items.delete(item);
  }

  public find(indexKey: keyof T, value: unknown): T[] {
    const index = this.#indices.get(indexKey as string);
    if (undefined === index) {
      return [];
    } else {
      return index.find(value);
    }
  }

  public findAndDelete(indexKey: keyof T, value: unknown): void {
    const items = this.find(indexKey, value);
    for (const item of items) {
      this.delete(item);
    }
  }

  public get items(): T[] {
    return [... this.#items];
  }
}

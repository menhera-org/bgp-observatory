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

import { FrrBgp } from "./types.js";
import { Table } from "./Table.js";

export interface DataModelOptions {
  ignoreDefaultRoutes?: boolean;
}

export interface RouterInfo {
  readonly routerId: string;
  readonly localAsn: number;
}

export interface Route {
  readonly ipVersion: 4 | 6;
  readonly prefix: string; // prefix/prefixLen
  readonly asPath: readonly number[];
  readonly originAsn: number;
}

export interface AsInfo {
  readonly asn: number;
  readonly prefixes: readonly string[]; // prefix/prefixLen
  readonly neighborAsns: readonly number[];
}

export class DataModel {
  readonly #options: DataModelOptions;

  // IPv4
  #ipv4LocalAsn: number | undefined;
  #ipv4RouterId: string | undefined;
  #ipv4Routes: Table<Route> = new Table(['prefix', 'originAsn']);
  #ipv4AsInfo: Table<AsInfo> = new Table(['asn']);

  // IPv6
  #ipv6RouterId: string | undefined;
  #ipv6LocalAsn: number | undefined;
  #ipv6Routes: Table<Route> = new Table(['prefix', 'originAsn']);
  #ipv6AsInfo: Table<AsInfo> = new Table(['asn']);

  public constructor(options: DataModelOptions = {}) {
    this.#options = options;
  }

  public importIpv4Json(json: string): void {
    const bgpData: FrrBgp = JSON.parse(json);
    this.#ipv4LocalAsn = bgpData.localAS;
    this.#ipv4RouterId = bgpData.routerId;
    const routes = new Table<Route>(['prefix', 'originAsn']);
    const asInfo = new Table<AsInfo>(['asn']);
    const localAsInfoItem = {
      asn: bgpData.localAS,
      prefixes: [],
      neighborAsns: [],
    };
    asInfo.add(localAsInfoItem);
    for (const prefix in bgpData.routes) {
      const bgpRoutes = bgpData.routes[prefix]!;
      for (const route of bgpRoutes) {
        if (this.#options.ignoreDefaultRoutes && 0 == route.prefixLen) {
          continue;
        }
        if (!route.valid) {
          continue;
        }
        const asPath = route.path.split(' ').map((asn) => parseInt(asn, 10));
        if (asPath.length < 1) {
          continue;
        }
        const originAsn = asPath[asPath.length - 1]!;
        routes.add({
          ipVersion: 4,
          prefix: route.network,
          asPath: asPath,
          originAsn: originAsn,
        });
        let asInfoItem = asInfo.find('asn', originAsn)[0];
        if (undefined === asInfoItem) {
          asInfoItem = {
            asn: originAsn,
            prefixes: [],
            neighborAsns: [],
          };
          asInfo.add(asInfoItem);
        }
        (asInfoItem.prefixes as string[]).push(route.network);
        const asPathIncludingLocalAsn = [bgpData.localAS, ...asPath];
        for (let i = 0; i < asPathIncludingLocalAsn.length; i++) {
          const asn = asPathIncludingLocalAsn[i]!;
          const prevAsn = asPathIncludingLocalAsn[i - 1];
          const nextAsn = asPathIncludingLocalAsn[i + 1];
          let asInfoItem = asInfo.find('asn', asn)[0];
          if (undefined === asInfoItem) {
            asInfoItem = {
              asn: asn,
              prefixes: [],
              neighborAsns: [],
            };
            asInfo.add(asInfoItem);
          }
          if (undefined !== prevAsn && prevAsn != asn && !asInfoItem.neighborAsns.includes(prevAsn)) {
            (asInfoItem.neighborAsns as number[]).push(prevAsn);
          }
          if (undefined !== nextAsn && nextAsn != asn && !asInfoItem.neighborAsns.includes(nextAsn)) {
            (asInfoItem.neighborAsns as number[]).push(nextAsn);
          }
        }
      }
    }
    this.#ipv4Routes = routes;
    this.#ipv4AsInfo = asInfo;
  }

  public importIpv6Json(json: string): void {
    const bgpData: FrrBgp = JSON.parse(json);
    this.#ipv6LocalAsn = bgpData.localAS;
    this.#ipv6RouterId = bgpData.routerId;
    const routes = new Table<Route>(['prefix', 'originAsn']);
    const asInfo = new Table<AsInfo>(['asn']);
    const localAsInfoItem = {
      asn: bgpData.localAS,
      prefixes: [],
      neighborAsns: [],
    };
    asInfo.add(localAsInfoItem);
    for (const prefix in bgpData.routes) {
      const bgpRoutes = bgpData.routes[prefix]!;
      for (const route of bgpRoutes) {
        if (this.#options.ignoreDefaultRoutes && 0 == route.prefixLen) {
          continue;
        }
        if (!route.valid) {
          continue;
        }
        const asPath = route.path.split(' ').map((asn) => parseInt(asn, 10));
        if (asPath.length < 1) {
          continue;
        }
        const originAsn = asPath[asPath.length - 1]!;
        routes.add({
          ipVersion: 6,
          prefix: route.network,
          asPath: asPath,
          originAsn: originAsn,
        });
        let asInfoItem = asInfo.find('asn', originAsn)[0];
        if (undefined === asInfoItem) {
          asInfoItem = {
            asn: originAsn,
            prefixes: [],
            neighborAsns: [],
          };
          asInfo.add(asInfoItem);
        }
        (asInfoItem.prefixes as string[]).push(route.network);
        const asPathIncludingLocalAsn = [bgpData.localAS, ...asPath];
        for (let i = 0; i < asPathIncludingLocalAsn.length; i++) {
          const asn = asPathIncludingLocalAsn[i]!;
          const prevAsn = asPathIncludingLocalAsn[i - 1];
          const nextAsn = asPathIncludingLocalAsn[i + 1];
          let asInfoItem = asInfo.find('asn', asn)[0];
          if (undefined === asInfoItem) {
            asInfoItem = {
              asn: asn,
              prefixes: [],
              neighborAsns: [],
            };
            asInfo.add(asInfoItem);
          }
          if (undefined !== prevAsn && prevAsn != asn && !asInfoItem.neighborAsns.includes(prevAsn)) {
            (asInfoItem.neighborAsns as number[]).push(prevAsn);
          }
          if (undefined !== nextAsn && nextAsn != asn && !asInfoItem.neighborAsns.includes(nextAsn)) {
            (asInfoItem.neighborAsns as number[]).push(nextAsn);
          }
        }
      }
    }
    this.#ipv6Routes = routes;
    this.#ipv6AsInfo = asInfo;
  }

  public get ipv4RouterInfo(): RouterInfo | undefined {
    if (null != this.#ipv4LocalAsn && null != this.#ipv4RouterId) {
      return {
        routerId: this.#ipv4RouterId,
        localAsn: this.#ipv4LocalAsn,
      };
    }
  }

  public get ipv6RouterInfo(): RouterInfo | undefined {
    if (null != this.#ipv6LocalAsn && null != this.#ipv6RouterId) {
      return {
        routerId: this.#ipv6RouterId,
        localAsn: this.#ipv6LocalAsn,
      };
    }
  }

  public getIpv4Routes(): Route[] {
    return this.#ipv4Routes.items;
  }

  public getIpv6Routes(): Route[] {
    return this.#ipv6Routes.items;
  }

  public getIpv4AsInfo(): AsInfo[] {
    return this.#ipv4AsInfo.items;
  }

  public getIpv6AsInfo(): AsInfo[] {
    return this.#ipv6AsInfo.items;
  }
}

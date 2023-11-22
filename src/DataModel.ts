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
import { isSpecialAsn } from "./asn.js";

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
  readonly asPath: string;
  readonly originAsn: string;
}

export interface AsInfo {
  readonly asn: string;
  readonly prefixes: readonly string[]; // prefix/prefixLen
  readonly neighborAsns: readonly string[];
}

interface ParsedBgpData {
  localAsn: number;
  routerId: string;
  routes: Table<Route>;
  asInfo: Table<AsInfo>;
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

  #parseBgpData(ipVersion: 4 | 6, json: string): ParsedBgpData {
    const bgpData: FrrBgp = JSON.parse(json);
    const localAsn = bgpData.localAS;
    const routerId = bgpData.routerId;
    const routes = new Table<Route>(['prefix', 'originAsn', 'asPath']);
    const asInfo = new Table<AsInfo>(['asn']);
    const localAsInfoItem = {
      asn: String(bgpData.localAS),
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

        const asPath = route.path.split(' ').filter(asn => '' != asn).map((rawAsn) => {
          if (!rawAsn.startsWith('{')) {
            const asn = parseInt(rawAsn, 10);
            if (isSpecialAsn(asn)) {
              return '';
            }
            return rawAsn;
          }
          const asSet = rawAsn.slice(1, -1).split(',').map((asn) => parseInt(asn, 10)).filter((asn) => !isSpecialAsn(asn));
          asSet.sort((a, b) => a - b);
          if (asSet.length == 1) {
            return String(asSet[0]);
          }
          if (asSet.length > 1) {
            const str =  `{${asSet.join(',')}}`;
            console.info(`AS_SET: ${str}`)
            return str;
          }
          return '';
        }).filter((asn) => '' != asn);

        // remove AS_PATH prepending
        for (let i = asPath.length - 1; i >= 0; i--) {
          const asn = asPath[i]!;
          const prevAsn = asPath[i - 1];
          if (prevAsn == null || asn != prevAsn) {
            break;
          }
          asPath.splice(i, 1);
        }

        const originAsn = asPath[asPath.length - 1] ?? String(bgpData.localAS);
        const routeRecord = {
          ipVersion: ipVersion,
          prefix: route.network,
          asPath: asPath.join(' '),
          originAsn: originAsn,
        };

        const routeRecords = routes.find('prefix', routeRecord.prefix);
        let routeRecordFound = false;
        for (const record of routeRecords) {
          if (record.asPath == routeRecord.asPath && record.originAsn == routeRecord.originAsn) {
            routeRecordFound = true;
            break;
          }
        }
        if (!routeRecordFound) {
          routes.add(routeRecord);
        }

        let asInfoItem = asInfo.find('asn', originAsn)[0];
        if (undefined === asInfoItem) {
          asInfoItem = {
            asn: originAsn,
            prefixes: [],
            neighborAsns: [],
          };
          asInfo.add(asInfoItem);
        }

        if (!asInfoItem.prefixes.includes(route.network)) {
          (asInfoItem.prefixes as string[]).push(route.network);
        }

        const asPathIncludingLocalAsn = [String(bgpData.localAS), ...asPath];
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
            (asInfoItem.neighborAsns as string[]).push(prevAsn);
          }
          if (undefined !== nextAsn && nextAsn != asn && !asInfoItem.neighborAsns.includes(nextAsn)) {
            (asInfoItem.neighborAsns as string[]).push(nextAsn);
          }
        }
      }
    }
    return {
      localAsn: localAsn,
      routerId: routerId,
      routes: routes,
      asInfo: asInfo,
    };
  }

  public importIpv4Json(json: string): void {
    const bgpData = this.#parseBgpData(4, json);
    this.#ipv4LocalAsn = bgpData.localAsn;
    this.#ipv4RouterId = bgpData.routerId;
    this.#ipv4Routes = bgpData.routes;
    this.#ipv4AsInfo = bgpData.asInfo;
  }

  public importIpv6Json(json: string): void {
    const bgpData = this.#parseBgpData(6, json);
    this.#ipv6LocalAsn = bgpData.localAsn;
    this.#ipv6RouterId = bgpData.routerId;
    this.#ipv6Routes = bgpData.routes;
    this.#ipv6AsInfo = bgpData.asInfo;
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

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

export function addressToBigInt(address: string): bigint {
  const parts = address.split('.');
  if (4 !== parts.length) {
    throw new Error(`Invalid IPv4 address: ${address}`);
  }
  let result = 0n;
  for (const part of parts) {
    const value = Number.parseInt(part, 10);
    if (Number.isNaN(value) || 0 > value || 255 < value) {
      throw new Error(`Invalid IPv4 address: ${address}`);
    }
    result = (result << 8n) | BigInt(value);
  }
  return result;
}

export class Ipv4Prefix {
  readonly address: bigint;
  readonly mask: bigint;

  constructor(prefix: string) {
    const [prefixAddress, prefixLength] = prefix.split('/') as [string, string];
    const prefixAddressBigInt = addressToBigInt(prefixAddress);
    const mask = (1n << (32n - BigInt(prefixLength))) - 1n;
    this.address = prefixAddressBigInt & ~mask;
    this.mask = ~mask;
  }

  includesAddress(address: string): boolean {
    const addressBigInt = addressToBigInt(address);
    return (this.address & this.mask) === (addressBigInt & this.mask);
  }
}

const SPECIAL_PREFIXES: readonly Ipv4Prefix[] = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.88.99.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
].map((prefix) => new Ipv4Prefix(prefix));

export function isSpecialPrefix(prefix: string): boolean {
  return SPECIAL_PREFIXES.some((specialPrefix) => specialPrefix.includesAddress(prefix));
}

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
  const largeParts = address.split('::') as [string] | [string, string];
  if (largeParts.length > 2) {
    throw new Error(`Invalid IPv6 address: ${address}`);
  }
  if (largeParts.length == 2) {
    const [left, right] = largeParts;
    const leftParts = left.split(':');
    const rightParts = right.split(':');
    if (leftParts.length + rightParts.length >= 8) {
      throw new Error(`Invalid IPv6 address: ${address}`);
    }
    const zeroParts = 8 - leftParts.length - rightParts.length;
    const zeroArray = new Array(zeroParts).fill('0');
    address = [... leftParts, ...zeroArray, ...rightParts].join(':');
  }
  const parts = address.split(':');
  if (8 !== parts.length) {
    throw new Error(`Invalid IPv6 address: ${address}`);
  }
  let result = 0n;
  for (const part of parts) {
    const value = Number.parseInt(part || '0', 16);
    if (Number.isNaN(value) || 0 > value || 0xffff < value) {
      throw new Error(`Invalid IPv6 address: ${address}`);
    }
    result = (result << 16n) | BigInt(value);
  }
  return result;
}

export class Ipv6Prefix {
  readonly address: bigint;
  readonly mask: bigint;

  constructor(prefix: string) {
    const [prefixAddress, prefixLength] = prefix.split('/') as [string, string];
    const prefixAddressBigInt = addressToBigInt(prefixAddress);
    const mask = (1n << (128n - BigInt(prefixLength))) - 1n;
    this.address = prefixAddressBigInt & ~mask;
    this.mask = ~mask;
  }

  includesAddress(address: string): boolean {
    const addressBigInt = addressToBigInt(address);
    return (this.address & this.mask) === (addressBigInt & this.mask);
  }
}

const SPECIAL_PREFIXES: readonly Ipv6Prefix[] = [
  '::/128',
  '::1/128',
  '::ffff:0:0/96',
  '::ffff:0:0:0/96',
  '64:ff9b::/96',
  '64:ff9b:1::/48',
  '100::/64',
  '2001:20::/28',
  '2001:db8::/32',
  '2002::/16',
  'fc00::/7',
  'fe80::/10',
  'ff00::/8',
  '2001:2::/48',
].map((prefix) => new Ipv6Prefix(prefix));

export function isSpecialPrefix(prefix: string): boolean {
  return SPECIAL_PREFIXES.some((specialPrefix) => specialPrefix.includesAddress(prefix));
}

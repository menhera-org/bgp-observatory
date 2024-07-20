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

import * as fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { JSONParser } from '@streamparser/json-node';

import 'dotenv/config';

import { watchFile } from './utils.js';
import { DataModel } from './DataModel.js';

const BGP_IPV4_JSON = process.env.BGP_IPV4_JSON || '/tmp/bgp_ipv4.json';
const BGP_IPV6_JSON = process.env.BGP_IPV6_JSON || '/tmp/bgp_ipv6.json';

const AS_INFO_IPV4_JSON = process.env.AS_INFO_IPV4_JSON || '/tmp/as_info_ipv4.json';
const AS_INFO_IPV6_JSON = process.env.AS_INFO_IPV6_JSON || '/tmp/as_info_ipv6.json';

const IGNORE_DEFAULT_ROUTES = !!parseInt(process.env.IGNORE_DEFAULT_ROUTES || '1', 10);

const model = new DataModel({ ignoreDefaultRoutes: IGNORE_DEFAULT_ROUTES });

watchFile(BGP_IPV4_JSON, async () => {
  const stream = createReadStream(BGP_IPV4_JSON, 'utf-8');
  const parser = new JSONParser({ stringBufferSize: undefined, paths: ['$'] });
  const reader = stream.pipe(parser);
  reader.on('data', ({value}) => {
    model.importIpv4Data(value);
    const asInfo = model.getIpv4AsInfo();
    const asInfoJson = JSON.stringify(asInfo, null, 2);
    fs.writeFile(AS_INFO_IPV4_JSON, asInfoJson);
    process.stdout.write('Updated AS info for IPv4\n');
  });
});

watchFile(BGP_IPV6_JSON, async () => {
  const stream = createReadStream(BGP_IPV6_JSON, 'utf-8');
  const parser = new JSONParser({ stringBufferSize: undefined, paths: ['$'] });
  const reader = stream.pipe(parser);
  reader.on('data', ({value}) => {
    model.importIpv6Data(value);
    const asInfo = model.getIpv6AsInfo();
    const asInfoJson = JSON.stringify(asInfo, null, 2);
    fs.writeFile(AS_INFO_IPV6_JSON, asInfoJson);
    process.stdout.write('Updated AS info for IPv6\n');
  });
});

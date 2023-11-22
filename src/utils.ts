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

import * as fs from 'node:fs';
import * as path from 'node:path';

export function waitForFileExists(filePath: string): Promise<void> {
  return new Promise(function (resolve, _reject) {
    let timeoutDone = false;
    const timeout = setTimeout(function() {
      timeoutDone = true;
      console.info(`Waiting for ${filePath} to exist...`);
    }, 1000);

    fs.access(filePath, fs.constants.R_OK, function (err) {
      if (!err) {
        if (!timeoutDone) clearTimeout(timeout);
        watcher.close();
        resolve();
      }
    });

    const dir = path.dirname(filePath);
    const basename = path.basename(filePath);
    const watcher = fs.watch(dir, function (eventType, filename) {
      if (eventType === 'rename' && filename === basename) {
        if (!timeoutDone) clearTimeout(timeout);
        watcher.close();
        resolve();
      }
    });
  });
}

export function waitForFileExistsAll(filePaths: string[]): Promise<void> {
  return Promise.all(filePaths.map(waitForFileExists)).then(() => {});
}


export interface Watcher {
  close(): void;
}

function createInodeWatcher(filePath: string, callback: () => void): Watcher {
  let watcher: fs.FSWatcher | null = null;
  try {
    watcher = fs.watch(filePath, function (_eventType, _filename) {
      callback();
    });
  } catch (e) {
    console.info(`Failed to watch ${filePath}: ${e}`);
  }
  return {
    close: function () {
      watcher?.close();
    }
  };
}

export function watchFile(filePath: string, callback: () => void): Watcher {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);

  // call callback if file already exists
  fs.access(filePath, fs.constants.R_OK, function (err) {
    if (!err) {
      callback();
    }
  });

  let inodeWatcher = createInodeWatcher(filePath, callback);
  const watcher = fs.watch(dir, function (eventType, filename) {
    if (eventType === 'rename' && filename === basename) {
      inodeWatcher.close();
      inodeWatcher = createInodeWatcher(filePath, callback);
      callback();
    }
  });
  return {
    close: function () {
      watcher.close();
      inodeWatcher.close();
    }
  };
}

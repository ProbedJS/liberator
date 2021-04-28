/**
 * Copyright 2021 Francois Chabot
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as path from 'path';

export default interface Context {
  distDir: string;
  rootDir: string;

  /** Keys to remove from the package.json when building. */
  excludeFromPackage: string[];

  /** Additional files to be copied from the repo into distDir on build. */
  additionalFiles: string[];
}

const defaultContext = (): Context => {
  return {
    distDir: 'dist/',
    rootDir: process.cwd(),
    excludeFromPackage: ['private', 'scripts', 'devDependencies', 'files'],
    additionalFiles: ['.npmrc', 'README.md', 'LICENSE'],
  };
};

export const loadContext = async (): Promise<Context> => {
  const ctx = defaultContext();
  ctx.distDir = path.resolve(ctx.rootDir, ctx.distDir);
  return ctx;
};

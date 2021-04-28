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

import rec from './recommended/index.js';

import { JsonObject } from 'type-fest';

export interface FileDef {
  name: string;
  type: 'source' | 'text' | 'raw';
  contents: string;
}

export interface TemplateConfig {
  libName: string;
  author: {
    name: string;
    email: string;
  };
  license: string;
}

const templates: Record<string, (cfg: TemplateConfig) => FileDef[]> = {
  recommended: rec,
};

export const templateConfigFromPackage = (
  packageJson: JsonObject
): TemplateConfig => {
  const rawAuthor = packageJson['author'];
  let author: { name: string; email: string } = { name: '', email: '' };

  if (typeof rawAuthor === 'object') {
    author = rawAuthor as typeof author;
  } else if (typeof rawAuthor === 'string') {
    author = { name: rawAuthor, email: '' };
  }

  return {
    libName: packageJson['name'] as string,
    author: author,
    license: packageJson['license'] as string,
  };
};

export const getTemplate = (name: string, cfg: TemplateConfig): FileDef[] => {
  const result = templates[name];
  if (!result) {
    throw Error(`unknown template: ${name}`);
  }
  return result(cfg);
};

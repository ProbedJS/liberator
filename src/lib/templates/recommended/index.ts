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

import { FileDef, TemplateConfig } from '..';
import licenses from '../../licenses/index.js';
import { applyBanner } from '../utils.js';

import _ from 'lodash';

const gitignore: FileDef = {
  name: '.gitignore',
  type: 'text',
  contents: `
node_modules/
dist/
*.log
`,
};

const index_ts: FileDef = {
  name: 'src/index.ts',
  type: 'source',
  contents: `
/** Hello! */
export const Hello = (name: string): string => {
    return "Hello " + name;
};
`,
};

const sampleTest_ts: FileDef = {
  name: 'tests/index.test.ts',
  type: 'source',
  contents: `
import { Hello } from '<%= cfg.libName %>';
describe('The Hello Function', () => {
    it('produces the expected output', () => {
        expect(Hello('world')).toBe('Hello world');
    });
});
`,
};

const readme_md: FileDef = {
  name: 'README.md',
  type: 'text',
  contents: `
# <%= cfg.libName %>

Short description of the library.

## Usage

\`\`\`
import {Hello} from '<%= cfg.libName %>';

console.log(Hello('world'))'
\`\`\`
`,
};

const build = (opts: TemplateConfig): FileDef[] => {
  const result: FileDef[] = [];

  const license = licenses[opts.license];

  if (license.license) {
    result.push({
      name: 'LICENSE',
      type: 'text',
      contents: license.license,
    });
  }

  result.push(index_ts, readme_md, sampleTest_ts, gitignore);

  return result.map((r) => {
    if (r.type === 'raw') {
      return r;
    }

    const processed = {
      name: r.name,
      type: r.type,
      contents: _.template(r.contents)({ cfg: opts }),
    };
    return applyBanner(processed, opts);
  });
};

export default build;

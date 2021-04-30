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

import { default as jest } from 'jest';

import Context, { loadContext } from '../context.js';

import yargs from 'yargs';

export type TestOptions = {
  // Nada
};

export const test = async (
  _opts: TestOptions,
  _ctx: Context
): Promise<void> => {
  return await jest.run(['--config', JSON.stringify(jestConfig)], _ctx.rootDir);
};

export const command: yargs.CommandModule<unknown, TestOptions> = {
  command: 'test',
  describe: 'Runs tests on the source',
  builder: {},
  handler: async (argv: TestOptions) => {
    try {
      await test(argv, await loadContext());
    } catch (e) {
      process.exit(1);
    }
  },
};

const jestConfig = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|js)?$',
  moduleFileExtensions: ['js', 'ts'],
  coveragePathIgnorePatterns: ['/node_modules/', 'src/internalValidation.ts'],
  collectCoverage: !!process.env.COVERAGE,
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};

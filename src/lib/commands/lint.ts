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

import Context, { loadContext } from '../context.js';
import { run, setMessage, setStatus } from '@probedjs/task-runner';

import yargs from 'yargs';
import { ESLint, Linter } from 'eslint';

export type LintOptions = {
  fix: boolean;
  werror: boolean;
};

export const lint = async (opts: LintOptions, ctx: Context): Promise<void> => {
  const options: ESLint.Options = {
    cwd: ctx.rootDir,
    baseConfig: eslintConfig,
    fix: opts.fix,
  };

  await run('Lint...', async () => {
    const linter = new ESLint(options);
    const fmt = run('loading Formatter', () => linter.loadFormatter('stylish'));

    const results = run('Processing source', async () => {
      const results = await linter.lintFiles('./src/**/*');
      let output = false;
      if (results.some((r) => r.warningCount > 0)) {
        setMessage('Warnings found');
        setStatus('warn');
        output = true;
      } else if (results.some((r) => r.errorCount > 0)) {
        setMessage('Errors found');
        setStatus('fail');
        output = true;
      }

      if(output) {
        const resultText = (await fmt).format(results);
        console.warn(resultText);
      }

      return results;
    });

    if (opts.fix) {
      run('Applying fixes', async () => ESLint.outputFixes(await results));
    }
  });

  // if (log._root.status === 'warn' && opts.werror) {
  //   console.error('Lint failed due to warnings');
  //   throw new Error('Lint failed because of warnings');
  // }
};

export const command: yargs.CommandModule<unknown, LintOptions> = {
  command: 'lint',
  describe: 'Verifies code quality',
  builder: {
    fix: {
      type: 'boolean',
      describe: 'Fix the code',
      default: false,
    },
    werror: {
      alias: 'e',
      type: 'boolean',
      describe: 'Treat warnings on non-optional steps as error.',
      default: true,
    },
  },
  handler: async (argv: LintOptions) => {
    try {
      await lint(argv, await loadContext());
    } catch (e) {
      process.exit(1);
    }
  },
};

const eslintConfig: Linter.Config = {
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts', '.js', '.tsx', '.jsx'],
      },
    },
  },
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
  ],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        endOfLine: 'lf',
        printWidth: 80,
        trailingComma: 'es5',
      },
    ],
    'require-atomic-updates': 'warn',
    'class-methods-use-this': 'warn',
    'no-caller': 'warn',
    'no-empty-function': 'warn',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
      },
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/typescript',
      ],
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-explicit-any': [
          'error',
          { ignoreRestArgs: true },
        ],
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/ban-ts-comment': 'off',
      },
    },
  ],
};

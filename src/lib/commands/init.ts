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

// Parts of this file are lifted straight from create-react-app : https://github.com/facebook/create-react-app
// MIT License

// Copyright (c) 2013-present, Facebook, Inc.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { getTemplate, TemplateConfig } from '../templates/index.js';

import { default as fs } from 'fs-extra';
import chalk from 'chalk';
import { spawn } from 'cross-spawn';
import path from 'path';
import readline from 'readline';
import { default as semver } from 'semver';
import yargs from 'yargs';
import validateProjectName from 'validate-npm-package-name';
import { fileURLToPath } from 'url';

import { run, update } from '@probedjs/task-runner';

const { ensureDir, lstat, readdir, rm, writeFile, readFile } = fs;

const isSafeToCreateProjectIn = async (root: string, name: string) => {
  const validFiles = [
    '.DS_Store',
    '.git',
    '.gitattributes',
    '.gitignore',
    '.gitlab-ci.yml',
    '.hg',
    '.hgcheck',
    '.hgignore',
    '.idea',
    '.npmignore',
    '.travis.yml',
    'docs',
    'LICENSE',
    'README.md',
    'mkdocs.yml',
    'Thumbs.db',
  ];

  // These files should be allowed to remain on a failed install, but then
  // silently removed during the next create.
  const errorLogFilePatterns = ['.pnpm-debug.log'];
  const isErrorLog = (file: string) => {
    return errorLogFilePatterns.some((pattern) => file.startsWith(pattern));
  };

  run(async () => {
    update({ label: 'Checking existing files' });

    const conflicts = (await readdir(root))
      .filter((file) => !validFiles.includes(file))
      .filter((file) => !/\.iml$/.test(file))
      .filter((file) => !isErrorLog(file));

    if (conflicts.length > 0) {
      update({
        message: `${chalk.green(name)} contains potentially conflicting files.`,
      });

      for (const file of conflicts) {
        try {
          const stats = await lstat(path.join(root, file));
          if (stats.isDirectory()) {
            console.error(`  ${chalk.blue(`${file}/`)}`);
          } else {
            console.error(`  ${file}`);
          }
        } catch (e) {
          console.error(`  ${file}`);
        }
      }
      console.error(
        '\nEither try using a new directory name, or remove the files listed above.'
      );
    }
  });

  run(async () => {
    update({ label: 'Removing old error logs' });

    const oldFiles = await readdir(root);

    await Promise.all(
      oldFiles.map(async (file) => {
        if (isErrorLog(file)) {
          await rm(path.join(root, file));
        }
      })
    );
  });
};

const checkAppName = (appName: string) => {
  const validationResult = validateProjectName(appName);
  if (!validationResult.validForNewPackages) {
    console.error(
      chalk.red(
        `Cannot create a project named ${chalk.green(
          `"${appName}"`
        )} because of npm naming restrictions:\n`
      )
    );
    [
      ...(validationResult.errors || []),
      ...(validationResult.warnings || []),
    ].forEach((error) => {
      console.error(chalk.red(`  * ${error}`));
    });
    console.error(chalk.red('\nPlease choose a different project name.'));
    throw new Error('Invalid project name');
  }
};

const install = async (opts: {
  packages: string[];
  dev: boolean;
  root: string;
}) => {
  const command = 'pnpm';
  const args = ['install'];

  if (opts.dev) {
    args.push('-D');
  }

  args.push(...opts.packages);

  const child = spawn(command, args);

  let outlog = '';

  const sendLog = (msg: string) => {
    const crLoc = msg.indexOf('\r');
    const lfLoc = msg.indexOf('\n');

    let breakLoc = Math.min(crLoc, lfLoc);
    if (breakLoc === -1) {
      breakLoc = Math.max(crLoc, lfLoc);
    }

    update({ message: msg.slice(0, Math.max(0, breakLoc)) });
  };

  child.stdout.on('data', (data) => {
    sendLog(data.toString());
    outlog += data.toString();
  });
  child.stderr.on('data', (data) => {
    sendLog(data.toString());
    outlog += data.toString();
  });

  await new Promise<void>((resolve, reject) => {
    child.on('close', (code) => {
      if (code !== 0) {
        if (outlog.trim().length > 0) console.error(outlog);
        reject({
          command: `${command} ${args.join(' ')}`,
        });
      } else {
        if (outlog.trim().length > 0) console.log(outlog);
        resolve();
      }
    });
  });
};

export interface Author {
  name: string;
  email: string;
}

export interface InitOptions {
  name: string;
  author: Author;
  template: string;
  license: string;
}

export const init = async (opts: InitOptions): Promise<void> => {
  const { name } = opts;

  await run(async () => {
    update({ label: `Init ${name}` });
    if (!semver.satisfies(process.version, '>=14')) {
      throw new Error(chalk.red(`Node ${process.version} is too old.`));
    }

    const root = path.resolve(name);
    const appName = path.basename(root);

    checkAppName(appName);

    await run(() => ensureDir(name), { label: 'Creating dir' });
    await run(() => isSafeToCreateProjectIn(root, name), {
      label: 'Checking destination',
    });

    process.chdir(root);

    //setMessage(`Creating a new library in ${chalk.green(root)}.`);

    const cfg: TemplateConfig = {
      libName: name,
      license: opts.license,
      author: opts.author,
    };

    const template = run(async () => getTemplate(opts.template, cfg), {
      label: `loading template ${opts.template}`,
    });

    const packageJsonCreated = run(async () => {
      update({ label: 'creating package.json' });

      // Not used right now, but it will be soon enough.
      await template;

      const packageJson = {
        name: appName,
        version: '0.1.0',
        private: true,
        author: opts.author,
        license: opts.license,
        type: 'module',
        main: 'dist/cjs/index.js',
        module: 'dist/esm/index.js',
        unpkg: 'dist/umd/index.es6.js',
        scripts: {
          build: 'liberator build',
          test: 'liberator test',
          lint: 'liberator lint',
        },
      };

      await writeFile(
        path.resolve(root, 'package.json'),
        JSON.stringify(packageJson, null, 2) + '\n'
      );
    });

    run(async () => {
      update({ label: 'installing dependencies' });

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const { version } = JSON.parse(
        await readFile(path.resolve(__dirname, '../../package.json'), 'utf-8')
      );

      await packageJsonCreated;
      await install({
        dev: true,
        packages: [`@probedjs/liberator@^${version}`],
        root: root,
      });
    });

    run(async () => {
      update({ label: 'Copying files' });
      for (const file of await template) {
        run(async () => {
          update({ label: file.name });
          await ensureDir(path.dirname(file.name));
          await writeFile(
            path.resolve(root, file.name),
            file.contents,
            'utf-8'
          );
        });
      }
    });
  });
};

const askQuestion = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
};

export const command: yargs.CommandModule<unknown, InitOptions> = {
  command: 'init <name>',
  describe: 'creates a new library',
  builder: {
    template: {
      type: 'string',
      describe: 'The template to use',
      default: 'recommended',
    },
    license: {
      type: 'string',
      describe: 'The license to apply',
      default: 'Apache-2.0',
    },
  },
  handler: async (argv: InitOptions) => {
    try {
      const name = await askQuestion('Author Name:');
      const email = await askQuestion('Author Email:');
      argv.author = { name, email };
      await init(argv);
    } catch (e) {
      console.log(e);
      process.exit(1);
    }
  },
};

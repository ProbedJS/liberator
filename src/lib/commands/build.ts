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
import { compileBanner } from '../templates/utils.js';
import { templateConfigFromPackage } from '../templates/index.js';

import { run, tryRun, update } from '@probedjs/task-runner';

import { default as fs } from 'fs-extra';
import chalk from 'chalk';
import path from 'path';
import { JsonObject } from 'type-fest';
import yargs from 'yargs';

import { InputOptions, OutputOptions, rollup, RollupWarning } from 'rollup';
import rollupCleanup from 'rollup-plugin-cleanup';
import rollupTypescript from '@rollup/plugin-typescript';

const { copyFile, mkdir, readFile, rm, writeFile } = fs;

export type BuildOptions = {
  packageOnly: boolean;
  clean: boolean;
  werror: boolean;
};

const npmIgnore = ['node_modules', '.npmrc'];

const moveDistPath = (p: string, ctx: Context, force = false): string => {
  const resolved = path.resolve(ctx.rootDir, p);

  const relative = path.relative(ctx.distDir, resolved);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    return relative.replace(/\\/g, '/');
  } else if (force) {
    throw new Error(
      `Expecting a path relative to the dist directory, but got ${p} instead`
    );
  }

  return p;
};

export const processPackageJson = async (
  packageJson: JsonObject,
  ctx: Context
): Promise<void> => {
  for (const key in packageJson) {
    if (typeof packageJson[key] == 'string') {
      packageJson[key] = moveDistPath(packageJson[key] as string, ctx);
    }
  }

  if (packageJson.bin) {
    const bin = packageJson.bin as Record<string, string>;
    for (const key in bin) {
      bin[key] = './' + moveDistPath(bin[key], ctx, true);
    }
  }

  for (const key of ctx.excludeFromPackage) {
    delete packageJson[key];
  }

  await writeFile(
    path.resolve(ctx.distDir, 'package.json'),
    Buffer.from(JSON.stringify(packageJson, null, 2), 'utf-8')
  );
};

const formatWarning = (warning: RollupWarning): string => {
  let result = '';
  if (warning.loc) {
    result += `${chalk.cyan(warning.loc.file)}:${chalk.yellow(
      warning.loc.line
    )}:${chalk.yellow(warning.loc.column)} - `;
  }
  result += warning.message + '\n';

  if (warning.frame) {
    result += warning.frame;
  }
  return result;
};

const performRollup = async (packageJson: JsonObject, ctx: Context) => {
  const cfg = templateConfigFromPackage(packageJson);

  const inputOpts: InputOptions = {
    input: 'src/index.ts',
    plugins: [
      rollupTypescript({
        exclude: ['tests/**/*'],
      }),
      rollupCleanup({ comments: 'none', extensions: ['.ts', '.js'] }),
    ],
    onwarn: (warning) => {
      update({ message: warning.message });
      console.warn(formatWarning(warning));
    },
  };
  const bundle = run(() => rollup(inputOpts), { label: 'Ingress' });

  const done = run(async () => {
    update({ label: 'Generation' });

    const esmOut: OutputOptions = {
      sourcemap: true,
      file: path.resolve(ctx.distDir, 'esm/index.js'),
      banner: compileBanner(cfg),
      format: 'es',
    };

    run(async () => (await bundle).write(esmOut), { label: 'esm' });

    const cjsOut: OutputOptions = {
      sourcemap: true,
      file: path.resolve(ctx.distDir, 'cjs/index.js'),
      banner: compileBanner(cfg),
      format: 'cjs',
    };

    run(async () => (await bundle).write(cjsOut), { label: 'cjs' });
  });

  run(async () => {
    update({ label: 'Closing Up' });
    await done;
    (await bundle).close();
  });
};

export const build = async (
  opts: BuildOptions,
  ctx: Context
): Promise<void> => {
  await run(async () => {
    update({ label: 'Build' });

    if (opts.clean) {
      await run(() => rm(ctx.distDir, { recursive: true, force: true }), {
        label: 'Cleaning up previous build',
      });
    }
    const distReady = tryRun(() => mkdir(ctx.distDir), {
      label: 'Creating dist dir',
    });

    const packageJson = run(async () => {
      update({ label: 'Loading package.json' });
      const source = (
        await readFile(path.resolve(ctx.rootDir, 'package.json'), 'utf-8')
      ).toString();
      return JSON.parse(source);
    });

    if (!opts.packageOnly) {
      run(async () => performRollup(await packageJson, ctx), {
        label: 'Rolling up...',
      });
    }

    run(async () => {
      update({ label: 'packaging' });

      run(async () => {
        update({ label: 'building package.json' });

        await distReady;
        processPackageJson(await packageJson, ctx);
      });

      run(async () => {
        update({ label: 'Creating a npmignore' });

        await distReady;
        await writeFile(
          path.resolve(ctx.distDir, '.npmignore'),
          npmIgnore.join('\n') + '\n'
        );
      });

      run(async () => {
        update({ label: 'Additional files' });

        await distReady;
        ctx.additionalFiles.forEach((file) => {
          tryRun(
            () =>
              copyFile(
                path.resolve(ctx.rootDir, file),
                path.resolve(ctx.distDir, file)
              ),
            { label: file }
          );
        });
      });
    });
  });

  // if (log._root.status === 'warn' && opts.werror) {
  //   console.error('Build failed due to warnings');
  //   throw new Error('Build failed because of warnings');
  // }
};

export const command: yargs.CommandModule<unknown, BuildOptions> = {
  command: 'build',
  describe: 'Builds the library',
  builder: {
    packageOnly: {
      alias: 'p',
      type: 'boolean',
      describe: 'Only run the packaging step',
      default: false,
    },
    clean: {
      alias: 'c',
      type: 'boolean',
      describe: 'Empty the build directory beforehand.',
      default: false,
    },
    werror: {
      alias: 'e',
      type: 'boolean',
      describe: 'Treat warnings on non-optional steps as error.',
      default: true,
    },
  },
  handler: async (argv: BuildOptions) => {
    try {
      await build(argv, await loadContext());
    } catch (e) {
      process.exit(1);
    }
  },
};

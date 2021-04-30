# Liberator

A stubornly opiniated environment for typescript libraries. 

Using Liberator, you get:
- Typescript.
- A clean `dist/` containing only what users of the library need. 
- Multiple build targets: esm, cjs, umd, prod, dev.
- Test and coverage of both the source and the various built libraries.
- Linting with eslint and prettier.
- A clean repository without a bazillion config files.

## Getting started

Here's the very few rules of thumb you need to keep in mind:

1. All the source code goes in `src/`.
2. `src/index.ts` is the sole entrypoint.
3. Specs and tests can be either in `src/` or `tests/`
4. You do **not** publish the root repository, the `dist/` directory itself is published.
5. `*.spec.ts` runs on both the source **and** the built library. 

### From scracth:
```
npx @probedjs/liberator my-library
// or
npx @probedjs/liberator @my-scope/my-library
```

### For an existing library

The easiest way to go about this is to create a placeholder library using `npx @probedjs/liberator placeholderLib`, and use it as a reference point.

Make sure you don't forget to set `"private": true` in your package.json so that you don't accidentally publish the source version of the library.

## Configuring

For the time being, there is no configuration options whatsoever, since the main reason for it existing is to unify configuration accross a bunch of projects.
That being said, if there is a demand for it, we can make things a bit more parametrizable.

## Building

The following command will populate the `dist/` directory with the library ready to be published.
```
npm run build
```

## Testing

Testing the source. This will run all files named `*.test.ts` as well as `*.spec.ts` on the library as present in the `src/` directory:
```
npm run test
```

Testing the built library. This will run all files named `*.spec.ts` on all versions of the library present in the `dist/` directory:
```
npm run testDist
```

## Misc.

### Keeping Visual Studio Code happy

If you are using the eslint VSCode extension, you need to point it in the right direction:

.vscode/settings.json
```
{
    "eslint.options": {
        "configFile" : "node_modules/@probedjs/eslint-config/index.js"
    }
}
```

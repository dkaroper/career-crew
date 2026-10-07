#!/usr/bin/env node
'use strict';
// Usage: node scripts/app_path.js "<Company>" "<Role>" [--root <dir>]
// Prints the application folder path. Agents must use this instead of building paths by hand.
const path = require('node:path');
const { safeSegment } = require('./lib/profile');

function main(argv) {
  const args = [];
  let root = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') {
      if (i + 1 >= argv.length) return fail('--root needs a directory');
      root = argv[++i];
    } else {
      args.push(argv[i]);
    }
  }
  if (args.length !== 2) return fail('usage: node scripts/app_path.js "<Company>" "<Role>" [--root <dir>]');
  const base = path.resolve(root, 'applications');
  const target = path.resolve(base, `${safeSegment(args[0])}_${safeSegment(args[1])}`);
  if (path.dirname(target) !== base || !target.startsWith(base + path.sep)) {
    return fail('resolved path escapes applications/');
  }
  process.stdout.write(target + '\n');
  return 0;
}

function fail(msg) {
  process.stderr.write(msg + '\n');
  return 1;
}

process.exitCode = main(process.argv.slice(2));

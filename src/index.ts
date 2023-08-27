#!/usr/bin/env node
":" //# comment; exec /usr/bin/env node --experimental-modules --experimental-json-modules "$0" "$@"

import { program } from 'commander';
import { sigintOrsigTerm } from './exit.js';
import './version.js';
import './eslint.js';
import './stylelint.js';
import './build.js';
import './start.js';
import './create.js';
import './build-app.js';
import './git-hooks.js';
import './changelog.js';

program.option('-ig,--initgit', 'init git');

program.parse(process.argv);

sigintOrsigTerm();

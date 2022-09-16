#!/usr/bin/env node
":" //# comment; exec /usr/bin/env node --experimental-modules --experimental-json-modules "$0" "$@"

import { program } from 'commander';
import { sigintOrsigTerm } from './exit';
import './version';
import './eslint';
import './stylelint';
import './build';
import './start';
import './create';
import './build-app';
import './git-hooks';

program.option('-ig,--initgit', 'init git');

program.parse(process.argv);

sigintOrsigTerm();

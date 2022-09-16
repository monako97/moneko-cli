import { program } from 'commander';
import { cliPkgJson } from './utils/config.js';

program.version(cliPkgJson.version, '-v, --version');

import { program } from 'commander';
import { cliVersion } from './utils/config.js';

program.version(cliVersion, '-v, --version');

#!/usr/bin/env node

import { main } from '../src/cli';

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

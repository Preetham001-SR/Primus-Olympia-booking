import { Config } from '@remotion/cli/config';

// No webpack cache for CLI renders/Studio: it grew to 400+ MB on a nearly full disk.
Config.setCachingEnabled(false);

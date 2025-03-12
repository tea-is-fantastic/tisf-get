#!/usr/bin/env node

import fs from 'fs'
import { ensureFileSync } from 'fs-extra'
import path from 'path'
import stream from 'stream'
import util from 'util'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { normalize } from './normalize.mjs'

const pipeline = util.promisify(stream.pipeline);
const argv = yargs(hideBin(process.argv))
  .usage('Usage: npx @tisf/get <url> [path] [options]')
  .command('$0 <url> [path]', 't', (yargs) => {
    yargs.positional('url', {
      describe: 'Url of file to download',
      type: 'string'
    })
    yargs.positional('path', {
      describe: 'Path to download file to', type: 'string'
    })
  })
  .options({
    f: {
      default: false,
      describe: 'Force download (default: false)',
      type: 'boolean'
    },
    l: {
      default: false,
      describe: 'list of files (default: false)',
      type: 'boolean'
    }
  })
  .help('h')
  .demandCommand(1)
  .parse()


const forceDownload = async (pth, force) => {
  try {
    if (force) return true
    const stats = await fs.promises.stat(pth);
    if (stats.isDirectory()) {
      return false;
    } else if (stats.isFile() && stats.size > 0) {
      return false;
    }
    return true
  } catch (error) {
    return true;
  }
}

const downloadFile = async (url, pth, force) => {
  let fname;
  try {
    fname = path.basename((new URL(url)).pathname);
  } catch (err) {
    fname = path.basename((new URL("http://" + url)).pathname);
  }
  console.log(pth, fname);
  let fpth = path.resolve(pth || "", fname)

  if (!(await forceDownload(fpth, force))) return
  ensureFileSync(fpth);
  const fdata = await normalize(url, null);
  await pipeline(fdata, fs.createWriteStream(fpth));
  console.log(`download ${url} successful`);
}

(async () => {

  const url = argv.url;
  const pth = argv.path;
  const force = argv.f;
  const islist = argv.l;

  if (islist) {
    const config = await normalize(url);
    for (const x of config.files) {
      console.log(x);
      await downloadFile(x[0], x[1], force);
    }

  } else {
    await downloadFile(url, pth, force);
  }
})();

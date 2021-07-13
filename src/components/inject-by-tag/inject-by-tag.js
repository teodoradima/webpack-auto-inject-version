import dateFormat from 'dateformat';
import chalk from 'chalk';
import { SourceMapSource, ReplaceSource, RawSource } from 'webpack-sources';

import log from '../../core/log';
import config from '../../config';

/**
 * Inject version number into HTML
 * - done by parsing html file,
 *   > replace: <{version}>
 */
export default class InjectByTag {

  static componentName = 'InjectByTag';

  constructor(context) {
    this.context = context;
  }

  /**
   * Apply will be called from main class
   * @protected
   * @return {Promise}
   */
  apply() {
    this.context.compiler.hooks.compilation.tap(InjectByTag.componentName, (compilation) => {
      compilation.hooks.optimizeChunkAssets.tap(InjectByTag.componentName, (chunks) => {
        chunks.forEach((chunk) => {
          chunk.files.forEach((file) => {
            if (!this.context.config.componentsOptions.InjectByTag.fileRegex.test(file)) {
              return;
            }
            let replaced = 0;
            const asset = compilation.assets[file];
            const newSource = new ReplaceSource(asset);
            const AIVTagRegexp = this.context.config.componentsOptions.InjectByTag.AIVTagRegexp;
            const source = asset.source();

            // eslint-disable-next-line no-constant-condition
            while (true) {
              const match = AIVTagRegexp.exec(source);
              if (!match) break;
              replaced++;
              const newVal = this.replace(match[0]);
              newSource.replace(match.index, match.index + match[0].length - 1, newVal);
            }

            compilation.assets[file] = newSource;
            log.info(`${chalk.red('InjectByTag')} : match : ${file} : replaced : ${replaced}`);
          });
        });
      });

    });
    return new Promise((resolve) => { resolve(); });
  }

  replace(tag) {
    // handle version
    tag = tag.replace(/(\{)(version)(\})/g, () => {
      return this.context.version;
    });

    // handle date
    tag = tag.replace(/(\{)(date)(\})/g, () => {
      return dateFormat(new Date(), this.context.config.componentsOptions.InjectByTag.dateFormat);
    });

    // remove [AIV] and [/AIV]
    tag = tag.replace(/(\[AIV])|(\[\/AIV])/g, '');

    return tag;
  }
}

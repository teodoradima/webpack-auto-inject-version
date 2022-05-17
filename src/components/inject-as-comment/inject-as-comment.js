import path from 'path';

import { ReplaceSource } from 'webpack-sources';

import tags from './tags';

import config from '../../config';
import log from '../../core/log';


const endOfLine = require('os').EOL;

/**
 * Inject version number into HTML
 * - done by parsing html file,
 *   > replace: <{version}>
 */
export default class InjectAsComment {

  static componentName = 'InjectAsComment';

  constructor(context) {
    this.context = context;
  }

  /**
   * Apply will be called from main class
   * - hook into webpack emit
   * - iterate complication.assets files
   * - handle each file
   * @protected
   * @return {Promise}
   */
  apply() {
    this.context.compiler.hooks.compilation.tap(InjectAsComment.componentName, (compilation) => {
      compilation.hooks.optimizeChunkAssets.tap(InjectAsComment.componentName, (chunks) => {
        chunks.forEach((chunk) => {
          chunk.files.forEach((file) => {
            // bug fix, extname is not able to handle chunk file params index.js?random123
            const ext = path.extname(file).replace(/(\?)(.){0,}/, '');
            const asset = compilation.assets[file];
            const newSource = new ReplaceSource(asset);
            this._handleAssetFile(ext, newSource);
            log.info(`InjectAsComment : match : ${file} : injected : ${this.context.version}`);
            compilation.assets[file] = newSource;
          });
        });
      });
    });
    return Promise.resolve();
  }

  /**
   * Handle asset file
   * - call suitable inject based on file extension
   * @param ext
   * @param asset
   * @private
   * @return {ReplaceSource}
   */
  _handleAssetFile(ext, asset) {
    switch (ext) {
      case '.js': {
        return this.injectIntoJs(asset);
      }
      case '.html': {
        return this.injectIntoHtml(asset);
      }
      case '.css': {
        return this.injectIntoCss(asset);
      }
      default:
        return null;
    }
  }

  /**
   * Parse tags
   * - parse inject tags eg {version}, {date}
   * @private
   *
   * @param baseOpen
   * @param baseClose
   *
   * @return {string}
   */
  parseTags(baseOpen, baseClose) {
    let tagPattern = this.context.config.componentsOptions.InjectAsComment.tag;
    tagPattern = tagPattern.replace(/(\{([a-zA-Z]+)\})/g, (tag) => {
      const tagName = tag.replace(/(\{|\})/g, '');
      if (typeof tags[tagName] === 'function') {
        return tags[tagName](this.context);
      }
      log.error(`unsupported tag in componentsOptions.InjectAsComment.tag [${tagName}]`);
      return tag;
    });
    return `${baseOpen} ${tagPattern} ${baseClose}`;
  }

  /**
   * Inject into css
   * - inject tag comment into css asset file
   * - format: / ** .... ** /
   * @private
   *
   * @param asset
   *
   * @return {ReplaceSource}
   */
  injectIntoCss(asset) {
    asset.insert(0, `${this.parseTags(`/** [${config.SHORT}] `, ' **/ ')}${endOfLine}`);
    return asset;
  }

  /**
   * Inject into html
   * - inject tag comment into html asset file
   * - format: <!-- ... -->
   * @private
   *
   * @param asset
   *
   * @return {ReplaceSource}
   */
  injectIntoHtml(asset) {
    asset.insert(0, `${this.parseTags(`<!-- [${config.SHORT}] `, ' --> ')}${endOfLine}`);
    return asset;
  }

  /**
   * Inject into JS
   * - inject tag comment into JS asset file
   * - format: // ...
   * @private
   *
   * @param asset
   *
   * @return {ReplaceSource}
   */
  injectIntoJs(asset) {
    asset.insert(0,
      this.context.config.componentsOptions.InjectAsComment.multiLineCommentType ?
        `${this.parseTags(`/** [${config.SHORT}] `, '*/ ')}${endOfLine}` :
        `${this.parseTags(`// [${config.SHORT}] `, ' ')}${endOfLine}`
    );
    return asset;
  }
}

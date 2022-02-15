import * as crypto from 'crypto';
import type { ITwitterApiClientPlugin, ITwitterApiBeforeRequestConfigHookArgs, ITwitterApiAfterRequestHookArgs, TwitterResponse } from 'twitter-api-v2';

export abstract class TwitterApiCachePluginCore implements ITwitterApiClientPlugin {
  protected abstract hasKey(key: string): boolean | Promise<boolean>;

  protected abstract getKey(key: string): TwitterResponse<any> | undefined | Promise<TwitterResponse<any> | undefined>;

  protected abstract setKey(key: string, response: TwitterResponse<any>): void | Promise<void>;

  async onBeforeRequestConfig(args: ITwitterApiBeforeRequestConfigHookArgs) {
    if (this.isRequestCacheable(args)) {
      const key = this.getRequestKey(args);
      const keyExists = await this.hasKey(key);

      if (keyExists) {
        return await this.getKey(key);
      }
    }
  }

  async onAfterRequest(args: ITwitterApiAfterRequestHookArgs) {
    if (this.isRequestCacheable(args)) {
      await this.setKey(this.getRequestKey(args), args.response);
    }
  }

  protected getKeyPrefix() {
    return '';
  }

  protected isRequestCacheable(args: ITwitterApiBeforeRequestConfigHookArgs) {
    // Do not cache other methods that GET, because other one has side effects
    return args.params.method.toUpperCase() === 'GET';
  }

  protected getRequestKey({ url, params }: ITwitterApiBeforeRequestConfigHookArgs) {
    const method = params.method.toUpperCase();

    const paramsHash = this.getObjectHash(params.params ?? {});
    const queryHash = this.getObjectHash(params.query ?? {});

    return this.getKeyPrefix() + this.getHashOfString(`${method} ${url.toString()} ${paramsHash} | ${queryHash}`);
  }

  protected getHashOfString(string: string) {
    return crypto.createHash('md5')
      .update(string)
      .digest()
      .toString('hex');
  }

  private getObjectHash(obj: any) {
    // TODO: look for a better algorithm
    const keys = this.getObjectHashKeys(obj)
      .sort()
      .join('|');

    return this.getHashOfString(keys);
  }

  private getObjectHashKeys(obj: any, prefix = '') {
    const keys: string[] = [];

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        if (typeof value === 'object' && value !== null) {
          keys.push(...this.getObjectHashKeys(value, prefix + key + '.'));
        } else if (value !== undefined) {
          keys.push(prefix + key + '=' + String(value));
        }
      }
    }

    return keys;
  }
}

export default TwitterApiCachePluginCore;

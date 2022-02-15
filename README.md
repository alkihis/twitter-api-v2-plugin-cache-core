# @twitter-api-v2/plugin-cache-core

> Provide core utils to create a request cache plugin for twitter-api-v2

This package is meant to be used by other plugin packages, and can't be used alone.

## Usage

```ts
import { TwitterApiCachePluginCore } from '@twitter-api-v2/plugin-cache-core';

class MyRequestCachePlugin extends TwitterApiCachePluginCore {
  // You must write those methods with the following signatures:
  protected hasKey(key: string): boolean | Promise<boolean>;

  protected getKey(key: string): TwitterResponse<any> | undefined | Promise<TwitterResponse<any> | undefined>;

  protected setKey(key: string, response: TwitterResponse<any>): void | Promise<void>;
}
```

then, use your plugin into `twitter-api-v2`:

```ts
import { TwitterApi } from 'twitter-api-v2';
import { MyRequestCachePlugin } from './your-plugin';

const client = new TwitterApi(yourKeys, { plugins: [new MyRequestCachePlugin()] });
```

## Defaults and customization

### By default

- a `key` is generated from a request using request URL and parameters
- cached requests are **ONLY** requests for **GET** method
- request key is not scoped by user/token, so if you're using a shared key/value storage (like file system or Redis), cache will be shared across all client instances

### Defaut settings customization

#### Key generation

  If you just want to add a prefix to the key, you can customize this by overriding the `.getKeyPrefix()` method:

  ```ts
  class MyRequestCachePlugin extends TwitterApiCachePluginCore {
    protected getKeyPrefix() {
      return 'prefix-';
    }
  }
  ```

  If you want to generate key by yourself, override the `.getRequestKey()` method:

  ```ts
  class MyRequestCachePlugin extends TwitterApiCachePluginCore {
    protected getRequestKey({ url, params }: ITwitterApiBeforeRequestConfigHookArgs) {
      const method = params.method.toUpperCase();
      // Ignore request params/query, just use URL + method
      return this.getHashOfString(`${method} ${url.toString()}`);
    }
  }
  ```

#### Cached requests are **ONLY** requests for **GET** method

  You can customize this by overriding the `.isRequestCacheable()` method.
  If you accept other methods than `GET`, you might need to rewrite the `.getRequestKey()` method, because the base one ignores a possible request body.

  ```ts
  class MyRequestCachePlugin extends TwitterApiCachePluginCore {
    protected isRequestCacheable(args: ITwitterApiBeforeRequestConfigHookArgs) {
      const method = args.params.method.toUpperCase();
      // Accept GET and DELETE
      return method === 'GET' || method === 'DELETE';
    }
  }
  ```

#### Request key is not scoped by user/token

  You can customize this, for example, by overriding the `.getKeyPrefix()` method and using a user ID as key prefix:

  ```ts
  class UserScopedRequestCachePlugin extends TwitterApiCachePluginCore {
    constructor(protected userId: string) {
      super();
    }

    protected getKeyPrefix() {
      return this.userId;
    }
  }

  const client = new TwitterApi(user.twitterKeys, { plugins: [new UserScopedRequestCachePlugin(user.id)] });
  ```

  If you want to have unique cache per plugin instance, but your storage is shared, you can generate a unique prefix in `constructor`:

  ```ts
  import * as crypto from 'crypto';

  class UniqueRequestCachePlugin extends TwitterApiCachePluginCore {
    protected uniqueId: string;

    constructor() {
      super();
      this.uniqueId = crypto.randomBytes(16).toString('hex');
    }

    protected getKeyPrefix() {
      return this.uniqueId;
    }
  }

  const client = new TwitterApi(yourKeys, { plugins: [new UniqueRequestCachePlugin()] });
  ```

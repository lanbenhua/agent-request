/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  https://developer.mozilla.org/en-US/docs/DOM/document.cookie
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path], domain)
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/

export type Cookie = {
  name: string;
  value?: string;
  expires?: string | number | Date;
  domain?: string;
  path?: string;
  secure?: boolean;
};

export interface CookieProviderInterface {
  getItem: (name: string) => string | null;
  setItem: (cookie: Cookie) => boolean;
  removeItem: (cookie: Cookie) => boolean;
  clearItem: () => void;
  hasItem: (name: string) => boolean;
  names: () => string[];
}

export class CookieProvider {
  constructor() {
    //
  }

  public getItem(name: string): string | null {
    return (
      decodeURIComponent(
        document.cookie.replace(
          new RegExp(
            '(?:(?:^|.*;)\\s*' +
              encodeURIComponent(name).replace(/[-.+*]/g, '\\$&') +
              '\\s*\\=\\s*([^;]*).*$)|^.*$'
          ),
          '$1'
        )
      ) || null
    );
  }

  public setItem(c: Cookie): boolean {
    const { name, value, expires, domain, path, secure } = c;

    if (!name || /^(?:expires|max\-age|path|domain|secure)$/i.test(name)) {
      return false;
    }
    let sExpires = '';
    if (expires) {
      switch (expires.constructor) {
        case Number:
          sExpires =
            expires === Infinity
              ? '; expires=Fri, 31 Dec 9999 23:59:59 GMT'
              : '; max-age=' + expires;
          break;
        case String:
          sExpires = '; expires=' + expires;
          break;
        case Date:
          sExpires = '; expires=' + (expires as Date).toUTCString();
          break;
      }
    }
    document.cookie =
      encodeURIComponent(name) +
      '=' +
      encodeURIComponent(value || '') +
      sExpires +
      (domain ? '; domain=' + domain : '') +
      (path ? '; path=' + path : '') +
      (secure ? '; secure' : '');
    return true;
  }

  public removeItem(c: Cookie): boolean {
    const { name, domain, path } = c;
    if (!name || !this.hasItem(name)) {
      return false;
    }
    document.cookie =
      encodeURIComponent(name) +
      '=; expires=Thu, 01 Jan 1970 00:00:00 GMT' +
      (domain ? '; domain=' + domain : '') +
      (path ? '; path=' + path : '');
    return true;
  }

  public clearItem(): void {
    const names = this.names();
    for (const name of names) {
      this.removeItem({ name: name });
    }
  }

  public hasItem(name: string): boolean {
    return new RegExp(
      '(?:^|;\\s*)' +
        encodeURIComponent(name).replace(/[-.+*]/g, '\\$&') +
        '\\s*\\='
    ).test(document.cookie);
  }

  /* optional method: you can safely remove it! */
  names(): string[] {
    const names = document.cookie
      .replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, '')
      .split(/\s*(?:\=[^;]*)?;\s*/);
    for (let nIdx = 0; nIdx < names.length; nIdx++) {
      names[nIdx] = decodeURIComponent(names[nIdx]);
    }
    return names;
  }
}

export default new CookieProvider();

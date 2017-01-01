import * as fs from 'fs';

export class CachedStat {
  private readonly statCache = new Map<string, fs.Stats>();

  public statSync(path:string):fs.Stats|null {
    if (this.statCache.has(path)) {
      return <fs.Stats>this.statCache.get(path);
    }

    const stat = this.statSyncUncached(path);
    if (stat !== null) {
      this.statCache.set(path, stat);
    }
    return stat;
  }

  public isFile(path:string):boolean {
    const stats = this.statSync(path);
    return stats != null && stats.isFile();
  }

  private statSyncUncached(path:string):fs.Stats|null {
    try {
      return fs.statSync(path);
    } catch (e) {
      return null;
    }
  }
}

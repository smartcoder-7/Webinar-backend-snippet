import { EntityManager, getManager } from 'typeorm';
import { s3 } from '../utils/s3Promises';

export class ORMObject<T> {
  public entityManager: EntityManager | undefined;

  constructor(init?: Partial<T>) {
    if (!init) {
      return;
    }

    Object.keys(init).forEach(key => {
      // @ts-ignore
      this[key] = init[key];
    });
  }

  protected async renameDraftMedia(data: any): Promise<any> {
    for (const prop in data) {
      if (data.hasOwnProperty && data.hasOwnProperty(prop)) {
        if (prop.endsWith('MediaUrl') && data[prop] && data[prop].endsWith('-draft')) {
          const oldUrl = data[prop] as string;
          const newUrl = oldUrl.substr(0, oldUrl.length - '-draft'.length);

          const oldFilename = oldUrl.split('.com/')[1]!;
          const newFilename = newUrl.split('.com/')[1]!;

          if (await s3.fileExists(oldFilename)) {
            console.log(
              `Renaming ${prop} (${oldUrl} -> ${newUrl}) (${oldFilename} -> ${newFilename})`
            );
            await s3.renameFile(oldFilename, newFilename);
          }

          // Rename property coming in to new neame
          data[prop] = newUrl;
          continue;
        }

        if (typeof data[prop] === 'object') {
          // Recurse
          data[prop] = await this.renameDraftMedia(data[prop]);
        }
      }
    }

    return data;
  }

  // Overload this method if any items in data need to be handled specially
  public async updateWith(data: any, entityManager?: EntityManager): Promise<T> {
    const manager = entityManager ? entityManager : getManager();

    data = await this.renameDraftMedia(data);

    const id = data.id ? data.id : (this as any).id;

    await manager.update(this.constructor.name, { id }, data);
    return manager.findOneOrFail<T>(this.constructor.name, { where: { id } });
  }

  public async save(entityManager?: EntityManager): Promise<T> {
    const manager = entityManager ? entityManager : getManager();

    // Modifies this in-place
    await this.renameDraftMedia(this);

    return manager.save((this as unknown) as T);
  }

  public async delete(entityManager?: EntityManager): Promise<void> {
    const manager = entityManager ? entityManager : getManager();
    await manager.delete(this.constructor.name, { id: (this as any).id });
  }
}

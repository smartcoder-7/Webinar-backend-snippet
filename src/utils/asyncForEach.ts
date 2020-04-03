export function asyncForEach<T>(
  array: T[],
  callback: (item: T, index: number, array: T[]) => Promise<boolean>
): Array<Promise<boolean>> {
  const arr: Array<Promise<boolean>> = [];

  for (let index = 0; index < array.length; index++) {
    arr.push(callback(array[index], index, array));
  }

  return arr;
}

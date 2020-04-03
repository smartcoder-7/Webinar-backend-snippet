interface FlatVariables {
  [path: string]: string;
}

const flatVariables = (entities: object): FlatVariables => {
  const ob = entities as any;
  const toReturn: any = {};

  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) {
      continue;
    }

    if (typeof ob[i] === 'object' && ob[i] !== null) {
      const flatObject = flatVariables(ob[i]);
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) {
          continue;
        }
        toReturn[i + '.' + x.toLowerCase().replace(' ', '.')] = flatObject[x];
      }
    } else {
      toReturn[i.toLowerCase().replace(' ', '.')] = ob[i];
    }
  }
  return toReturn as FlatVariables;
};

export default flatVariables;

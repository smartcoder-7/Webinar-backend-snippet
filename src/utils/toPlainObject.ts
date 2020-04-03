const toPlainObject = (object: object): object => {
  return JSON.parse(JSON.stringify(object));
};

export default toPlainObject;

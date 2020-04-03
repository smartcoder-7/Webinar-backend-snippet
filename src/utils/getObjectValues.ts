// get object key values using array
export const getObjectValuesUsingArray = (
  obj: { [key: string]: any },
  keys: string[]
): { [key: string]: any } => {
  const response: { [key: string]: any } = {};
  keys.map(key => {
    response[key] = key in obj ? obj[key] : null;
  });
  return response;
};

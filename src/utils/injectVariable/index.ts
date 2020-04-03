import flatObject from '../flatObject';

const injectVariables = (message: string, variables: object) => {
  let updatedMessage: string = message;

  // replace variables
  Object.entries(flatObject(variables)).map(([key, value]: [string, any]) => {
    updatedMessage = updatedMessage.replace(new RegExp(`{\\s*${key}\\s*}`, 'gi'), value);
  });

  return updatedMessage;
};

export default injectVariables;

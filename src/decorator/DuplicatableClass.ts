interface DuplicatableFieldsClass {
  name: string;
  duplicatable: string[];
}

// duplicatebale fields
let duplicatable: string[] = [];

// all duplicatable classes and their fields
const duplicatableClasses: DuplicatableFieldsClass[] = [];

export function DuplicatableClass() {
  return (constructor: any) => {
    // add tp duplicatable classes
    duplicatableClasses.push({ name: constructor.name, duplicatable });

    // reset duplicatable for next class
    duplicatable = [];
  };
}

// tslint:disable-next-line: ban-types
export function DuplicatableField(): Function {
  return (_target: any, propertyName: string): void => {
    duplicatable.push(propertyName);
  };
}

// get fields that are duplicatable
export const getEntityDuplicatableFields = (entity: any): string[] => {
  const fields = duplicatableClasses.find(
    duplicatableClass => duplicatableClass.name === entity.name
  );
  return fields ? fields.duplicatable : [];
};

import { FieldTypeAll, FieldTypeCalendar, FieldTypeContentType, FieldTypeImage, FieldTypeMap, FieldTypeNumber, FieldTypeRichText, FieldTypeTags, FieldTypeText } from "@spearly/sdk-js";


const isTextType = (fieldType: FieldTypeAll): fieldType is FieldTypeText => {
    return fieldType.attributes.inputType === 'text'
}
const isNumberType = (fieldType: FieldTypeAll): fieldType is FieldTypeNumber => {
    return fieldType.attributes.inputType === 'number'
}
const isRichTextType = (fieldType: FieldTypeAll): fieldType is FieldTypeRichText => {
    return fieldType.attributes.inputType === 'rich_text'
}
const isImageType = (fieldType: FieldTypeAll): fieldType is FieldTypeImage => {
    return fieldType.attributes.inputType === 'image'
}
const isCalendarType = (fieldType: FieldTypeAll): fieldType is FieldTypeCalendar => {
    return fieldType.attributes.inputType === 'calendar'
}
const isMapType = (fieldType: FieldTypeAll): fieldType is FieldTypeMap => {
    return fieldType.attributes.inputType === 'map'
}
const isTagType = (fieldType: FieldTypeAll): fieldType is FieldTypeTags => {
    return fieldType.attributes.inputType === 'tags'
}
const isContentType = (fieldType: FieldTypeAll): fieldType is FieldTypeContentType => {
    return fieldType.attributes.inputType === 'content_type'
}

declare type ReplaceDefinition = {
    definitionString: string;
    fieldValue: string;
};

export default function getFieldsValuesDefinitions(fields: FieldTypeAll[], prefix = "", depth = 0, disableContentType = false): ReplaceDefinition[] {
    if (depth >= 3) {
      return [];
    }
    const replaceDefinitions = Array<ReplaceDefinition>();
    fields.forEach(field => {
      let key = field.attributes.identifier;
      if (isTextType(field)) {
        replaceDefinitions.push({
          definitionString: "{%= " + prefix + "_" + key + " %}",
          fieldValue: getEscapedString(field.attributes.value)
        });
      } else if (isNumberType(field)) {
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: field.attributes.value.toString()
        })
      } else if (isRichTextType(field)) {
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: getEscapedStringRichText(field.attributes.value)
        })
      } else if (isImageType(field)) {
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: getEscapedString(field.attributes.value)
        })
      }
    });

    return replaceDefinitions;
}

const getEscapedString = (str: string): string => {
    if (str) {
        return str.replace(/[\\$'"]/g, "\\$&")
        .split("\n").join("\\n")
        .split("\r").join("\\r")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
    }
    return ""
}
  
const getEscapedStringRichText = (str: string): string => {
    if (str) {
        return str.replace(/[\\$'"]/g, "\\$&")
        .split("\\\"").join("\"")
        .split("\n").join("\\n")
        .split("\r").join("\\r")
    }
    return ""
}

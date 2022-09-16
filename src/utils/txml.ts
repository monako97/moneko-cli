import xml2js from 'xml2js';
import plist from 'plist';
import jsYaml from 'js-yaml';

const parser = new xml2js.Parser({ explicitArray: false, async: true });
const builder = new xml2js.Builder({ headless: true });

export const xmlToJson = (xml: xml2js.convertableToString) => parser.parseStringPromise(xml);
export const jsonToXml = (json: Record<string, any>) => builder.buildObject(json);
export const plistToJson = (plistStr: string) => plist.parse(plistStr);
export const jsonToPlist = (json: Record<string, any>) => plist.build(json);
export const yamlToJson = (yml: string) => jsYaml.load(yml);
export const jsonToYaml = (json: Record<string, any>) => jsYaml.dump(json);

const isArray = (data) => data.constructor.name === 'Array';
const isBuffer = (data) => data.constructor.name.toLowerCase() === 'buffer';
const isObject = (data) => typeof data === 'object';
const isObjectStrict = (data) =>
  isDefined(data) && isObject(data) && !isArray(data) && !isBuffer(data);
const isString = (data) => typeof data === 'string';
const isDefined = (data) => typeof data !== 'undefined' && data !== null;
const isUndefined = (data) => typeof data === 'undefined';

/**
 * Converts data into a string
 * @param {any} data
 * @returns {string | undefined} stringified data
 */
const ensureString = (data) => {
  if (isUndefined(data)) return;

  if (!isDefined(data)) return JSON.stringify(data);
  if (isString(data)) return data.trim();
  if (['bigint', 'function'].includes(typeof data)) {
    return data.toString();
  }
  if (isBuffer(data)) {
    return data.toString('utf8');
  }
  return JSON.stringify(data);
};

const base64ToBuffer = (data) => Buffer.from(data, 'base64');
const utf8ToBase64 = (data) => Buffer.from(data, 'utf8').toString('base64');

module.exports = {
  isArray,
  isObject,
  isObjectStrict,
  isBuffer,
  isString,
  isDefined,
  isUndefined,
  ensureString,
  base64ToBuffer,
  utf8ToBase64,
};

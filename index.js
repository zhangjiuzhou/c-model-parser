/**
 * Created by jiuzhou.zhang on 17/1/29.
 *
 * api接口返回的模型不方便直接使用，我们通常会将它转换成自己想要的格式。
 * 提供模型转换和字段验证功能。注意当有字段未通过验证时，视为转换失败，抛出异常
 *
 * @module jsModel
 */

'use strict'

import * as jsType from './jsType'

const types = {
  string: jsType.types.string,
  number: jsType.types.number,
  boolean: jsType.types.boolean,
  array: jsType.types.array,
  object: jsType.types.object
}

const typesArr = [
  types.string,
  types.number,
  types.boolean,
  types.array,
  types.object
]

class ModelPropTypeDefinition {
  constructor (keypath = null) {
    this._options = {
      type: types.string,
      default: null,
      required: false,
      oneOf: null,
      filter: null,
      keypath: keypath
    }
  }

  type (type) {
    if (type !== undefined) {
      this._options['type'] = type
    }
    return this
  }

  default (defaultValue) {
    if (defaultValue !== undefined) {
      this._options['default'] = defaultValue
    }
    return this
  }

  required () {
    this._options['required'] = true
    return this
  }

  oneOf (values) {
    if (values !== undefined) {
      this._options['oneOf'] = values
    }
    return this
  }

  filter (filter) {
    if (filter !== undefined) {
      this._options['filter'] = filter
    }
    return this
  }
}

function define (keypath = null) {
  return new ModelPropTypeDefinition(keypath)
}

class Model {
  _values = {}

  defineProperty (name, getter) {
    Object.defineProperty(this, name, {
        enumerable: true,
        get: () => {
        if (this._values[name] === undefined) {
      const value = getter()
      getter = undefined
      this._values[name] = value !== undefined ? value : null
    }
    return this._values[name]
  },
    set: newValue => {
      newValue = newValue !== undefined ? newValue : null
      this._values[name] = newValue
    }
  })
  }

  dump () {
    const object = {}
    for (const prop in this) {
      if (prop === '_values') {
        continue
      }

      const value = this[prop]
      if (value && value.dump) {
        object[prop] = value.dump()
      } else if (jsType.isArray(value)) {
        object[prop] = value.map(val => val && val.dump ? val.dump() : val)
      } else {
        object[prop] = value
      }
    }

    return object
  }
}

class ModelMaker {
  constructor (model, definitions) {
    this._model = model
    this._definitions = definitions
  }

  getModel () {
    const model = new Model()

    for (const name in this._definitions) {
      let typeObject = this._definitions[name]
      let definition
      if (jsType.isString(typeObject)) {
        definition = define(typeObject)._options
      } else {
        definition = typeObject._options
      }

      if (__DEV__) {
        this._validateDefinition(name, definition)
      }

      let value = null
      if (definition.keypath) {
        value = this._getRawValue(definition)
        this._validateRawValue(name, value, definition)
      }

      const getter = this._getPropertyGetter(value, definition).bind(model)
      model.defineProperty(name, getter)
    }

    return model
  }

  _validateDefinition (name, options) {
    let {
      keypath,
      type,
      oneOf,
      default: defaultValue,
      filter
    } = options

    if (keypath === null) {
      if (!(defaultValue || filter)) {
        this._optionError(name, 'default', 'magic property must have an unempty default value or filter')
      }
    } else {
      if (!jsType.isNonemptyString(keypath)) {
        this._optionError(name, 'keypath', 'must be an nonempty string')
      }

      if (!jsType.isOneOf(type, typesArr)) {
        this._optionError(name, 'type', `must be one of (${typesArr.join(',')})`)
      }

      if (oneOf) {
        if (!jsType.isArray(oneOf)) {
          this._optionError(name, 'oneOf', 'must be an array')
        }

        for (let value of oneOf) {
          if (!jsType.isTypeOf(value, type)) {
            this._optionError(name, 'oneOf', `all items must be type of '${type}'`)
          }
        }
      }
    }

    if (filter) {
      if (type === types.array || type === types.object) {
        if (!jsType.isFunction(filter) && !jsType.isObject(filter)) {
          this._optionError(name, 'filter', 'must be a function or an object')
        }
      } else {
        if (!jsType.isFunction(filter)) {
          this._optionError(name, 'filter', 'must be a function')
        }
      }
    }
  }

  _optionError (name, optionName, message) {
    throw new Error(`Prop '${name}' has a error with option '${optionName}': ${message}.`)
  }

  _getRawValue (definition) {
    let paths = definition.keypath.split('.')
    let value = this._model
    for (let key of paths) {
      if (jsType.isObject(value)) {
        value = value[key]
      } else {
        break
      }
    }
    value = value !== undefined ? value : null
    return value
  }

  _validateRawValue (name, rawValue, definition) {
    if (definition.required && rawValue === null) {
      throw new Error(`Prop '${name}' is required.`)
    }

    if (rawValue !== null && !jsType.isTypeOf(rawValue, definition.type)) {
      throw new Error(`Prop '${name}' must be type of '${definition.type}'.`)
    }

    if (rawValue !== null && definition.oneOf) {
      if (!jsType.isOneOf(rawValue, definition.oneOf)) {
        throw new Error(`Prop '${name}' must one of (${definition.oneOf.join(',')}).`)
      }
    }
  }

  _getPropertyGetter (rawValue, definition) {
    let { filter, default: defaultValue } = definition

    return function () {
      if (filter && (jsType.isObject(filter) || jsType.isArray(filter))) {
        filter = convertFilter(filter)
      }

      let value = filter ? filter(rawValue, this) : rawValue
      if (value === null && defaultValue !== null) {
        value = defaultValue
      }

      return value
    }
  }
}

function convertFilter (props) {
  return (value) => {
    if (jsType.isObject(value)) {
      return convert(value, props)
    } else if (jsType.isArray(value)) {
      return convertArray(value, props)
    }

    throw new Error('Value must be a object or an array.')
  }
}

function convert (object, definitions) {
  const adapter = new ModelMaker(object, definitions)
  return adapter.getModel()
}

function convertArray (objects, definitions) {
  if (!jsType.isArray(objects)) {
    return []
  }

  let list = []
  for (let object of objects) {
    const model = convert(object, definitions)
    if (model) {
      list.push(model)
    }
  }
  return list
}

export default {
  types,
  define,
  convert,
  convertArray
}

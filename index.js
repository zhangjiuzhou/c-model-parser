/**
 * Created by jiuzhou.zhang on 17/1/29.
 *
 * api接口返回的模型不方便直接使用，我们通常会将它转换成自己想要的格式。
 * 提供模型转换和字段验证功能。注意当有字段未通过验证时，视为转换失败，抛出异常
 *
 * @module jsModel
 */

'use strict'

import * as jstype from './jsType'

const types = {
  string: jstype.types.string,
  number: jstype.types.number,
  boolean: jstype.types.boolean,
  array: jstype.types.array,
  object: jstype.types.object
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
      optional: false,
      default: undefined,
      oneOf: undefined,
      filter: undefined,
      keypath: keypath
    }
  }

  type (type) {
    if (type !== undefined) {
      this._options['type'] = type
    }
    return this
  }

  optional () {
    this._options['optional'] = true
    return this
  }

  default (defaultValue) {
    if (defaultValue !== undefined) {
      this._options['default'] = defaultValue
    }
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

  constructor () {
    Object.defineProperty(this, '_values', {
      enumerable: false
    })
  }

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
      if (jstype.isString(typeObject)) {
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

    return Object.keys(model).reduce((result, key) => {
      if (key.indexOf('_') !== 0) {
        result[key] = model[key]
      }
      return result
    }, {})
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
      if (!(defaultValue !== undefined || filter)) {
        this._optionError(name, 'default', 'magic property must have an unempty default value or filter')
      }
    } else {
      if (defaultValue !== undefined && !jstype.isTypeOf(defaultValue, type)) {
        this._optionError(name, 'default', `must be type of '${type}'`)
      }

      if (!jstype.isNonemptyString(keypath)) {
        this._optionError(name, 'keypath', 'must be an nonempty string')
      }

      if (!jstype.isOneOf(type, typesArr)) {
        this._optionError(name, 'type', `must be one of (${typesArr.join(',')})`)
      }

      if (oneOf) {
        if (!jstype.isArray(oneOf)) {
          this._optionError(name, 'oneOf', 'must be an array')
        }

        for (let value of oneOf) {
          if (!jstype.isTypeOf(value, type)) {
            this._optionError(name, 'oneOf', `all items must be type of '${type}'`)
          }
        }
      }
    }

    if (filter) {
      if (type === types.array || type === types.object) {
        if (!jstype.isFunction(filter) && !jstype.isObject(filter)) {
          this._optionError(name, 'filter', 'must be a function or an object')
        }
      } else {
        if (!jstype.isFunction(filter)) {
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
      if (jstype.isObject(value)) {
        value = value[key]
      } else {
        value = undefined
        break
      }
    }
    value = value !== undefined ? value : null
    if (value === null) {
      if (definition.default) {
        value = definition.default
      } else if (!definition.optional) {
        switch (definition.type) {
          case types.string: value = ''
            break
          case types.number: value = 0
            break
          case types.boolean: value = false
            break
          case types.array: value = []
            break
          case types.object: value = {}
            break
        }
      }
    }

    return value
  }

  _validateRawValue (name, rawValue, definition) {
    if (rawValue !== null && !jstype.isTypeOf(rawValue, definition.type)) {
      throw new Error(`Prop '${name}' must be type of '${definition.type}'.`)
    }

    if (rawValue !== null && definition.oneOf) {
      if (!jstype.isOneOf(rawValue, definition.oneOf)) {
        throw new Error(`Prop '${name}' must one of (${definition.oneOf.join(',')}).`)
      }
    }
  }

  _getPropertyGetter (rawValue, definition) {
    let { filter } = definition

    return function () {
      if (filter && (jstype.isObject(filter) || jstype.isArray(filter))) {
        filter = convertFilter(filter)
      }

      return filter ? filter(rawValue, this) : rawValue
    }
  }
}

function convertFilter (props) {
  return (value) => {
    if (jstype.isObject(value)) {
      return convert(value, props)
    } else if (jstype.isArray(value)) {
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
  if (!jstype.isArray(objects)) {
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

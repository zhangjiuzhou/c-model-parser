/**
 * Created by jiuzhou.zhang on 2018/1/26.
 */

'use strict'

import * as jsmodel from '../src/index'
import * as jstype from 'c-jstype'

test('shorthand', () => {
  const model = {
    foo: 'bar'
  }
  expect(jsmodel.model(model, {
    foo: 'foo'
  }).foo === 'bar').toBe(true)
})

test('default type', () => {
  const model = {
    foo: 'bar'
  }
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
  }).foo === 'bar').toBe(true)
})

test('nested value', () => {
  const model = {
    foo: {
      foo: {
        foo: 'bar'
      }
    }
  }
  expect(jsmodel.model(model, {
    foo: 'foo.foo.foo'
  }).foo === 'bar').toBe(true)
})

test('type string', () => {
  const model = {
    foo: 'bar'
  }
  expect(jstype.isString(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.string)
  }).foo)).toBe(true)
})

test('type number', () => {
  const model = {
    foo: 1
  }
  expect(jstype.isNumber(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.number)
  }).foo)).toBe(true)
})

test('type boolean', () => {
  const model = {
    foo: true
  }
  expect(jstype.isBool(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.boolean)
  }).foo)).toBe(true)
})

test('type array', () => {
  const model = {
    foo: ['bar']
  }
  expect(jstype.isArray(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.array)
  }).foo)).toBe(true)
})

test('type object', () => {
  const model = {
    foo: {
      foo: 'bar'
    }
  }
  expect(jstype.isObject(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.object)
  }).foo)).toBe(true)
})

test('type enum', () => {
  const model = {
    foo: 'bar'
  }
  expect(jstype.isOneOf(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.string)
      .oneOf(['bar'])
  }).foo, ['bar'])).toBe(true)
})

test('lack of string', () => {
  const model = {}
  expect(jsmodel.model(model, {
    foo: 'foo'
  }).foo === '').toBe(true)
})

test('lack of number', () => {
  const model = {}
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.number)
  }).foo === 0).toBe(true)
})

test('lack of boolean', () => {
  const model = {}
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.boolean)
  }).foo === false).toBe(true)
})

test('lack of array', () => {
  const model = {}
  const value = jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.array)  })
    .foo
  expect(jstype.isArray(value) && value.length === 0).toBe(true)
})

test('lack of object', () => {
  const model = {}
  const value = jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.object)  })
    .foo
  expect(jstype.isObject(value) && Object.keys(value).length === 0).toBe(true)
})

test('lack of enum value', () => {
  const model = {}
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.string)
      .oneOf(['a', 'b'])
  }).foo === 'a').toBe(true)
})

test('is not a string', () => {
  const model = {
    foo: 0
  }
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.string)
  }).foo === '').toBe(true)
})

test('is not a number', () => {
  const model = {
    foo: 'bar'
  }
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.number)
  }).foo === 0).toBe(true)
})

test('is not a boolean', () => {
  const model = {
    foo: 'bar'
  }
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.boolean)
  }).foo === false).toBe(true)
})

test('is not an array', () => {
  const model = {
    foo: 'bar'
  }
  const value = jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.array)  })
    .foo
  expect(jstype.isArray(value) && value.length === 0).toBe(true)
})

test('is not a object', () => {
  const model = {
    foo: 'bar'
  }
  const value = jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.object)  })
    .foo
  expect(jstype.isObject(value) && Object.keys(value).length === 0).toBe(true)
})

test('is not a enum value', () => {
  const model = {
    foo: 'bar'
  }
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.string)
      .oneOf(['a', 'b'])
  }).foo === 'a').toBe(true)
})

test('optional', () => {
  const model = {}
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .optional()
  }).foo === null).toBe(true)
})

test('default value', () => {
  const model = {}
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .defaultValue('bar')
  }).foo === 'bar').toBe(true)
})

test('filter', () => {
  const model = {
    foo: 1
  }
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.number)
      .filter(v => `${v * 1000}`)
  }).foo === '1000').toBe(true)
})

test('filter with other values', () => {
  const model = {
    foo: 1,
    bar: 2,
    baz: 3
  }
  expect(jsmodel.model(model, {
    foo: jsmodel.propType('foo')
      .type(jsmodel.number)
      .filter((v, {bar, baz}) => `${v}${bar}${baz}`),
    bar: jsmodel.propType('bar')
      .type(jsmodel.number),
    baz: jsmodel.propType('baz')
      .type(jsmodel.number)
  }).foo === '123').toBe(true)
})

test('magic value', () => {
  const model = {}
  expect(jsmodel.model(model, {
    foo: jsmodel.propType()
      .filter(() => `bar`)
  }).foo === 'bar').toBe(true)
})

test('magic value with other values', () => {
  const model = {
    bar: 2,
    baz: 3
  }
  expect(jsmodel.model(model, {
    foo: jsmodel.propType()
      .filter(({bar, baz}) => `1${bar}${baz}`),
    bar: jsmodel.propType('bar')
      .type(jsmodel.number),
    baz: jsmodel.propType('baz')
      .type(jsmodel.number)
  }).foo === '123').toBe(true)
})

test('model array', () => {
  const models = [{
    foo: 'bar'
  }]
  const results = jsmodel.modelArray(models, {
    foo: 'foo'
  })
  expect(results[0].foo === 'bar').toBe(true)
})

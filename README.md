# c-model-parser
定义和解析model。

# 特性
* 读取keypath
* 类型检查
* 容错
* 默认值
* 可选值
* 过滤

# Example
```javascript
import * as modelParser from 'c-model-parser'

const json = {
  a: 'a',
  b: 10,
  c: {
    d: 20
  }
}

const propTypes = {
  a: 'a',
  b: modelParser.propType('b')
    .type(modelParser.number),
  d: modelParser.propType('c.d')
    .type(modelParser.number)
    .filter(v => `${v}`),
  e: modelParser.propType()
    .filter(({a, b}) => `${a}${b}`)
}

console.log(modelParser.model(json, propTypes))

/*
{
  a: 'a',
  b: 10,
  d: '20',
  e: 'a10'
}
*/
```

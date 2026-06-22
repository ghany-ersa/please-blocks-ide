// Factory helpers untuk fungsi codegen() di block definitions

import { resolveValue, resolveString } from './helpers.js'

/**
 * Codegen untuk pola: await please.METHOD(label, selector[, ...optionals])
 * optionals: array nama field yang ditambahkan jika ada nilainya
 */
export function codegenLabelSelector(method, ...optionalFields) {
  return (inputs) => {
    const args = [resolveString(inputs.label), resolveString(inputs.selector)]
    for (const f of optionalFields) {
      if (inputs[f] !== undefined && inputs[f] !== null && inputs[f] !== '') args.push(inputs[f])
    }
    return `await please.${method}(${args.join(', ')})`
  }
}

/**
 * Codegen untuk pola: await please.METHOD(label, selector, value[, ...optionals])
 */
export function codegenLabelSelectorValue(method, valueField = 'value', ...optionalFields) {
  return (inputs) => {
    const args = [resolveString(inputs.label), resolveString(inputs.selector), resolveValue(inputs[valueField])]
    for (const f of optionalFields) {
      if (inputs[f] !== undefined && inputs[f] !== null && inputs[f] !== '') args.push(inputs[f])
    }
    return `await please.${method}(${args.join(', ')})`
  }
}

/**
 * Codegen untuk pola: const VARNAME = await please.METHOD(label, selector)
 */
export function codegenGetVar(method) {
  return (inputs) => {
    const varName = inputs.varName || 'result'
    return `const ${varName} = await please.${method}(${resolveString(inputs.label)}, ${resolveString(inputs.selector)})`
  }
}

/**
 * Codegen untuk pola: await please.METHOD(actual, expected[, message])
 * actual diambil dari varref ({ varName }) atau nilai langsung.
 */
export function codegenAssert(method) {
  return (inputs) => {
    const actual   = inputs.actual?.varName ?? inputs.actual ?? 'actual'
    const expected = resolveValue(inputs.expected)
    const args     = [actual, expected]
    if (inputs.message) args.push(resolveString(inputs.message))
    return `await please.${method}(${args.join(', ')})`
  }
}
